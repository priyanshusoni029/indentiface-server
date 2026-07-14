"""
Firebase Cloud Messaging (FCM) service for sending push notifications.
"""

import requests
import json
from config import Config


def send_fcm_notification(fcm_token: str, title: str, body: str, data: dict = None):
    """
    Send push notification to a specific device via FCM.
    
    Args:
        fcm_token: User's FCM registration token
        title: Notification title
        body: Notification body text
        data: Additional data payload (optional)
    
    Returns:
        bool: True if sent successfully, False otherwise
    """
    if not fcm_token or not Config.FCM_SERVER_KEY:
        print("[FCM] Missing FCM token or server key")
        return False
    
    url = "https://fcm.googleapis.com/fcm/send"
    
    headers = {
        "Authorization": f"key={Config.FCM_SERVER_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "to": fcm_token,
        "priority": "high",
        "notification": {
            "title": title,
            "body": body,
            "sound": "default",
            "badge": "1"
        }
    }
    
    if data:
        payload["data"] = data
    
    try:
        response = requests.post(url, headers=headers, data=json.dumps(payload), timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success') == 1:
                print(f"[FCM] Notification sent successfully to token: {fcm_token[:20]}...")
                return True
            else:
                print(f"[FCM] Failed to send notification: {result}")
                return False
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
