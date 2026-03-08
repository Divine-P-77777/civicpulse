import os
import sys
import json
sys.path.append(os.path.abspath(r"c:\civicpulse\civicpulse-backend"))

from fastapi.testclient import TestClient
from app.main import app
from app.core.auth import get_current_user

# Mock authentication
def mock_get_current_user():
    return {"sub": "user_3AQjtYHfYqckYwtm2yj9CIJS0Fv", "email": "test@example.com"}

app.dependency_overrides[get_current_user] = mock_get_current_user

client = TestClient(app)

def run_test():
    response = client.get("/api/chat/sessions")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

if __name__ == "__main__":
    run_test()
