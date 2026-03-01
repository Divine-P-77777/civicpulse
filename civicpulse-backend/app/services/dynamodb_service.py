import boto3
import uuid
from datetime import datetime
from app.config import AWS_REGION
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
TABLE_NAME = "CivicPulseResults"

def _get_table():
    return dynamodb.Table(TABLE_NAME)

# --- CREATE ---
def store_analysis_result(query: str, summary: str):
    try:
        table = _get_table()
        doc_id = str(uuid.uuid4())
        
        table.put_item(
            Item={
                'doc_id': doc_id,
                'Query': query,
                'Summary': summary,
                'RiskScore': "High",
                'Timestamp': datetime.utcnow().isoformat()
            }
        )
        return doc_id
    except Exception as e:
        print(f"Failed to store in DynamoDB: {e}")
        return None

# --- READ ---
def list_results(limit: int = 20, last_key: dict = None):
    """Paginated scan of all results."""
    table = _get_table()
    scan_kwargs = {"Limit": limit}
    if last_key:
        scan_kwargs["ExclusiveStartKey"] = last_key
    
    response = table.scan(**scan_kwargs)
    return {
        "items": response.get("Items", []),
        "count": response.get("Count", 0),
        "last_key": response.get("LastEvaluatedKey")
    }

def get_result(doc_id: str):
    """Get a single result by DocumentId."""
    table = _get_table()
    response = table.get_item(Key={"doc_id": doc_id})
    item = response.get("Item")
    return {"item": item, "found": item is not None}

# --- UPDATE ---
def update_result(doc_id: str, updates: dict):
    """Update specific fields of a result."""
    table = _get_table()
    
    update_expr_parts = []
    expr_attr_values = {}
    expr_attr_names = {}
    
    for i, (key, value) in enumerate(updates.items()):
        safe_key = f"#k{i}"
        safe_val = f":v{i}"
        update_expr_parts.append(f"{safe_key} = {safe_val}")
        expr_attr_names[safe_key] = key
        expr_attr_values[safe_val] = value
    
    update_expr = "SET " + ", ".join(update_expr_parts)
    
    response = table.update_item(
        Key={"doc_id": doc_id},
        UpdateExpression=update_expr,
        ExpressionAttributeNames=expr_attr_names,
        ExpressionAttributeValues=expr_attr_values,
        ReturnValues="ALL_NEW"
    )
    return {"item": response.get("Attributes")}

# --- DELETE ---
def delete_result(doc_id: str):
    """Delete a single result by DocumentId."""
    table = _get_table()
    table.delete_item(Key={"doc_id": doc_id})
    return {"deleted": True}
