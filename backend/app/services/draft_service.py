import boto3
import uuid
from datetime import datetime, timezone
from app.config import AWS_REGION
from boto3.dynamodb.conditions import Key
from typing import Optional

dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
TABLE_NAME = "CivicPulseDrafts"

def _get_table():
    return dynamodb.Table(TABLE_NAME)

def ensure_draft_table():
    """Ensure the drafts table exists."""
    client = boto3.client('dynamodb', region_name=AWS_REGION)
    try:
        existing = client.list_tables()["TableNames"]
        if TABLE_NAME not in existing:
            client.create_table(
                TableName=TABLE_NAME,
                KeySchema=[
                    {"AttributeName": "UserId", "KeyType": "HASH"},
                    {"AttributeName": "DraftId", "KeyType": "RANGE"}
                ],
                AttributeDefinitions=[
                    {"AttributeName": "UserId", "AttributeType": "S"},
                    {"AttributeName": "DraftId", "AttributeType": "S"}
                ],
                BillingMode="PAY_PER_REQUEST"
            )
            print(f"✅ Created DynamoDB table: {TABLE_NAME}")
    except Exception as e:
        print(f"⚠️ Could not ensure table {TABLE_NAME}: {e}")

def save_draft(user_id: str, topic: str, draft_type: str, content: str, type_label: Optional[str] = None):
    """Save a generated draft to history."""
    try:
        table = _get_table()
        draft_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        
        table.put_item(Item={
            "UserId": user_id,
            "DraftId": draft_id,
            "Topic": topic,
            "Type": draft_type,
            "TypeLabel": type_label or draft_type.replace("_", " ").title(),
            "Content": content,
            "CreatedAt": now,
            "UpdatedAt": now
        })
        return draft_id
    except Exception as e:
        print(f"❌ Failed to save draft: {e}")
        return None

def list_drafts(user_id: str):
    """List history for a user."""
    try:
        table = _get_table()
        response = table.query(
            KeyConditionExpression=Key("UserId").eq(user_id),
            ScanIndexForward=False
        )
        return response.get("Items", [])
    except Exception as e:
        print(f"❌ Failed to list drafts: {e}")
        return []

def delete_draft(user_id: str, draft_id: str):
    """Delete a draft from history."""
    try:
        table = _get_table()
        table.delete_item(Key={"UserId": user_id, "DraftId": draft_id})
        return True
    except Exception as e:
        print(f"❌ Failed to delete draft: {e}")
        return False
