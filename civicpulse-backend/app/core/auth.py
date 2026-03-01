import os
import json
from jose import jwt
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from urllib.request import urlopen
from dotenv import load_dotenv

load_dotenv()

AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN")
AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE")
ALGORITHMS = ["RS256"]

security = HTTPBearer()

def verify_jwt(token: str):
    jsonurl = urlopen(f"https://{AUTH0_DOMAIN}/.well-known/jwks.json")
    jwks = json.loads(jsonurl.read())
    unverified_header = jwt.get_unverified_header(token)
    rsa_key = {}
    
    for key in jwks["keys"]:
        if key["kid"] == unverified_header["kid"]:
            rsa_key = {
                "kty": key["kty"],
                "kid": key["kid"],
                "use": key["use"],
                "n": key["n"],
                "e": key["e"]
            }
    
    if rsa_key:
        try:
            payload = jwt.decode(
                token,
                rsa_key,
                algorithms=ALGORITHMS,
                audience=AUTH0_AUDIENCE,
                issuer=f"https://{AUTH0_DOMAIN}/"
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.JWTClaimsError:
            raise HTTPException(status_code=401, detail="Incorrect claims, please check the audience and issuer")
        except Exception:
            raise HTTPException(status_code=401, detail="Unable to parse authentication token")

    raise HTTPException(status_code=401, detail="Unable to find appropriate key")

async def get_current_user(token: HTTPAuthorizationCredentials = Security(security)):
    return verify_jwt(token.credentials)

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    # Check if user email is in the admin whitelist
    admin_emails = os.getenv("ADMIN_EMAILS", "").split(",")
    user_email = current_user.get("https://civicpulse.org/email") or current_user.get("email")
    
    if not user_email or user_email not in admin_emails:
        raise HTTPException(
            status_code=403, 
            detail=f"User {user_email} is not authorized for administrative actions"
        )
    return current_user
