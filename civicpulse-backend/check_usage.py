from app.services.dynamodb_service import get_monthly_usage
print(f"Current monthly usage: {get_monthly_usage()} pages")
