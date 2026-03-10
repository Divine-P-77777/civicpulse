import boto3
from dotenv import load_dotenv
import pprint

load_dotenv()
client = boto3.client('bedrock', region_name='us-east-1')
models = client.list_foundation_models(byProvider='Anthropic')['modelSummaries']
sonnets = [m['modelId'] for m in models if 'sonnet' in m['modelId'].lower()]
pprint.pprint(sonnets)
