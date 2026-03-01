import os
import json
from openai import OpenAI
from app.services.embedding_service import generate_embedding
from app.services.vector_service import vector_service
from app.services.summarize_service import summarize_service
from app.services.dynamodb_service import store_analysis_result
from dotenv import load_dotenv

load_dotenv()

class RagPipeline:
    def __init__(self):
        self.client = OpenAI()
        self.model = os.getenv("RAG_MODEL", "openai.gpt-oss-120b")
        
        prompt_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "system_prompt.txt")
        with open(prompt_path, "r") as f:
            self.prompt_template = f.read()

    def analyze_document(self, query: str, stream: bool = False):
        """
        Orchestrates the RAG flow:
        1. Context retrieval
        2. Optional Summarization for better focus
        3. Prompt construction
        4. LLM Generation (Regular or Streaming)
        """
        # 1. Retrieval
        query_embedding = generate_embedding(query)
        context_metadata = vector_service.similarity_search(query_embedding)
        
        # 2. Summarization (Production best practice: condense context)
        context_summary = summarize_service.summarize_context(context_metadata, query)
        
        # 3. Prompt Construction
        final_prompt = self.prompt_template.format(
            context=context_summary,
            query=query
        )

        messages = [{"role": "user", "content": final_prompt}]

        if stream:
            return self._stream_response(messages, query)
        else:
            return self._execute_response(messages, query)

    def _execute_response(self, messages: list, query: str):
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages
        )
        result_text = response.choices[0].message.content
        store_analysis_result(query, result_text)
        return result_text

    def _stream_response(self, messages: list, query: str):
        """Asynchronous generator for streaming responses."""
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
        
        # Store full result in background after stream completes
        full_text = "".join(collected_chunks)
        store_analysis_result(query, full_text)

# Singleton instance
rag_pipeline = RagPipeline()
