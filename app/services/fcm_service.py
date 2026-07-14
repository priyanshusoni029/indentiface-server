"""
Firebase Cloud Messaging (FCM) service for sending push notifications.
Uses HTTP v1 API with OAuth 2.0 service account authentication.
"""

import requests
import json
import time
from google.auth.transport.requests import Request
from google.oauth2 import service_account
from config import Config

# ── Token cache (avoid regenerating on every request) ──
_cached_token = None
_token_expiry = 0

SCOPES = ['https://www.googleapis.com/auth/firebase.messaging']


def _get_access_token():
    """
    Get OAuth 2.0 access token from service account JSON.
    Caches token for 55 minutes (expires in 1 hour).
    """
    global _cached_token, _token_expiry
    
    # Return cached token if still valid
    if _cached_token and time.time() < _token_expiry:
        return _cached_token
    
    try:
        credentials = service_account.Credentials.from_service_account_file(
            Config.FIREBASE_CREDENTIALS_PATH,
            scopes=SCOPES
        )
        
        credentials.refresh(Request())
        
        _cached_token = credentials.token
        _token_expiry = time.time() + 3300  # 55 minutes
        
        print(f"[FCM] New access token generated (expires in 55 min)")
        return _cached_token
        
    except FileNotFoundError:
        print(f"[FCM] Error: Service account JSON not found at {Config.FIREBASE_CREDENTIALS_PATH}")
        return None
    except Exception as e:
        print(f"[FCM] Error generating access token: {e}")
        return None


def send_fcm_notification(fcm_token: str, title: str, body: str, data: dict = None):
    """
    Send push notification to a specific device via FCM HTTP v1 API.
    
    Args:
        fcm_token: User's FCM registration token
        title: Notification title
        body: Notification body text
        data: Additional data payload (optional)
    
    Returns:
        bool: True if sent successfully, False otherwise
    """
    if not fcm_token:
        print("[FCM] Missing FCM token")
        return False
    
    # Get OAuth 2.0 access token
    access_token = _get_access_token()
    if not access_token:
        print("[FCM] Failed to get access token")
        return False
    
    # Extract project ID from service account JSON
    try:
        with open(Config.FIREBASE_CREDENTIALS_PATH) as f:
            project_id = json.load(f)['project_id']
    except Exception as e:
        print(f"[FCM] Error reading project ID: {e}")
        return False
    
    # HTTP v1 API endpoint
    url = f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send"
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    # Build message payload
    message = {
        "message": {
            "token": fcm_token,
            "notification": {
                "title": title,
                "body": body
            },
            "android": {
                "priority": "high",
                "notification": {
                    "sound": "default",
                    "channel_id": "high_importance_channel"
                }
            },
            "apns": {
                "payload": {
                    "aps": {
                        "sound": "default",
                        "badge": 1
                    }
                }
            }
        }
    }
    
    # Add custom data if provided
    if data:
        message["message"]["data"] = {k: str(v) for k, v in data.items()}
    
    try:
        response = requests.post(url, headers=headers, data=json.dumps(message), timeout=10)
        
        if response.status_code == 200:
            print(f"[FCM] Notification sent successfully to token: {fcm_token[:20]}...")
            return True
        else:
            print(f"[FCM] HTTP error {response.status_code}: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print("[FCM] Request timed out")
        return False
    except Exception as e:
        print(f"[FCM] Error sending notification: {e}")
        return False


def send_registration_approved_notification(user_name: str, fcm_token: str):
    """Send notification when registration is approved."""
    return send_fcm_notification(
        fcm_token=fcm_token,
        title="Registration Approved! 🎉",
        body=f"Welcome, {user_name}! Your account has been approved. You can now log in.",
        data={"type": "registration_approved", "user_name": user_name}
    )


def send_registration_rejected_notification(user_name: str, fcm_token: str):
    """Send notification when registration is rejected."""
    return send_fcm_notification(
        fcm_token=fcm_token,
        title="Registration Rejected",
        body="Your registration request was rejected. Please contact the administrator.",
        data={"type": "registration_rejected", "user_name": user_name}
    )


def send_biometric_approved_notification(user_name: str, fcm_token: str):
    """Send notification when biometric photo is approved."""
    return send_fcm_notification(
        fcm_token=fcm_token,
        title="Face Registration Approved! ✓",
        body="Your biometric photo has been approved. Face login is now active!",
        data={"type": "biometric_approved", "user_name": user_name}
    )


def send_biometric_rejected_notification(user_name: str, fcm_token: str):
    """Send notification when biometric photo is rejected."""
    return send_fcm_notification(
        fcm_token=fcm_token,
        title="Biometric Photo Rejected",
        body="Your photo was rejected. Please upload a clear, well-lit photo showing your face.",
        data={"type": "biometric_rejected", "user_name": user_name}
    )
