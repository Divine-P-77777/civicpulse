import os
from dotenv import load_dotenv
from app.services.rag_pipeline import analyze_document

load_dotenv()

def run_rag_test():
    query = "What is mentioned about tourism and hospitality in the documents?"
    print(f"Testing RAG with query: '{query}'")
    
    try:
        analysis = analyze_document(query)
        print("\n--- END-TO-END RAG ANALYSIS RESULT ---")
        print(analysis)
        print("---------------------------------------")
        print("✅ RAG Pipeline test successful!")
    except Exception as e:
        print(f"❌ RAG Pipeline Test Failed: {e}")

if __name__ == "__main__":
    run_rag_test()
