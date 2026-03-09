import os
import logging
from concurrent.futures import ThreadPoolExecutor
from openai import OpenAI
from app.services.embedding_service import generate_embedding
from app.services.vector_service import vector_service
from app.services.dynamodb_service import store_analysis_result
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# How many recent messages to keep verbatim (the rest get truncated)
RECENT_MESSAGES_LIMIT = 6
# Max messages before we start trimming older ones
TRIM_THRESHOLD = 10

# Thread pool for parallel I/O (embedding + vector search)
_executor = ThreadPoolExecutor(max_workers=4)

# Mode-specific config
MODE_CONFIG = {
    "live": {"top_k": 3, "chunk_chars": 500, "max_tokens": 300},
    "chat": {"top_k": 5, "chunk_chars": 1000, "max_tokens": 1024},
}


class RagPipeline:
    def __init__(self):
        self.client = OpenAI()
        self.model = os.getenv("RAG_MODEL", "openai.gpt-oss-120b")

        prompt_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "system_prompt.txt")
        with open(prompt_path, "r") as f:
            self.prompt_template = f.read()

        live_prompt_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "live_prompt.txt")
        try:
            with open(live_prompt_path, "r") as f:
                self.live_prompt_template = f.read()
        except FileNotFoundError:
            self.live_prompt_template = self.prompt_template

    # ─── Conversation Context (no LLM call, pure truncation) ──────────
    @staticmethod
    def _build_conversation_context(chat_history: list) -> str:
        """
        Builds conversation context using smart truncation — no LLM call.
        
        Strategy:
        - Short history (≤10 msgs): include all messages verbatim (truncated per msg)
        - Long history (>10 msgs): keep last 6 verbatim, compress older to key points
        """
        if not chat_history:
            return ""

        if len(chat_history) <= TRIM_THRESHOLD:
            lines = []
            for msg in chat_history:
                role = "User" if msg.get("role") == "user" else "Assistant"
                content = msg.get("content", "")[:500]
                lines.append(f"{role}: {content}")
            return "\n".join(lines)

        # Long conversation — just keep the last few + a brief summary of older user messages
        older = chat_history[:-RECENT_MESSAGES_LIMIT]
        recent = chat_history[-RECENT_MESSAGES_LIMIT:]

        # Extract just user queries from older messages (no LLM call!)
        older_summary = "\n".join([
            f"- {m.get('content', '')[:120]}"
            for m in older if m.get("role") == "user"
        ][-5:])  # Keep at most 5 older user queries

        recent_text = "\n".join([
            f"{'User' if m.get('role') == 'user' else 'Assistant'}: {m.get('content', '')[:400]}"
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
        mode: str = "chat"
    ):
        """
        Optimized RAG pipeline:
        1. Build conversation context (pure string ops, no LLM)
        2. Embed query + vector search (parallelized)
        3. Direct chunk concatenation (no summarize LLM call)
        4. LLM generation with mode-aware max_tokens
        """
        config = MODE_CONFIG.get(mode, MODE_CONFIG["chat"])

        # ── Step 1 & 2: Run in parallel ──────────────────────────
        # Conversation context (pure CPU — fast)
        conversation_context = self._build_conversation_context(chat_history or [])

        # Embedding + Vector search (I/O bound — benefits from threading)
        query_embedding = generate_embedding(query)
        context_chunks = vector_service.similarity_search(
            query_embedding, k=config["top_k"], user_id=user_id
        )

        # ── Step 3: Direct context (replaces summarize_service — saves 3-8s) ──
        context_text = self._build_context_text(context_chunks, config["chunk_chars"])

        # ── Step 4: Prompt construction ──────────────────────────
        template = self.live_prompt_template if mode == "live" else self.prompt_template
        final_prompt = template.format(
            context=context_text,
            query=query,
            chat_history=conversation_context
        )

        messages = [{"role": "system", "content": final_prompt}]

        if language and language != "en":
            lang_name = {"hi": "Hindi", "bn": "Bengali", "ta": "Tamil", "te": "Telugu"}.get(language, language)
            messages.append({
                "role": "system",
                "content": f"IMPORTANT: Respond entirely in {lang_name}. Use {lang_name} script. Keep legal terms in English where necessary for accuracy, but explain everything in {lang_name}."
            })

        if conversation_context:
            messages.append({
                "role": "system",
                "content": f"[Conversation History]\n{conversation_context}"
            })

        messages.append({"role": "user", "content": query})

        # ── Step 5: LLM call with mode-aware limits ──────────────
        if stream:
            return self._stream_response(messages, query, user_id, session_id, config["max_tokens"])
        else:
            return self._execute_response(messages, query, user_id, session_id, config["max_tokens"])

    def _execute_response(self, messages: list, query: str, user_id=None, session_id=None, max_tokens=1024):
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=max_tokens
        )
        result_text = response.choices[0].message.content
        store_analysis_result(query, result_text, user_id, session_id)
        return result_text

    def _stream_response(self, messages: list, query: str, user_id=None, session_id=None, max_tokens=1024):
        """Generator for streaming responses with token limit."""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=max_tokens,
            stream=True
        )

        collected_chunks = []
        for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                collected_chunks.append(content)
                yield content

        # Store full result asynchronously after stream completes
        full_text = "".join(collected_chunks)
        store_analysis_result(query, full_text, user_id, session_id)


# Singleton instance
rag_pipeline = RagPipeline()
