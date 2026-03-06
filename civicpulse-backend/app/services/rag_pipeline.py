import os
import json
from openai import OpenAI
from app.services.embedding_service import generate_embedding
from app.services.vector_service import vector_service
from app.services.summarize_service import summarize_service
from app.services.dynamodb_service import store_analysis_result
from dotenv import load_dotenv

load_dotenv()

# How many recent messages to keep verbatim (the rest get summarized)
RECENT_MESSAGES_LIMIT = 6
# Max messages before we start summarizing older ones
SUMMARIZE_THRESHOLD = 10


class RagPipeline:
    def __init__(self):
        self.client = OpenAI()
        self.model = os.getenv("RAG_MODEL", "openai.gpt-oss-120b")
        
        prompt_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "system_prompt.txt")
        with open(prompt_path, "r") as f:
            self.prompt_template = f.read()

    def _build_conversation_context(self, chat_history: list) -> str:
        """
        Smart context builder for conversation memory.
        
        Strategy:
        - Short history (≤10 msgs): include all messages verbatim
        - Long history (>10 msgs): summarize older messages, keep last 6 verbatim
        
        Returns a compact text block that fits as context alongside RAG docs.
        """
        if not chat_history:
            return ""

        if len(chat_history) <= SUMMARIZE_THRESHOLD:
            # Short conversation — include all messages
            lines = []
            for msg in chat_history:
                role = "User" if msg.get("role") == "user" else "Assistant"
                content = msg.get("content", "")[:500]  # Truncate very long messages
                lines.append(f"{role}: {content}")
            return "\n".join(lines)
        
        # Long conversation — summarize older messages + keep recent verbatim
        older = chat_history[:-RECENT_MESSAGES_LIMIT]
        recent = chat_history[-RECENT_MESSAGES_LIMIT:]
        
        # Build a compact summary of older messages
        older_text = "\n".join([
            f"{'User' if m.get('role') == 'user' else 'Assistant'}: {m.get('content', '')[:300]}"
            for m in older
        ])
        
        try:
            summary_response = self.client.chat.completions.create(
                model=self.model,
                messages=[{
                    "role": "user",
                    "content": f"Summarize this conversation history in 3-4 concise bullet points. "
                               f"Focus on: what the user asked about, key facts discussed, and any decisions made.\n\n"
                               f"{older_text}"
                }],
                max_tokens=300
            )
            older_summary = summary_response.choices[0].message.content
        except Exception:
            # Fallback: just take key points from older messages
            older_summary = "\n".join([
                f"- {m.get('content', '')[:100]}"
                for m in older if m.get("role") == "user"
            ][-5:])

        # Format recent messages verbatim
        recent_text = "\n".join([
            f"{'User' if m.get('role') == 'user' else 'Assistant'}: {m.get('content', '')[:500]}"
            for m in recent
        ])

        return f"[Earlier conversation summary]\n{older_summary}\n\n[Recent messages]\n{recent_text}"

    def analyze_document(self, query: str, user_id: str = None, session_id: str = None, chat_history: list = None, language: str = "en", stream: bool = False):
        """
        Orchestrates the RAG flow with conversation memory:
        1. Build conversation context from chat history
        2. Retrieve relevant documents via vector search
        3. Summarize retrieved context
        4. Construct prompt with both conversation + document context
        5. LLM generation (regular or streaming)
        """
        # 1. Conversation context
        conversation_context = self._build_conversation_context(chat_history or [])

        # 2. Document retrieval (RAG)
        query_embedding = generate_embedding(query)
        context_metadata = vector_service.similarity_search(query_embedding)
        
        # 3. Summarize retrieved documents
        context_summary = summarize_service.summarize_context(context_metadata, query)
        
        # 4. Prompt construction — includes both conversation history and RAG context
        final_prompt = self.prompt_template.format(
            context=context_summary,
            query=query
        )

        # Build messages array with proper roles
        messages = []
        
        # System message with the legal advocate prompt
        messages.append({"role": "system", "content": final_prompt})
        
        # Language instruction
        if language and language != "en":
            lang_name = {"hi": "Hindi", "bn": "Bengali", "ta": "Tamil", "te": "Telugu"}.get(language, language)
            messages.append({
                "role": "system",
                "content": f"IMPORTANT: Respond entirely in {lang_name}. Use {lang_name} script. Keep legal terms in English where necessary for accuracy, but explain everything in {lang_name}."
            })
        
        # Add conversation context if available
        if conversation_context:
            messages.append({
                "role": "system",
                "content": f"[Conversation History — use this for context continuity]\n{conversation_context}"
            })
        
        # Current user query
        messages.append({"role": "user", "content": query})

        if stream:
            return self._stream_response(messages, query, user_id, session_id)
        else:
            return self._execute_response(messages, query, user_id, session_id)

    def _execute_response(self, messages: list, query: str, user_id: str = None, session_id: str = None):
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages
        )
        result_text = response.choices[0].message.content
        store_analysis_result(query, result_text, user_id, session_id)
        return result_text

    def _stream_response(self, messages: list, query: str, user_id: str = None, session_id: str = None):
        """Generator for streaming responses."""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            stream=True
        )
        
        collected_chunks = []
        for chunk in response:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                collected_chunks.append(content)
                yield content
        
        # Store full result after stream completes
        full_text = "".join(collected_chunks)
        store_analysis_result(query, full_text, user_id, session_id)

# Singleton instance
rag_pipeline = RagPipeline()
