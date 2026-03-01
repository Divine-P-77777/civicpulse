import os
import json
import time
import logging
from jose import jwt
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from urllib.request import urlopen
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("civicpulse.auth")

CLERK_ISSUER = os.getenv("CLERK_ISSUER")
ALGORITHMS = ["RS256"]

security = HTTPBearer()

# ─── JWKS Cache ───
_jwks_cache = {"keys": None, "fetched_at": 0}
JWKS_CACHE_TTL = 3600  # 1 hour

def _get_jwks():
    """Fetch JWKS keys with caching to avoid hitting the endpoint on every request."""
    now = time.time()
    if _jwks_cache["keys"] and (now - _jwks_cache["fetched_at"]) < JWKS_CACHE_TTL:
        return _jwks_cache["keys"]
    
    if not CLERK_ISSUER:
        raise HTTPException(status_code=500, detail="CLERK_ISSUER is not configured")
    
    jsonurl = urlopen(f"{CLERK_ISSUER}/.well-known/jwks.json")
    jwks = json.loads(jsonurl.read())
    _jwks_cache["keys"] = jwks
    _jwks_cache["fetched_at"] = now
    logger.info("JWKS keys refreshed from Clerk")
    return jwks

def verify_jwt(token: str):
    jwks = _get_jwks()
    unverified_header = jwt.get_unverified_header(token)
    rsa_key = {}
    
    for key in jwks["keys"]:
        if key["kid"] == unverified_header.get("kid"):
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
                issuer=CLERK_ISSUER
            )
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token expired")
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.JWTClaimsError as e:
            logger.warning(f"JWT claims error: {e}")
            raise HTTPException(status_code=401, detail=f"Incorrect claims: {str(e)}")
        except Exception as e:
            logger.error(f"JWT parse error: {e}")
            raise HTTPException(status_code=401, detail=f"Unable to parse authentication token: {str(e)}")

    logger.warning("No matching RSA key found for JWT")
    raise HTTPException(status_code=401, detail="Unable to find appropriate key")

async def get_current_user(token: HTTPAuthorizationCredentials = Security(security)):
    return verify_jwt(token.credentials)

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    admin_emails = os.getenv("ADMIN_EMAILS", "").split(",")
    user_email = current_user.get("email")
    
    if user_email and user_email not in admin_emails:
        logger.warning(f"Non-admin user attempted admin action: {user_email}")
        raise HTTPException(
            status_code=403, 
            detail=f"User {user_email} is not authorized for administrative actions"
        )
    return current_user
