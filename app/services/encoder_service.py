"""
Background encoder service.
Runs train3.py once at startup and then every N minutes.
No Flask app context needed because face_service uses sqlite3 directly.
"""

import os
import sys
import time
import subprocess
import threading
from config import Config
from . import face_service


def start_face_encoder():
    """Spawn a daemon thread that runs train3.py once after a 2s delay."""
    def run_encoder_once():
        time.sleep(2)
        script_path = Config.ENCODER_SCRIPT
        if not os.path.exists(script_path):
            print(f"Encoder script not found: {script_path}")
            return
        print("Running face encoder ONCE at startup")
        try:
            process = subprocess.run(
                [sys.executable, script_path],
                capture_output=True, text=True, timeout=180,
                creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
            )
            if process.returncode == 0:
                print("Face encoder completed successfully")
                face_service.reload_face_data()
            else:
                print(f"Face encoder failed: {process.stderr}")
        except subprocess.TimeoutExpired:
            print("Face encoder timed out")
        except Exception as e:
            print(f"Encoder error: {e}")

    threading.Thread(target=run_encoder_once, daemon=True).start()


def refresh_face_database_periodically(interval_minutes: int = 5):
    """Spawn a daemon thread that re-encodes faces every N minutes."""
    def refresh_task():
        while True:
            time.sleep(interval_minutes * 60)
            print("Periodic face database refresh")
            script_path = Config.ENCODER_SCRIPT
            try:
                process = subprocess.run(
                    [sys.executable, script_path],
                    capture_output=True, text=True, timeout=180,
                    creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
                )
                if process.returncode == 0:
                    face_service.reload_face_data()
                    print(f"Refresh complete. {len(face_service.known_names)} known faces")
                else:
                    print(f"Periodic refresh failed: {process.stderr}")
            except Exception as e:
                print(f"Refresh failed: {e}")

    threading.Thread(target=refresh_task, daemon=True).start()