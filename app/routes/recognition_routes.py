import cv2
import numpy as np
import face_recognition
from flask import Blueprint, request, jsonify
from ..services.face_service      import resize_for_recognition, recognise_face_vectorized, name_to_image
from ..services.attendance_service import save_attendance

recognition_bp = Blueprint('recognition', __name__)


@recognition_bp.route('/recognize', methods=['POST'])
def recognize():
    if 'image' not in request.files:
        return jsonify({"error": "No image file"}), 400

    img_bytes = request.files['image'].read()
    nparr     = np.frombuffer(img_bytes, np.uint8)
    img       = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return jsonify({"error": "Invalid image format"}), 400

    location_type   = request.form.get('location_type', 'remote')
    mark_attendance = request.form.get('mark_attendance', 'false').lower() == 'true'

    img_small      = resize_for_recognition(img)
    rgb            = cv2.cvtColor(img_small, cv2.COLOR_BGR2RGB)
    face_locations = face_recognition.face_locations(rgb, model='hog')

    if not face_locations:
        return jsonify({"name": "Unknown", "image": None})

    encodings = face_recognition.face_encodings(rgb, known_face_locations=face_locations)
    if not encodings:
        return jsonify({"name": "Unknown", "image": None})

    name, confidence = recognise_face_vectorized(encodings[0])

    if name != "Unknown":
        if mark_attendance:
            save_attendance(name, location_type)
            print(f"Attendance marked: {name} ({confidence:.0%}) [{location_type}]")
        else:
            print(f"Identified (no mark): {name} ({confidence:.0%})")
        image_path = name_to_image.get(name)
        return jsonify({"name": name, "image": image_path})

    return jsonify({"name": "Unknown", "image": None})