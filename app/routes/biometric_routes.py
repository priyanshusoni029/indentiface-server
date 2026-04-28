import os
import time
from flask import Blueprint, request, jsonify
from ..models.biometric_request import BiometricRequest
from ..models.face_encoding     import FaceEncoding
from ..extensions import db
from config import Config

biometric_bp = Blueprint('biometric', __name__)


@biometric_bp.route('/biometrics/request', methods=['POST'])
def biometrics_request():
    name = request.form.get('name', '').strip()
    if not name:
        return jsonify({"error": "name required"}), 400
    if 'image' not in request.files:
        return jsonify({"error": "image required"}), 400

    # Enforce 5-photo limit BEFORE saving anything
    count = FaceEncoding.query.filter_by(name=name).count()
    if count >= 5:
        return jsonify({
            "success": False,
            "message": "Maximum 5 photos allowed. You have reached the limit."
        }), 400

    unique_filename = f"photo_{int(time.time())}.jpg"
    folder          = os.path.join(Config.PENDING_FACES_DIR, name)
    os.makedirs(folder, exist_ok=True)
    local_path      = os.path.join(folder, unique_filename)
    request.files['image'].save(local_path)

    # ── Upload to Supabase ──
    from ..utils.supabase_storage import supabase_storage
    remote_path = f"{name}/{unique_filename}"
    supabase_storage.upload_file("pending-faces", remote_path, local_path)

    db.session.add(BiometricRequest(name=name, photo=unique_filename, status='pending'))
    db.session.commit()

    return jsonify({"success": True, "status": "pending"})


@biometric_bp.route('/biometrics/count', methods=['GET'])
def biometrics_count():
    name = request.args.get('name', '').strip()
    if not name:
        return jsonify({"error": "name required"}), 400
    try:
        count = FaceEncoding.query.filter_by(name=name).count()
        return jsonify({"count": count, "max": 5})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@biometric_bp.route('/biometrics/status', methods=['GET'])
def biometrics_status():
    name = request.args.get('name', '').strip()
    if not name:
        return jsonify({"error": "name required"}), 400

    row = (BiometricRequest.query
           .filter_by(name=name)
           .order_by(BiometricRequest.id.desc())
           .first())

    if not row:
        return jsonify({"status": "none"})
    return jsonify({"status": row.status, "timestamp": row.timestamp})