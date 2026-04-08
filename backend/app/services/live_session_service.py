"""
Live Session Service — DynamoDB-backed, fully isolated from Chat mode.

Table: CivicPulseLiveSessions  (separate from CivicPulseResults used by chat)
Schema:
  session_id  (PK, str)    — unique per WebSocket connection
  user_id     (str)        — Clerk user ID
  history     (list)       — [{role, content}, ...]
  language    (str)        — current language 'en' | 'hi'
  created_at  (str ISO)
  updated_at  (str ISO)
  ttl         (int unix)   — auto-deleted by DynamoDB after 4 hours

50 concurrent users → 50 documents in the table.
On disconnect or explicit session_end, the document is deleted immediately.
DynamoDB TTL is a safety net for leaked sessions (browser crash / server restart).
"""

import boto3
import logging
from datetime import datetime, timezone, timedelta
from app.config import AWS_REGION

logger = logging.getLogger(__name__)

LIVE_SESSION_TABLE = "CivicPulseLiveSessions"
SESSION_TTL_HOURS = 4   # Auto-expire after 4 hours if not explicitly cleaned up
MAX_HISTORY_TURNS = 20  # Keep last N turns to control token cost

_dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)


def _get_table():
    return _dynamodb.Table(LIVE_SESSION_TABLE)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ttl_timestamp() -> int:
    """Returns Unix timestamp 4 hours from now for DynamoDB TTL."""
    return int((datetime.now(timezone.utc) + timedelta(hours=SESSION_TTL_HOURS)).timestamp())


# ─── CREATE ─────────────────────────────────────────────────────────────────

def create_session(session_id: str, user_id: str, language: str = "en") -> bool:
    """
    Create a new live session document in DynamoDB.
    Called when a WebSocket connection is accepted.

    If session already exists (reconnect scenario), refreshes TTL and updates user_id.
    Returns True if session is ready for use.
    """
    try:
        # Try to create new session
        _get_table().put_item(
            Item={
                "session_id": session_id,
                "user_id": user_id,
                "history": [],
                "language": language,
                "created_at": _now_iso(),
                "updated_at": _now_iso(),
                "ttl": _ttl_timestamp(),
            },
            ConditionExpression="attribute_not_exists(session_id)"  # Only create if doesn't exist
        )
        logger.info(f"[LiveSession] Created new session {session_id} for user {user_id}")
        return True
    except _dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
        # Session already exists - user is reconnecting. Refresh TTL and continue.
        logger.info(f"[LiveSession] Session {session_id} exists, refreshing TTL for reconnect.")
        try:
            _get_table().update_item(
                Key={"session_id": session_id},
                UpdateExpression="SET #t = :t, updated_at = :u, #uid = :uid",
                ExpressionAttributeNames={"#t": "ttl", "#uid": "user_id"},
                ExpressionAttributeValues={
                    ":t": _ttl_timestamp(),
                    ":u": _now_iso(),
                    ":uid": user_id
                }
            )
            return True
        except Exception as e:
            logger.error(f"[LiveSession] Failed to refresh session {session_id}: {e}")
            return True  # Still proceed - session data exists
    except Exception as e:
        logger.error(f"[LiveSession] Failed to create session {session_id}: {e}")
        return False


# ─── READ ────────────────────────────────────────────────────────────────────

def get_history(session_id: str) -> list[dict]:
    """
    Fetch conversation history for a session.
    Returns [] on miss or error (graceful degradation).
    """
    try:
        response = _get_table().get_item(
            Key={"session_id": session_id},
            ProjectionExpression="#h",
            ExpressionAttributeNames={"#h": "history"}
        )
        return response.get("Item", {}).get("history", [])
    except Exception as e:
        logger.error(f"[LiveSession] Failed to get history for {session_id}: {e}")
        return []


# ─── UPDATE ──────────────────────────────────────────────────────────────────

def append_turns(session_id: str, user_text: str, ai_response: str) -> bool:
    """
    Append a user + AI turn to the session history.
    Trims history to MAX_HISTORY_TURNS to control token usage.
    Also refreshes the TTL on every turn (active sessions stay alive).
    """
    try:
        # Get current history
        history = get_history(session_id)
        prev_len = len(history)

        # Append new turns
        history.append({"role": "user", "content": user_text})
        history.append({"role": "assistant", "content": ai_response})

        # Keep only the last N turns (sliding window)
        if len(history) > MAX_HISTORY_TURNS * 2:
            history = history[-(MAX_HISTORY_TURNS * 2):]

        # Persist to DynamoDB
        _get_table().update_item(
            Key={"session_id": session_id},
            UpdateExpression="SET #h = :h, updated_at = :u, #t = :t",
            ExpressionAttributeNames={"#h": "history", "#t": "ttl"},
            ExpressionAttributeValues={
                ":h": history,
                ":u": _now_iso(),
                ":t": _ttl_timestamp(),
            }
        )
        logger.info(f"[LiveSession] Saved turn for {session_id}: {prev_len} -> {len(history)} messages")
        return True
    except Exception as e:
        logger.error(f"[LiveSession] Failed to append turns for {session_id}: {e}")
        return False


def update_language(session_id: str, language: str) -> bool:
    """Update the language setting for a session (called on language_switch)."""
    try:
        _get_table().update_item(
            Key={"session_id": session_id},
            UpdateExpression="SET #lang = :l, updated_at = :u",
            ExpressionAttributeNames={"#lang": "language"},
            ExpressionAttributeValues={":l": language, ":u": _now_iso()}
        )
        return True
    except Exception as e:
        logger.error(f"[LiveSession] Failed to update language for {session_id}: {e}")
        return False


# ─── DELETE ──────────────────────────────────────────────────────────────────

def delete_session(session_id: str) -> bool:
    """
    Immediately delete the session document on disconnect or draft navigation.
    DynamoDB TTL is a backup for leaked sessions — explicit delete is preferred.
    """
    try:
        _get_table().delete_item(Key={"session_id": session_id})
        logger.info(f"[LiveSession] Deleted session {session_id}")
        return True
    except Exception as e:
        logger.error(f"[LiveSession] Failed to delete session {session_id}: {e}")
        return False


# ─── TABLE SETUP (run once—idempotent) ───────────────────────────────────────

def ensure_table_exists():
    """
    Creates CivicPulseLiveSessions table if it doesn't exist.
    Safe to call on every app startup — DynamoDB ignores if already present.
    """
    client = _dynamodb.meta.client
    try:
        client.describe_table(TableName=LIVE_SESSION_TABLE)
        logger.info(f"[LiveSession] Table '{LIVE_SESSION_TABLE}' already exists.")
    except client.exceptions.ResourceNotFoundException:
        logger.info(f"[LiveSession] Creating table '{LIVE_SESSION_TABLE}'...")
        _dynamodb.create_table(
            TableName=LIVE_SESSION_TABLE,
            KeySchema=[{"AttributeName": "session_id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "session_id", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",  # On-demand — no capacity planning needed
        )
        # Enable TTL on the 'ttl' field
        waiter = client.get_waiter("table_exists")
        waiter.wait(TableName=LIVE_SESSION_TABLE)
        client.update_time_to_live(
            TableName=LIVE_SESSION_TABLE,
            TimeToLiveSpecification={"Enabled": True, "AttributeName": "ttl"}
        )
        logger.info(f"[LiveSession] Table '{LIVE_SESSION_TABLE}' created with TTL enabled.")
    except Exception as e:
        logger.error(f"[LiveSession] Table check failed: {e}")
