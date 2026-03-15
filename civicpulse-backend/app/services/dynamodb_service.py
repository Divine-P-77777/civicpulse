import boto3
import uuid
from datetime import datetime
from app.config import AWS_REGION
from boto3.dynamodb.conditions import Key
import logging

logger = logging.getLogger(__name__)

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
        logger.error(f"Failed to store in DynamoDB: {e}")
        return None

def get_monthly_usage():
    """Aggregates pages processed by Textract in the current month from both Results and Jobs tables."""
    try:
        results_table = _get_table()
        jobs_table = dynamodb.Table("CivicPulseJobs")
        
        # Start of current month
        now = datetime.utcnow()
        start_of_month_dt = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        start_of_month_iso = start_of_month_dt.isoformat()
        start_of_month_unix = int(start_of_month_dt.timestamp())
        
        # 1. Monthly usage from Results (Chat/Logs)
        results_resp = results_table.scan(
            FilterExpression=Key('Timestamp').gte(start_of_month_iso) & boto3.dynamodb.conditions.Attr('ocr_engine').eq('Textract'),
            ProjectionExpression='pages_processed'
        )
        total_results = sum(int(item.get('pages_processed', 0)) for item in results_resp.get('Items', []))
        
        # 2. Monthly usage from Jobs (Background Ingestion)
        # Note: Filter by started_at and ensuring we only count Textract jobs
        jobs_resp = jobs_table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr('started_at').gte(start_of_month_unix) & 
                             boto3.dynamodb.conditions.Attr('ingest_type').contains('pdf') &
                             boto3.dynamodb.conditions.Attr('status').eq('completed'),
            ProjectionExpression='detail'
        )
        # We only count jobs that used Textract (default unless overridden)
        total_jobs = 0
        for item in jobs_resp.get('Items', []):
            detail = item.get('detail', {})
            if detail.get('engine') == 'Textract':
                total_jobs += int(detail.get('pages_extracted', 0))
        
        grand_total = total_results + total_jobs
        logger.info(f"Usage Audit: Results={total_results}, Jobs={total_jobs}, Total={grand_total}")
        return grand_total
    except Exception as e:
        logger.error(f"Error calculating monthly usage: {e}")
        return 0

# --- READ ---
def get_weekly_usage_stats():
    """Calculates query counts and pages processed grouped by day for the last 7 days."""
    try:
        table = _get_table()
        # Get start of exactly 7 days ago
        import datetime as dt
        now = dt.datetime.utcnow()
        seven_days_ago = (now - dt.timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)
        
        # We need all records from the last 7 days
        # In a very large table, this scan needs a GSI on Timestamp. 
        # For now, it filters effectively for the dashboard.
        response = table.scan(
            FilterExpression=Key('Timestamp').gte(seven_days_ago.isoformat()),
            ProjectionExpression='#ts, pages_processed, #q',
            ExpressionAttributeNames={'#ts': 'Timestamp', '#q': 'Query'}
        )
        items = response.get("Items", [])
        
        # Initialize the 7 days mapping
        # days mapping array like: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        days_order = []
        usage_map = {}
        
        for i in range(6, -1, -1):
            day_date = now - dt.timedelta(days=i)
            day_name = day_date.strftime("%a") # e.g. "Mon"
            days_order.append(day_name)
            usage_map[day_name] = {"name": day_name, "queries": 0, "documents": 0}
            
        # Group data into the mapping
        for item in items:
            ts_str = item.get("Timestamp")
            if not ts_str: continue
            
            # Parse ISO string and get day name
            item_dt = dt.datetime.fromisoformat(ts_str.replace("Z", "+00:00") if ts_str.endswith("Z") else ts_str)
            day_name = item_dt.strftime("%a")
            
            if day_name in usage_map:
                usage_map[day_name]["queries"] += 1
                usage_map[day_name]["documents"] += int(item.get("pages_processed", 0))
                
        # Return as an ordered list for Recharts
        return [usage_map[day] for day in days_order]
        
    except Exception as e:
        logger.error(f"Error calculating weekly usage: {e}")
        return []

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
