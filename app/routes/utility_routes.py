import os
import sys
import sqlite3
import subprocess
from datetime import datetime
from flask import Blueprint, request, jsonify
from ..models.attendance  import Attendance
from ..models.app_settings import AppSettings
from ..extensions import db
from ..services   import face_service
from ..services.face_service import reload_face_data
from config import Config

utility_bp = Blueprint('utility', __name__)


def _fmt_time(ts: str):
    try:
        return datetime.strptime(ts, "%Y-%m-%d %H:%M:%S").strftime("%H:%M:%S")
    except Exception:
        return ts


@utility_bp.route('/settings')
def get_settings_json():
    s = AppSettings.query.get(1)
    if not s:
        return jsonify({'geofencing_enabled': False, 'office_lat': 0, 'office_lng': 0, 'radius': 10})
    return jsonify({
        'geofencing_enabled': s.geofencing_enabled,
        'office_lat':         s.office_lat,
        'office_lng':         s.office_lng,
        'radius':             s.radius_meters,
    })


@utility_bp.route('/get_sqlite_attendance')
def get_sqlite_attendance():
    try:
        rows = Attendance.query.order_by(Attendance.timestamp.desc()).all()
        return jsonify([
            {"Name": r.name, "Time": _fmt_time(r.timestamp),
             "Date": r.date, "FullTimestamp": r.timestamp}
            for r in rows
        ])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@utility_bp.route('/get_today_attendance_sqlite')
def get_today_attendance_sqlite():
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        rows  = (Attendance.query
                 .filter_by(date=today)
                 .order_by(Attendance.timestamp.desc())
                 .all())
        return jsonify([
            {"Name": r.name, "Time": _fmt_time(r.timestamp), "Type": r.location_type}
            for r in rows
        ])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@utility_bp.route('/get_database_stats')
def get_database_stats():
    try:
        today       = datetime.now().strftime("%Y-%m-%d")
        total       = Attendance.query.count()
        today_count = Attendance.query.filter_by(date=today).count()
        unique      = db.session.query(
                          db.func.count(db.func.distinct(Attendance.name))
                      ).scalar()
        earliest    = db.session.query(db.func.min(Attendance.timestamp)).scalar()
        latest      = db.session.query(db.func.max(Attendance.timestamp)).scalar()

        return jsonify({
            "total_attendance_records": total,
            "today_attendance_count":   today_count,
            "unique_persons":           unique,
            "known_faces_in_csv":       len(face_service.known_names),
            "earliest_record":          earliest or "None",
            "latest_record":            latest   or "None",
            "database_type":            "SQLite only",
            "today_date":               today
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@utility_bp.route('/check_database')
def check_database():
    """Diagnostic endpoint — raw sqlite3 used intentionally for PRAGMA access."""
    try:
        db_path = Config.SQLALCHEMY_DATABASE_URI.replace('sqlite:///', '')
        conn    = sqlite3.connect(db_path)
        cursor  = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        cursor.execute("SELECT COUNT(*) FROM attendance")
        count = cursor.fetchone()[0]
        cursor.execute("SELECT * FROM attendance ORDER BY id DESC LIMIT 5")
        sample = cursor.fetchall()
        cursor.execute("PRAGMA table_info(attendance)")
        schema = cursor.fetchall()
        conn.close()
        return jsonify({
            "tables":         [t[0] for t in tables],
            "total_records":  count,
            "sample_records": sample,
            "schema":         schema,
            "database_file":  db_path,
            "file_exists":    os.path.exists(db_path)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@utility_bp.route('/refresh_face_database')
def refresh_face_database():
    try:
        script_path = os.path.join(Config.BASE_DIR, "train3.py")
        if not os.path.exists(script_path):
            return jsonify({"status": "error", "message": f"Script not found: {script_path}"}), 500

        process = subprocess.run(
            [sys.executable, script_path],
            capture_output=True, text=True, timeout=180,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
        )
        if process.returncode == 0:
            reload_face_data()
            return jsonify({"status": "success", "known_faces_count": len(face_service.known_names)})
        return jsonify({"status": "error", "message": process.stderr}), 500

    except subprocess.TimeoutExpired:
        return jsonify({"status": "error", "message": "Timed out after 3 minutes"}), 500
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ── Live feed routes (kept for future — uncomment when video_service is enabled) ──
# @utility_bp.route("/")
# def index():
#     from ..services.video_service import attendance
#     return render_template("index.html", attendance=attendance)

# @utility_bp.route("/video_feed")
# def video_feed():
#     from flask import Response
#     from ..services.video_service import generate_frames
#     return Response(generate_frames(), mimetype="multipart/x-mixed-replace; boundary=frame")

# @utility_bp.route("/get_attendance")
# def get_attendance():
#     from ..services.video_service import attendance
#     return jsonify(attendance)

# @utility_bp.route("/get_unregistered_faces")
# def get_unregistered_faces():
#     import numpy as np
#     from ..services.video_service import unregistered_faces
#     current            = list(unregistered_faces)
#     unregistered_faces.clear()
#     serializable = []
#     for face in current:
#         s = {}
#         for k, v in face.items():
#             if isinstance(v, np.integer):   s[k] = int(v)
#             elif isinstance(v, np.floating): s[k] = float(v)
#             elif isinstance(v, np.ndarray):  s[k] = v.tolist()
#             else:                            s[k] = v
#         serializable.append(s)
#     return jsonify(serializable)