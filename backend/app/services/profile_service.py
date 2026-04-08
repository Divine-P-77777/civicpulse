import boto3
from app.config import AWS_REGION
from typing import Optional, Dict, Any

dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
TABLE_NAME = "CivicPulseUserProfiles"

def _get_table():
    return dynamodb.Table(TABLE_NAME)

def ensure_profile_table():
    """Ensure the user profiles table exists."""
    client = boto3.client('dynamodb', region_name=AWS_REGION)
    try:
        existing = client.list_tables()["TableNames"]
        if TABLE_NAME not in existing:
            client.create_table(
                TableName=TABLE_NAME,
                KeySchema=[
                    {"AttributeName": "UserId", "KeyType": "HASH"}
                ],
                AttributeDefinitions=[
                    {"AttributeName": "UserId", "AttributeType": "S"}
                ],
                BillingMode="PAY_PER_REQUEST"
            )
            print(f"✅ Created DynamoDB table: {TABLE_NAME}")
    except Exception as e:
        print(f"⚠️ Could not ensure table {TABLE_NAME}: {e}")

def get_user_profile(user_id: str) -> Dict[str, Any]:
    """Fetch profile for a specific user."""
    try:
        table = _get_table()
        response = table.get_item(Key={"UserId": user_id})
        return response.get("Item", {})
    except Exception as e:
        print(f"❌ Failed to fetch profile for {user_id}: {e}")
        return {}

def save_user_profile(user_id: str, profile_data: Dict[str, Any]):
    """Save/Update profile for a user."""
    try:
        table = _get_table()
        # Clean data - only keep allowed fields
        allowed_fields = {"full_name", "address", "contact_number", "email", "metadata"}
        item = {
            "UserId": user_id,
            **{k: v for k, v in profile_data.items() if k in allowed_fields}
        }
        table.put_item(Item=item)
        return True
    except Exception as e:
        print(f"❌ Failed to save profile for {user_id}: {e}")
        return False
