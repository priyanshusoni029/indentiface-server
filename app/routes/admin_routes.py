import os
import shutil
import time
from datetime import datetime
from sqlalchemy import case
from flask import (Blueprint, request, jsonify, render_template,
                   redirect, flash, url_for, session, send_from_directory)
from ..models.user              import User
from ..models.attendance        import Attendance
from ..models.biometric_request import BiometricRequest
from ..models.app_settings      import AppSettings
from ..extensions    import db
from ..utils.decorators import admin_required
from config import Config

admin_bp = Blueprint('admin', __name__)


# ── Session auth ──

@admin_bp.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        if username == Config.ADMIN_USERNAME and password == Config.ADMIN_PASSWORD:
            session['admin_logged_in'] = True
            return redirect(url_for('admin.admin_attendance_page'))
        return render_template('admin_login.html', error='Wrong credentials')
    return render_template('admin_login.html')


@admin_bp.route('/admin/logout')
def admin_logout():
    session.pop('admin_logged_in', None)
    return redirect(url_for('admin.admin_login'))


# ── Admin panel & settings ──

@admin_bp.route('/admin')
@admin_required
def admin_panel():
    s = AppSettings.query.get(1)
    settings = {
        'geofencing_enabled': s.geofencing_enabled if s else False,
        'office_lat':         s.office_lat         if s else 0,
        'office_lng':         s.office_lng         if s else 0,
        'radius':             s.radius_meters       if s else 10,
    }
    return render_template('admin.html', settings=settings)


@admin_bp.route('/admin/settings', methods=['POST'])
@admin_required
def update_settings():
    enabled = 'geofencing_enabled' in request.form
    try:
        lat    = float(request.form.get('office_lat', 0))
        lng    = float(request.form.get('office_lng', 0))
        radius = max(1.0, float(request.form.get('radius', 10)))
    except ValueError:
        return "Invalid number format", 400

    s = AppSettings.query.get(1)
    if s:
        s.geofencing_enabled = int(enabled)
        s.office_lat         = lat
        s.office_lng         = lng
        s.radius_meters      = radius
    else:
        db.session.add(AppSettings(
            id=1, geofencing_enabled=int(enabled),
            office_lat=lat, office_lng=lng, radius_meters=radius
        ))
    db.session.commit()
    flash('Settings updated successfully!')
    return redirect(url_for('admin.admin_panel'))


@admin_bp.route('/admin/attendance')
@admin_required
def admin_attendance_page():
    return render_template('admin_attendance.html')


# ── Attendance API ──

def _fmt_time(ts: str):
    try:
        return datetime.strptime(ts, "%Y-%m-%d %H:%M:%S").strftime("%H:%M:%S")
    except Exception:
        return ts


@admin_bp.route('/admin/api/attendance/all')
@admin_required
def admin_get_all_attendance():
    try:
        rows = Attendance.query.order_by(Attendance.timestamp.desc()).all()
        return jsonify([
            {"Name": r.name, "Time": _fmt_time(r.timestamp),
             "Date": r.date, "Timestamp": r.timestamp, "Type": r.location_type}
            for r in rows
        ])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route('/admin/api/attendance/today')
@admin_required
def admin_get_today_attendance():
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


@admin_bp.route('/admin/api/attendance/range')
@admin_required
def admin_get_attendance_range():
    from_date = request.args.get('from')
    to_date   = request.args.get('to')
    if not from_date or not to_date:
        return jsonify({"error": "Missing from or to parameters"}), 400
    try:
        rows = (Attendance.query
                .filter(Attendance.date.between(from_date, to_date))
                .order_by(Attendance.timestamp.desc())
                .all())
        return jsonify([
            {"Name": r.name, "Time": _fmt_time(r.timestamp),
             "Date": r.date, "Type": r.location_type}
            for r in rows
        ])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── Registration management ──

@admin_bp.route('/admin/registrations/pending', methods=['GET'])
@admin_required
def admin_registrations_pending():
    rows = User.query.filter(User.status != 'active').order_by(User.id.desc()).all()
    return jsonify([
        {"id": r.id, "name": r.name, "email": r.email,
         "status": r.status, "created_at": r.created_at}
        for r in rows
    ])


@admin_bp.route('/admin/registrations/approve', methods=['POST'])
@admin_required
def admin_registrations_approve():
    uid = (request.get_json() or {}).get('id')
    if not uid:
        return jsonify({"error": "id required"}), 400
    user = User.query.get(uid)
    if user:
        user.status = 'active'
        db.session.commit()
    return jsonify({"success": True})


@admin_bp.route('/admin/registrations/reject', methods=['POST'])
@admin_required
def admin_registrations_reject():
    uid = (request.get_json() or {}).get('id')
    if not uid:
        return jsonify({"error": "id required"}), 400
    user = User.query.get(uid)
    if user:
        user.status = 'rejected'
        db.session.commit()
    return jsonify({"success": True})


# ── Biometrics management ──

@admin_bp.route('/admin/biometrics/pending', methods=['GET'])
@admin_required
def admin_biometrics_pending():
    rows = (BiometricRequest.query
            .order_by(
                case((BiometricRequest.status == 'pending', 0), else_=1),
                BiometricRequest.id.desc()
            )
            .all())
    return jsonify([
        {"id": r.id, "name": r.name, "status": r.status,
         "timestamp": r.timestamp, "photo": r.photo}
        for r in rows
    ])


@admin_bp.route('/admin/biometrics/approve', methods=['POST'])
@admin_required
def admin_biometrics_approve():
    name = (request.get_json() or {}).get('name', '').strip()
    if not name:
        return jsonify({"error": "name required"}), 400

    pending_folder = os.path.join(Config.PENDING_FACES_DIR, name)
    if not os.path.exists(pending_folder):
        return jsonify({"error": "No pending photo found"}), 404

    files = [f for f in os.listdir(pending_folder) if f.endswith('.jpg')]
    if not files:
        return jsonify({"error": "No pending photo found"}), 404

    pending_photo = os.path.join(pending_folder, files[0])
    dest_folder   = os.path.join(Config.KNOWN_FACES_DIR, name)
    os.makedirs(dest_folder, exist_ok=True)
    
    unique_filename = f'photo_{int(time.time())}.jpg'
    shutil.move(pending_photo, os.path.join(dest_folder, unique_filename))

    # ── Move in Supabase ──
    from ..utils.supabase_storage import supabase_storage
    # Find the pending request to get the filename if needed, 
    # but we can also use the local move logic.
    # Better: move from 'pending-faces' to 'known-faces'
    from_path = f"{name}/{files[0]}"
    to_path   = f"{name}/{unique_filename}"
    supabase_storage.move_file("pending-faces", "known-faces", from_path, to_path)

    try:
        os.rmdir(pending_folder)
    except OSError:
        pass

    req = (BiometricRequest.query
           .filter_by(name=name)
           .order_by(BiometricRequest.id.desc())
           .first())
    if req:
        req.status   = 'approved'
        req.reviewed = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        db.session.commit()

    print(f"[Biometrics] Approved: {name} → known_faces/{name}/ (encoder picks up within 5 min)")
    return jsonify({"success": True})


@admin_bp.route('/admin/biometrics/reject', methods=['POST'])
@admin_required
def admin_biometrics_reject():
    name = (request.get_json() or {}).get('name', '').strip()
    if not name:
        return jsonify({"error": "name required"}), 400

    folder = os.path.join(Config.PENDING_FACES_DIR, name)
    if os.path.exists(folder):
        from ..utils.supabase_storage import supabase_storage
        for f in os.listdir(folder):
            os.remove(os.path.join(folder, f))
            # Delete from Supabase
            supabase_storage.delete_file("pending-faces", f"{name}/{f}")
        os.rmdir(folder)

    req = (BiometricRequest.query
           .filter_by(name=name)
           .order_by(BiometricRequest.id.desc())
           .first())
    if req:
        req.status   = 'rejected'
        req.reviewed = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        db.session.commit()

    print(f"[Biometrics] Rejected: {name}")
    return jsonify({"success": True})


# ── Photo serving ──

@admin_bp.route('/pending_photo/<path:name>/<filename>')
@admin_required
def serve_pending_photo_file(name, filename):
    return send_from_directory(os.path.join(Config.PENDING_FACES_DIR, name), filename)


@admin_bp.route('/approved_photo/<path:name>')
@admin_required
def serve_approved_photo(name):
    folder = os.path.join(Config.KNOWN_FACES_DIR, name)
    if not os.path.exists(folder):
        return '', 404
    files = sorted([f for f in os.listdir(folder) if f.endswith('.jpg')], reverse=True)
    if not files:
        return '', 404
    return send_from_directory(folder, files[0])