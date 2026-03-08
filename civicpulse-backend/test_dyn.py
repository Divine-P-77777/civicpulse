import os
import sys
import json
import decimal
sys.path.append(os.path.abspath(r'c:\civicpulse\civicpulse-backend'))

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return str(obj)
        return super(DecimalEncoder, self).default(obj)

from app.config import AWS_REGION
import boto3

def test():
    dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
    table = dynamodb.Table('CivicPulseChats')
    res = table.scan(Limit=5)
    with open('test_output.txt', 'w', encoding='utf-8') as f:
        f.write(json.dumps(res.get('Items', []), indent=2, cls=DecimalEncoder))

if __name__ == "__main__":
    test()
