import os
from flask import Blueprint, request, jsonify, send_from_directory
from ..models.user import User
from ..services import face_service
from config import Config

user_bp = Blueprint('user', __name__)


@user_bp.route('/user/profile', methods=['GET'])
def user_profile():
    name = request.args.get('name', '').strip()
    if not name:
        return jsonify({"error": "name required"}), 400
    try:
        user = User.query.filter_by(name=name).first()
        if not user:
            return jsonify({"id": None, "email": None, "reg_status": "not_registered"})
        return jsonify({
            "id":         user.id,
            "email":      user.email if user.status == 'active' else None,
            "reg_status": user.status,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@user_bp.route('/user/photo/update', methods=['POST'])
def update_user_photo():
    name = request.form.get('name', '').strip()
    if not name:
        return jsonify({"error": "name required"}), 400
    if 'image' not in request.files:
        return jsonify({"error": "image required"}), 400

    folder     = os.path.join(Config.PROFILE_PHOTOS_DIR, name)
    os.makedirs(folder, exist_ok=True)
    local_path = os.path.join(folder, 'profile.jpg')
    request.files['image'].save(local_path)

    # ── Upload to Supabase ──
    from ..utils.supabase_storage import supabase_storage
    supabase_storage.upload_file("profile-photos", f"{name}/profile.jpg", local_path)

    return jsonify({"success": True})


@user_bp.route('/user/photo', methods=['GET'])
def user_photo():
    name = request.args.get('name', '').strip()
    if not name:
        return jsonify({"image": None}), 400

    from ..utils.supabase_storage import supabase_storage
    
    # 1. Try Profile Photo from Supabase
    try:
        public_url = supabase_storage.get_public_url("profile-photos", f"{name}/profile.jpg")
        # Note: We return it if it exists. 
        # In the future, we could add a check if the file exists using storage.list()
        if public_url:
            return jsonify({"image": public_url})
    except Exception as e:
        print(f"Error fetching profile photo URL: {e}")

    # 2. Fallback to Known Face image
    image_path = face_service.name_to_image.get(name)
    if image_path:
        known_url = supabase_storage.get_public_url("known-faces", image_path)
        if known_url:
            return jsonify({"image": known_url})
        return jsonify({"image": f"known:{image_path}"})

    return jsonify({"image": None})


@user_bp.route('/profile_photo/<path:name>')
def serve_profile_photo(name):
    from ..utils.supabase_storage import supabase_storage
    public_url = supabase_storage.get_public_url("profile-photos", f"{name}/profile.jpg")
    if public_url:
        from flask import redirect
        return redirect(public_url)
    return send_from_directory(os.path.join(Config.PROFILE_PHOTOS_DIR, name), 'profile.jpg')


@user_bp.route('/images/<path:filename>')
def serve_image(filename):
    from ..utils.supabase_storage import supabase_storage
    public_url = supabase_storage.get_public_url("known-faces", filename)
    if public_url:
        from flask import redirect
        return redirect(public_url)
    return send_from_directory(Config.KNOWN_FACES_DIR, filename)