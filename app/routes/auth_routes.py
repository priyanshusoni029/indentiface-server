import hashlib
from flask import Blueprint, request, jsonify
from ..models.user import User
from ..extensions import db

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"success": False, "message": "Invalid request"}), 400

    email    = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()

    if not email or not password:
        return jsonify({"success": False, "message": "Email and password required"}), 400

    pw_hash = hashlib.sha256(password.encode()).hexdigest()
    user    = User.query.filter_by(email=email, password_hash=pw_hash).first()

    if not user:
        return jsonify({"success": False, "message": "Invalid email or password"}), 401
    if user.status == 'pending':
        return jsonify({"success": False, "message": "Your account is pending admin approval."}), 403
    if user.status == 'rejected':
        return jsonify({"success": False, "message": "Your registration was rejected. Contact admin."}), 403

    return jsonify({"success": True, "name": user.name})


@auth_bp.route('/register', methods=['POST'])
def register():
    data     = request.get_json(silent=True)
    name     = (data or {}).get('name',     '').strip()
    email    = (data or {}).get('email',    '').strip().lower()
    password = (data or {}).get('password', '').strip()

    if not all([name, email, password]):
        return jsonify({"success": False, "message": "Name, email and password are required"}), 400
    if len(password) < 8:
        return jsonify({"success": False, "message": "Password must be at least 8 characters"}), 400

    pw_hash = hashlib.sha256(password.encode()).hexdigest()

    try:
        db.session.add(User(email=email, password_hash=pw_hash, name=name, status='pending'))
        db.session.commit()
        return jsonify({"success": True, "message": "Registration submitted. Awaiting admin approval."})
    except Exception:
        db.session.rollback()
        return jsonify({"success": False, "message": "Email already registered."}), 409


@auth_bp.route('/register/status', methods=['GET'])
def register_status():
    email = request.args.get('email', '').strip().lower()
    if not email:
        return jsonify({"error": "email required"}), 400
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"status": "not_found"})
    return jsonify({"status": user.status})


@auth_bp.route('/register/status/by-name', methods=['GET'])
def register_status_by_name():
    name = request.args.get('name', '').strip()
    if not name:
        return jsonify({"error": "name required"}), 400
    user = User.query.filter_by(name=name).first()
    if not user:
        return jsonify({"status": "not_registered", "email": None})
    return jsonify({"status": user.status, "email": user.email})