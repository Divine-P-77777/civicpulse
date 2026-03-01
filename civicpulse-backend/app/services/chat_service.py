import boto3
import uuid
from datetime import datetime, timezone
from app.config import AWS_REGION
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
TABLE_NAME = "CivicPulseChats"

def _get_table():
    return dynamodb.Table(TABLE_NAME)

def ensure_table_exists():
    """Create the CivicPulseChats table if it doesn't exist."""
    client = boto3.client('dynamodb', region_name=AWS_REGION)
    existing = client.list_tables()["TableNames"]
    
    if TABLE_NAME not in existing:
        client.create_table(
            TableName=TABLE_NAME,
            KeySchema=[
                {"AttributeName": "UserId", "KeyType": "HASH"},
                {"AttributeName": "SessionId", "KeyType": "RANGE"}
            ],
            AttributeDefinitions=[
                {"AttributeName": "UserId", "AttributeType": "S"},
                {"AttributeName": "SessionId", "AttributeType": "S"}
            ],
            BillingMode="PAY_PER_REQUEST"
        )
        waiter = client.get_waiter('table_exists')
        waiter.wait(TableName=TABLE_NAME)
        print(f"✅ Created DynamoDB table: {TABLE_NAME}")
    else:
        print(f"ℹ️  Table {TABLE_NAME} already exists.")

# --- SESSION MANAGEMENT ---

def create_session(user_id: str, title: str = "New Chat"):
    """Create a new chat session for a user."""
    table = _get_table()
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    table.put_item(Item={
        "UserId": user_id,
        "SessionId": session_id,
        "Title": title,
        "Messages": [],
        "CreatedAt": now,
        "UpdatedAt": now
    })
    return {"session_id": session_id, "created_at": now}

def add_message(user_id: str, session_id: str, role: str, content: str):
    """Append a message to an existing session."""
    table = _get_table()
    now = datetime.now(timezone.utc).isoformat()
    
    message = {
        "role": role,        # "user" or "assistant"
        "content": content,
        "timestamp": now
    }
    
    table.update_item(
        Key={"UserId": user_id, "SessionId": session_id},
        UpdateExpression="SET Messages = list_append(if_not_exists(Messages, :empty), :msg), UpdatedAt = :now",
        ExpressionAttributeValues={
            ":msg": [message],
            ":empty": [],
            ":now": now
        }
    )
    return message

def get_session(user_id: str, session_id: str):
    """Get the full conversation for a session."""
    table = _get_table()
    response = table.get_item(Key={"UserId": user_id, "SessionId": session_id})
    item = response.get("Item")
    if not item:
        return None
    return {
        "session_id": item["SessionId"],
        "title": item.get("Title", "Untitled"),
        "messages": item.get("Messages", []),
        "created_at": item.get("CreatedAt"),
        "updated_at": item.get("UpdatedAt")
    }

def list_sessions(user_id: str):
    """List all chat sessions for a user (sorted by most recent)."""
    table = _get_table()
    response = table.query(
        KeyConditionExpression=Key("UserId").eq(user_id),
        ProjectionExpression="SessionId, Title, CreatedAt, UpdatedAt",
        ScanIndexForward=False  # newest first
    )
    return response.get("Items", [])

def delete_session(user_id: str, session_id: str):
    """Delete a chat session."""
    table = _get_table()
    table.delete_item(Key={"UserId": user_id, "SessionId": session_id})
    return {"deleted": True}

def update_session_title(user_id: str, session_id: str, title: str):
    """Update the title of a chat session."""
    table = _get_table()
    now = datetime.now(timezone.utc).isoformat()
    table.update_item(
        Key={"UserId": user_id, "SessionId": session_id},
        UpdateExpression="SET Title = :title, UpdatedAt = :now",
        ExpressionAttributeValues={":title": title, ":now": now}
    )
    return {"updated": True}
