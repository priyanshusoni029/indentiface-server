"""
On-demand encoding service for immediate user encoding after admin approval.
This service generates encodings for a specific user without waiting for periodic refresh.
"""

import os
import sys
import threading
import subprocess
from config import Config
from . import face_service


def generate_encoding_for_user(user_name: str):
    """
    Spawn a background thread to generate encoding for a specific user immediately.
    This is triggered after admin approves a biometric photo.
    
    Args:
        user_name: The name of the user whose photo was just approved
    """
    def run_encoding_for_user():
        script_path = Config.ENCODER_SCRIPT
        if not os.path.exists(script_path):
            print(f"[Encoding Service] Encoder script not found: {script_path}")
            return
        
        print(f"[Encoding Service] Starting immediate encoding for user: {user_name}")
        
        try:
            # Run generate_encoding.py with user filter argument
            process = subprocess.run(
                [sys.executable, script_path, "--user", user_name],
                capture_output=True,
                text=True,
                timeout=180,
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
            )
            
            if process.returncode == 0:
                print(f"[Encoding Service] Successfully encoded face for {user_name}")
                print(f"[Encoding Service] Output: {process.stdout}")
                
                # Reload face data to update in-memory encoding matrix
                face_service.reload_face_data()
                print(f"[Encoding Service] Face data reloaded. Total known faces: {len(face_service.known_names)}")
            else:
                print(f"[Encoding Service] Encoding failed for {user_name}")
                print(f"[Encoding Service] Error: {process.stderr}")
                
        except subprocess.TimeoutExpired:
            print(f"[Encoding Service] Encoding timed out for {user_name}")
        except Exception as e:
            print(f"[Encoding Service] Encoding error for {user_name}: {e}")
    
    # Run in background thread to avoid blocking the admin approval response
    threading.Thread(target=run_encoding_for_user, daemon=True).start()
    print(f"[Encoding Service] Background encoding task spawned for {user_name}")
