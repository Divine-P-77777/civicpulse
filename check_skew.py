import boto3
import datetime
import dateutil.parser
from app.config import BEDROCK_REGION

def check_skew():
    client = boto3.client('s3', region_name=BEDROCK_REGION)
    response = client.list_buckets()
    server_date_str = response['ResponseMetadata']['HTTPHeaders']['date']
    server_date = dateutil.parser.parse(server_date_str)
    local_date = datetime.datetime.now(datetime.timezone.utc)
    
    skew = server_date - local_date
    print(f"AWS Server Time (UTC): {server_date}")
    print(f"Local Server Time (UTC): {local_date}")
    print(f"Detected Skew: {skew.total_seconds()} seconds")

if __name__ == "__main__":
    check_skew()
