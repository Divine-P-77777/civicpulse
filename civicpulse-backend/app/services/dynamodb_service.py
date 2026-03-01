import boto3
import uuid
from datetime import datetime
from app.config import AWS_REGION

dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
table_name = "CivicPulseAnalysis"

def store_analysis_result(query: str, summary: str):
    try:
        table = dynamodb.Table(table_name)
        doc_id = str(uuid.uuid4())
        
        table.put_item(
            Item={
                'DocumentId': doc_id,
                'Query': query,
                'Summary': summary,
                'RiskScore': "High", # Placeholder for actual risk scoring
                'Timestamp': datetime.utcnow().isoformat()
            }
        )
        return doc_id
    except Exception as e:
        print(f"Failed to store in DynamoDB: {e}")
        return None
