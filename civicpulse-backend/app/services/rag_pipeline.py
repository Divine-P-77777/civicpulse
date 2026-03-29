import os
import json
import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from app.config import bedrock_client
from app.services.embedding_service import generate_embedding
from app.services.vector_service import vector_service
from app.services.dynamodb_service import store_analysis_result
from app.services.profile_service import get_user_profile
from app.services.rerank_service import rerank_service
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# How many recent messages to keep verbatim (the rest get truncated)
RECENT_MESSAGES_LIMIT = 8
# Max messages before we start trimming older ones
TRIM_THRESHOLD = 12

# Thread pool for parallel I/O (embedding + vector search)
_executor = ThreadPoolExecutor(max_workers=2)

import threading
import time

# Semaphore: limit concurrent Bedrock LLM calls to prevent throttling (per-process)
_bedrock_semaphore = threading.BoundedSemaphore(3)

# Mode-specific config
MODE_CONFIG = {
    "live": {"top_k": 3, "chunk_chars": 500, "max_tokens": 512},
    "chat": {"top_k": 5, "chunk_chars": 1000, "max_tokens": 1024},
    "draft": {"top_k": 8, "chunk_chars": 2000, "max_tokens": 2048},
}

# Default model — Claude 3 Haiku via AWS Bedrock
DEFAULT_MODEL = "anthropic.claude-3-haiku-20240307-v1:0"



class RagPipeline:
    def __init__(self):
        self.model = os.getenv("RAG_MODEL", DEFAULT_MODEL)
        logger.info(f"RAG Pipeline initialized with model: {self.model}")

        prompt_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "system_prompt.txt")
        with open(prompt_path, "r", encoding="utf-8") as f:
            self.prompt_template = f.read()

        live_prompt_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "live_prompt.txt")
        try:
            with open(live_prompt_path, "r", encoding="utf-8") as f:
                self.live_prompt_template = f.read()
        except FileNotFoundError:
            self.live_prompt_template = self.prompt_template

        draft_phase_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "draft_phase.txt")
        try:
            with open(draft_phase_path, "r", encoding="utf-8") as f:
                self.draft_phase_template = f.read()
        except FileNotFoundError:
            self.draft_phase_template = self.live_prompt_template  # Fallback gracefully

        draft_prompt_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "draft_file.txt")
        try:
            with open(draft_prompt_path, "r", encoding="utf-8") as f:
                self.draft_prompt_template = f.read()
        except FileNotFoundError:
            self.draft_prompt_template = self.prompt_template

    @staticmethod
    def detect_draft_intent(query: str, chat_history: list = None) -> bool:
        """
        Lightweight pre-LLM classifier: returns True if the user is explicitly
        requesting to CREATE a legal document. Does NOT fire on general discussion.
        """
        q = query.lower().strip()

        # ── Hard signals: explicit drafting verbs/nouns ──
        DRAFT_KEYWORDS_EN = [
            "draft", "write", "prepare", "create", "make", "generate", "compose",
            "file", "send", "write up", "draw up",
            "legal notice", "complaint", "rti", "affidavit", "appeal letter",
            "notice", "petition",
        ]
        DRAFT_CONTEXT_EN = [
            "i want to", "i need to", "can you", "please", "help me",
            "how do i", "we need",
        ]
        DRAFT_KEYWORDS_HI = [
            "draft", "drafting",
            "लिखना", "लिखें", "लिखो", "बनाना", "बनाएं", "बनाओ",
            "तैयार", "बनाना है", "चाहिए", "नोटिस", "शिकायत",
            "आरटीआई", "आवेदन", "याचिका", "अपील",
        ]

        # Check for explicit drafting keywords in current query
        if any(kw in q for kw in DRAFT_KEYWORDS_EN):
            return True
        if any(kw in q for kw in DRAFT_KEYWORDS_HI):
            return True

        # Check if query has a context word + any document type word
        has_context = any(ctx in q for ctx in DRAFT_CONTEXT_EN)
        has_doc_type = any(dt in q for dt in ["notice", "complaint", "rti", "affidavit", "petition", "appeal"])
        if has_context and has_doc_type:
            return True

        # ── Check if we are already in a drafting conversation ──
        # If the last assistant turn asked for a required detail, we are in phase 2
        if chat_history:
            for msg in reversed(chat_history[-6:]):
                if msg.get("role") == "assistant":
                    content = msg.get("content", "").lower()
                    # The assistant was collecting drafting details
                    if any(kw in content for kw in [
                        "document type", "full name", "city", "jurisdiction",
                        "date of incident", "grievance", "parties",
                        "किस का नाम", "शहर", "तारीख", "किस अधिकारी", "मैंने",
                        "<draft_ready",
                    ]):
                        return True
                    break  # Only check most recent assistant message

        return False

    # ─── Conversation Context (no LLM call, pure truncation) ──────────
    @staticmethod
    def _build_conversation_context(chat_history: list) -> str:
        """
        Builds conversation context using smart truncation — no LLM call.

        Strategy:
        - Short history (≤10 msgs): include all messages verbatim (truncated per msg)
        - Long history (>10 msgs): keep last 6 verbatim, compress older to key points
        - IMPORTANT: Never truncate messages containing <DRAFT_READY> tags to preserve context
        """
        if not chat_history:
            return ""

        if len(chat_history) <= TRIM_THRESHOLD:
            lines = []
            for msg in chat_history:
                role = "User" if msg.get("role") == "user" else "Assistant"
                content = msg.get("content", "")
                # Don't truncate messages with DRAFT_READY tags - they contain critical context
                if "<DRAFT_READY" in content:
                    lines.append(f"{role}: {content}")
                else:
                    lines.append(f"{role}: {content[:500]}")
            return "\n".join(lines)

        # Long conversation — just keep the last few + a brief summary of older user messages
        older = chat_history[:-RECENT_MESSAGES_LIMIT]
        recent = chat_history[-RECENT_MESSAGES_LIMIT:]

        # Extract just user queries from older messages (no LLM call!)
        older_summary = "\n".join([
            f"- {m.get('content', '')[:250]}"
            for m in older if m.get("role") == "user"
        ][-7:])  # Keep at most 7 older user queries

        recent_text = "\n".join([
            f"{'User' if m.get('role') == 'user' else 'Assistant'}: {m.get('content', '') if '<DRAFT_READY' in m.get('content', '') else m.get('content', '')[:400]}"
            for m in recent
        ])

        return f"[Earlier topics discussed]\n{older_summary}\n\n[Recent messages]\n{recent_text}"

    # ─── Direct Context Builder (replaces summarize_service) ──────────
    @staticmethod
    def _build_context_text(context_chunks: list, max_chars: int) -> str:
        """
        Concatenates raw RAG chunks directly — no LLM summarization needed.
        The main LLM is smart enough to extract relevant info from raw context.
        """
        if not context_chunks:
            return "No relevant legal documents found in database."

        parts = []
        total_chars = 0
        for i, chunk in enumerate(context_chunks, 1):
            text = chunk.get("text", "")[:max_chars]
            source = chunk.get("source", chunk.get("url", "unknown"))
            if total_chars + len(text) > max_chars * 5:  # Hard cap total context
                break
            parts.append(f"[Source {i}: {source}]\n{text}")
            total_chars += len(text)

        return "\n\n".join(parts)

    # ─── Main Pipeline ────────────────────────────────────────────────
    def analyze_document(
        self,
        query: str,
        user_id: str = None,
        session_id: str = None,
        chat_history: list = None,
        language: str = "en",
        stream: bool = False,
        mode: str = "chat",
        use_profile: bool = True,
        metadata_filters: dict = None
    ):
        """
        Optimized RAG pipeline:
        1. Build conversation context (pure string ops, no LLM)
        2. Embed query + vector search (parallelized)
        3. Direct chunk concatenation (no summarize LLM call)
        4. LLM generation with mode-aware max_tokens
        """
        config = MODE_CONFIG.get(mode, MODE_CONFIG["chat"])

        # ── Step 0: Junk Query Check (for Live Mode) ────────────────
        if mode == "live":
            q_lower = query.lower().strip()
            # Heuristic for background noise interpreted as speech
            is_junk = (
                len(q_lower) < 3 or 
                q_lower in ["toh toh", "to to", "um", "hmm", "ah", "oh"] or
                all(c in " .,!?" for c in q_lower)
            )
            if is_junk:
                logger.info(f"Session {session_id}: Junk query detected ('{query}'), bypassing LLM.")
                # We return a sync generator for streaming compatibility
                # (must match _stream_response which is also a sync generator)
                def _silent_gen():
                    yield "I'm listening. Please proceed." if language == "en" else "मैं सुन रही हूँ। कृपया आगे बढ़िए।"
                return _silent_gen() if stream else ("I'm listening. Please proceed." if language == "en" else "मैं सुन रही हूँ। कृपया आगे बढ़िए।")

        # ── Step 1 & 2: Run in parallel ──────────────────────────
        # Conversation context (pure CPU — fast)
        conversation_context = self._build_conversation_context(chat_history or [])

        # ── Auto-detect Metadata Filters ──
        if metadata_filters is None:
            metadata_filters = {}
        
        # 1. From user profile
        if user_id:
            profile = get_user_profile(user_id)
            if profile and "metadata" in profile:
                profile_meta = profile["metadata"]
                if "region" in profile_meta and "region" not in metadata_filters:
                    metadata_filters["region"] = profile_meta["region"]
                if "type" in profile_meta and "type" not in metadata_filters:
                    metadata_filters["type"] = profile_meta["type"]

        # 2. From query (Heuristic)
        q_norm = query.lower()
        if "assam" in q_norm: metadata_filters["region"] = "Assam"
        if "law" in q_norm: metadata_filters["type"] = "law"
        if "constitution" in q_norm: metadata_filters["type"] = "constitution"

        # Embedding + Vector search (I/O bound — benefits from threading)
        query_embedding = generate_embedding(query)
        
        # INCREASE top_k for initial search to give reranker more to work with
        # fetching 3x more than needed is a good heuristic
        initial_k = config["top_k"] * 3 if rerank_service.co_client else config["top_k"]
        
        context_chunks = vector_service.similarity_search(
            query_embedding, k=initial_k, user_id=user_id, filters=metadata_filters
        )

        # ── Step 2.5: Reranking (Conditional & Fail-safe) ──
        if rerank_service.co_client and len(context_chunks) > 1:
            context_chunks = rerank_service.rerank_chunks(query, context_chunks, config["top_k"])
        else:
            context_chunks = context_chunks[:config["top_k"]]

        # ── Step 3: Direct context (replaces summarize_service — saves 3-8s) ──
        context_text = self._build_context_text(context_chunks, config["chunk_chars"])

        # ── Step 4: Prompt construction ──────────────────────────
        if mode == "live":
            # Use drafting prompt only when user explicitly asked to create a document
            is_drafting = self.detect_draft_intent(query, chat_history)
            if is_drafting:
                logger.info(f"Session {session_id}: Draft intent detected — switching to draft_phase prompt.")
                template = self.draft_phase_template
            else:
                template = self.live_prompt_template
        elif mode == "draft":
            template = self.draft_prompt_template
        else:
            template = self.prompt_template
        profile_context = ""
        if mode == "draft" and user_id and use_profile:
            profile = get_user_profile(user_id)
            if profile:
                profile_context = f"\n\n### USER PERSONAL DETAILS (For automated field filling):\
\n- Name: {profile.get('full_name', '[YOUR NAME]')}\
\n- Address: {profile.get('address', '[YOUR ADDRESS]')}\
\n- Contact: {profile.get('contact_number', '[YOUR CONTACT]')}\
\n- Email: {profile.get('email', '[YOUR EMAIL]')}"

        system_prompt = template.format(
            context=context_text,
            query=query,
            chat_history=conversation_context,
            profile_context=profile_context
        )

        # Add language instruction to system prompt dynamically based on user selection
        if language == "hi":
            lang_name = "Hindi"
            system_prompt += f"\n\nIMPORTANT: The user has explicitly selected {lang_name}. You MUST respond entirely in {lang_name}. Use {lang_name} script. Keep legal terms in English where necessary for accuracy, but explain everything in {lang_name}. Do NOT respond in English or any other language."
            if mode == "live":
                system_prompt += f"\nCRITICAL LIVE AUDIO RULE: The user is listening to this text via Text-to-Speech in {lang_name}. It is strictly forbidden to use English scripts or pronunciation markings. You must write natural spoken {lang_name} sentences."
        else:
            system_prompt += f"\n\nIMPORTANT: The user has explicitly selected English. You MUST respond entirely in English. Do NOT use Hindi, Hinglish, or any other language."
            if mode == "live":
                system_prompt += f"\nCRITICAL LIVE AUDIO RULE: This is an English-exclusive audio session. It is strictly forbidden to use any Hindi, Hinglish, or vernacular words. If the user accidentally spoke Hindi words, translate your response entirely to English."

        # Bedrock Converse API uses separate system and messages params
        
        # Inject turn-level language override to break "language inertia" from chat history
        if language == "hi":
            formatted_query = f"[CRITICAL OVERRIDE: You MUST respond to this query ENTIRELY in Hindi script and language. Ignore the language of previous messages if they were in English. Do not use any language other than Hindi.]\n\nUser Query: {query}"
        else:
            formatted_query = f"[CRITICAL OVERRIDE: You MUST respond to this query ENTIRELY in English. Ignore the language of previous messages if they were in Hindi. Do not use any language other than English.]\n\nUser Query: {query}"
            
        messages = [{"role": "user", "content": [{"type": "text", "text": formatted_query}]}]

        # ── Step 5: LLM call with mode-aware limits ──────────────
        if stream:
            return self._stream_response(system_prompt, messages, query, user_id, session_id, config["max_tokens"])
        else:
            return self._execute_response(system_prompt, messages, query, user_id, session_id, config["max_tokens"])

    def get_simple_completion(self, prompt: str, max_tokens: int = 64) -> str:
        """Lightweight completion for simple tasks like title generation."""
        try:
            body = json.dumps({
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": max_tokens,
                "temperature": 0.5,
                "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}]
            })
            response = bedrock_client.invoke_model(modelId=self.model, body=body)
            result = json.loads(response['body'].read())
            return result["content"][0]["text"].strip()
        except Exception as e:
            logger.error(f"Simple completion failed: {e}")
            return ""

    def detect_language(self, text: str) -> str:
        """
        Production-level fast language context detection.
        Prevents switching on single words, prioritizes phrase context.
        """
        if not text or len(text.strip()) < 2:
            return "en"

        text_lower = text.lower()
        
        # 0. Meta-Command Override: If user explicitly requests a language, honor it regardless of the script used
        if "english" in text_lower or "angrezi" in text_lower or "इंग्लिश" in text_lower or "अंग्रेज़ी" in text_lower:
            return "en"
        elif "hindi" in text_lower or "हिंदी" in text_lower or "हिन्दी" in text_lower:
            return "hi"

        # 1. Very Fast Heuristic: Devanagari Script Check
        devanagari_count = len([c for c in text if '\u0900' <= c <= '\u097F'])
        if devanagari_count > len(text) * 0.1:
            return "hi"
            
        # 2. Fast Heuristic: Hinglish Keyword Density
        hinglish_words = {"aur", "kya", "hai", "nahi", "kaise", "karte", "hua", "mera", "mujhe", "karna", "iska", "matlab", "batao", "samjhao", "ka", "ki", "ke", "liye", "bhi", "mein", "pe", "par", "hona", "chahiye"}
        words = "".join([c for c in text.lower() if c.isalnum() or c.isspace()]).split()
        hinglish_match = sum(1 for w in words if w in hinglish_words)
        
        # If strong Hinglish presence
        if hinglish_match >= 2 or (len(words) <= 4 and hinglish_match >= 1):
            return "hi"
            
        # If very long sentence with no Hinglish keywords, assume English to save LLM call
        if len(words) > 8 and hinglish_match == 0:
            return "en"

        # 3. AI Fallback (for complex Romanized Hindi or ambiguous context)
        prompt = f"""
        Analyze the language context of this spoken phrase.
        Phrase: "{text}"
        
        Is this phrase predominantly Hindi (including Hinglish/Roman script) or English?
        Remember: A single English word in a Hindi sentence means it's Hindi. A single Hindi word in an English sentence means it's English.
        Reply with strictly 'hi' for Hindi/Hinglish, or 'en' for English. Do not write anything else.
        """
        try:
            res = self.get_simple_completion(prompt, max_tokens=10).strip().lower()
            if "hi" in res:
                return "hi"
            return "en"
        except Exception as e:
            logger.error(f"Language detection fallback error: {e}")
            return "en"

    def _execute_response(self, system_prompt: str, messages: list, query: str, user_id=None, session_id=None, max_tokens=1024):
        """Non-streaming response via Bedrock invoke_model API with local retry/throttling logic."""
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "temperature": 0.7,
            "system": system_prompt,
            "messages": messages
        })
        
        for attempt in range(5):  # 5 local retry attempts
            try:
                with _bedrock_semaphore:
                    response = bedrock_client.invoke_model(modelId=self.model, body=body)
                    result = json.loads(response['body'].read())
                    result_text = result["content"][0]["text"]
                    
                    store_analysis_result(query, result_text, user_id, session_id)
                    return result_text
            except Exception as e:
                err_msg = str(e)
                if "ThrottlingException" in err_msg or "Too many requests" in err_msg:
                    if attempt == 4: raise
                    wait_time = (2 ** attempt) + 0.5
                    logger.warning(f"Bedrock Throttled (Attempt {attempt+1}), retrying in {wait_time:.1f}s...")
                    time.sleep(wait_time)
                else:
                    logger.error(f"Bedrock invocation failed: {e}")
                    raise
        return "I'm sorry, I'm currently overwhelmed with requests. Please try again in a moment."

    def _stream_response(self, system_prompt: str, messages: list, query: str, user_id=None, session_id=None, max_tokens=1024):
        """Streaming generator via Bedrock invoke_model_with_response_stream API with throttling protection."""
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "temperature": 0.7,
            "system": system_prompt,
            "messages": messages
        })
        
        response = None
        for attempt in range(5):
            try:
                with _bedrock_semaphore:
                    response = bedrock_client.invoke_model_with_response_stream(modelId=self.model, body=body)
                    break # Success, start streaming
            except Exception as e:
                err_msg = str(e)
                if "ThrottlingException" in err_msg or "Too many requests" in err_msg:
                    if attempt == 4: raise
                    wait_time = (2 ** attempt) + 0.5
                    logger.warning(f"Bedrock Stream Throttled (Attempt {attempt+1}), retrying in {wait_time:.1f}s...")
                    time.sleep(wait_time)
                else:
                    raise

        collected_chunks = []
        for event in response["body"]:
            try:
                # The event contains a 'chunk' with bytes that represent JSON
                chunk_str = event.get('chunk', {}).get('bytes', b'').decode('utf-8')
                if not chunk_str:
                    continue
                    
                chunk_data = json.loads(chunk_str)
                if chunk_data.get("type") == "content_block_delta":
                    text = chunk_data.get("delta", {}).get("text", "")
                    if text:
                        collected_chunks.append(text)
                        yield text
            except Exception as e:
                logger.error(f"Error parsing bedrock stream chunk: {e}")
                continue

        # Store full result after stream completes
        full_text = "".join(collected_chunks)
        store_analysis_result(query, full_text, user_id, session_id)


# Singleton instance
rag_pipeline = RagPipeline()
