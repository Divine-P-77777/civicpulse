from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

class SummarizeService:
    def __init__(self):
        self.client = OpenAI()
        self.model = "openai.gpt-oss-120b" # Using the user-confirmed model identifier

    def summarize_context(self, context_chunks: list, query: str):
        """
        Summarizes multiple context chunks into a high-signal summary relevant to the query.
        This reduces token usage and focused the LLM on the most important legal facts.
        """
        combined_text = "\n\n".join([c.get("text", "") for c in context_chunks])
        
        prompt = f"""
        Analyze the following legal document segments and summarize the facts most relevant to this query: "{query}"
        
        DOCUMENT SEGMENTS:
        {combined_text}
        
        Provide a concise, high-signal summary of the legal obligations, rights, and risks found.
        """
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return response.choices[0].message.content

# Singleton instance
summarize_service = SummarizeService()
