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
def store_analysis_result(query: str, summary: str, user_id: str = None, session_id: str = None, pages_processed: int = 1, ocr_engine: str = "Textract"):
    try:
        table = _get_table()
        doc_id = str(uuid.uuid4())
        
        table.put_item(
            Item={
                'doc_id': doc_id,
                'user_id': user_id or "anonymous",
                'session_id': session_id or "default",
                'Query': query,
                'Summary': summary,
                'RiskScore': "High",
                'Timestamp': datetime.utcnow().isoformat(),
                'pages_processed': pages_processed,
                'ocr_engine': ocr_engine
            }
        )
        return doc_id
    except Exception as e:
        print(f"Failed to store in DynamoDB: {e}")
        return None

def get_monthly_usage():
    """Aggregates pages processed by Textract in the current month."""
    try:
        table = _get_table()
        # Start of current month in ISO format
        start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        
        # Scan for Textract jobs this month
        # Note: For production with high volume, consider a separate 'Usage' table or a GSI on Timestamp and ocr_engine
        response = table.scan(
            FilterExpression=Key('Timestamp').gte(start_of_month) & boto3.dynamodb.conditions.Attr('ocr_engine').eq('Textract'),
            ProjectionExpression='pages_processed'
        )
        
        items = response.get('Items', [])
        total = sum(int(item.get('pages_processed', 0)) for item in items)
        return total
    except Exception as e:
        print(f"Error calculating monthly usage: {e}")
        return 0

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
