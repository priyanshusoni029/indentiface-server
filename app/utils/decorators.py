from functools import wraps
from flask import session, request, jsonify, redirect, url_for


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('admin_logged_in'):
            # API and biometric/registration management routes get JSON 401
            if (request.path.startswith('/admin/api/') or
                    request.path.startswith('/admin/biometrics') or
                    request.path.startswith('/admin/registrations')):
                return jsonify({"error": "session_expired"}), 401
            return redirect(url_for('admin.admin_login'))
        return f(*args, **kwargs)
    return decorated