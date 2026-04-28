# ── Live Feed Service (kept for future use — all commented out) ──
#
# Uncomment this entire file when the live feed feature is re-enabled.
# Also uncomment the corresponding routes in utility_routes.py.
#
# import cv2
# from datetime import datetime
# from ultralytics import YOLO
# from config import Config
# from . import face_service
# from .face_service import recognise_face_vectorized
# from .attendance_service import is_already_marked_today, save_attendance
#
# # Camera and YOLO — initialized once at module import
# cap = cv2.VideoCapture(0)
# if not cap.isOpened():
#     raise RuntimeError("Camera not accessible")
#
# model = YOLO("yolov8n.pt")
#
# # Shared state for live feed
# attendance         = []
# counter_ids        = set()
# unregistered_faces = []
#
#
# def generate_frames():
#     global attendance, counter_ids, unregistered_faces
#     failed_attempts = {}
#
#     while True:
#         ret, frame = cap.read()
#         if not ret:
#             break
#
#         results         = model.track(frame, persist=True, classes=[0], verbose=False)
#         annotated_frame = results[0].plot()
#         cv2.line(annotated_frame, (0, Config.LINE_Y),
#                  (annotated_frame.shape[1], Config.LINE_Y), (0, 255, 0), 2)
#
#         if results[0].boxes.id is not None:
#             boxes     = results[0].boxes.xyxy.cpu().numpy()
#             track_ids = results[0].boxes.id.cpu().numpy().astype(int)
#
#             for box, track_id in zip(boxes, track_ids):
#                 x1, y1, x2, y2 = map(int, box)
#                 centroid_y = (y1 + y2) // 2
#                 crossed = (
#                     (Config.ENTRANCE_DIRECTION == "down" and centroid_y > Config.LINE_Y) or
#                     (Config.ENTRANCE_DIRECTION == "up"   and centroid_y < Config.LINE_Y)
#                 )
#                 if not crossed or track_id in counter_ids:
#                     continue
#
#                 person_crop = frame[y1:y2, x1:x2]
#                 if person_crop.size == 0:
#                     continue
#                 h, w = person_crop.shape[:2]
#                 if h < 120 or w < 120:
#                     continue
#
#                 rgb       = cv2.cvtColor(person_crop, cv2.COLOR_BGR2RGB)
#                 import face_recognition
#                 encodings = face_recognition.face_encodings(rgb)
#                 if not encodings:
#                     continue
#
#                 name, confidence = recognise_face_vectorized(encodings[0])
#
#                 if name == "Unknown":
#                     attempts = failed_attempts.get(int(track_id), 0) + 1
#                     failed_attempts[int(track_id)] = attempts
#                     cv2.putText(
#                         annotated_frame,
#                         f"Attempt {attempts}/{Config.MAX_RETRY_ATTEMPTS} ({confidence:.0%})",
#                         (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2
#                     )
#                     if attempts == 1:
#                         unregistered_faces.append({
#                             "track_id": int(track_id),
#                             "time":     datetime.now().strftime("%H:%M:%S"),
#                             "message":  "Unregistered face detected"
#                         })
#                     if attempts >= Config.MAX_RETRY_ATTEMPTS:
#                         del failed_attempts[int(track_id)]
#                 else:
#                     current_time = datetime.now().strftime("%H:%M:%S")
#                     already      = is_already_marked_today(name)
#                     entry = {
#                         "Name":       name,
#                         "Time":       current_time,
#                         "Confidence": f"{confidence:.0%}",
#                         "Status":     "Already Marked" if already else "Present"
#                     }
#                     if not any(x["Name"] == name and x["Status"] == entry["Status"]
#                                for x in attendance):
#                         attendance.append(entry)
#                     save_attendance(name)
#                     counter_ids.add(track_id)
#                     if int(track_id) in failed_attempts:
#                         del failed_attempts[int(track_id)]
#                     text  = (f"Already Marked ({confidence:.0%})"
#                              if already else f"Welcome {name} ({confidence:.0%})")
#                     color = (0, 255, 255) if already else (0, 255, 0)
#                     cv2.putText(annotated_frame, text, (x1, y1 - 10),
#                                 cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
#
#         ret, buffer = cv2.imencode(".jpg", annotated_frame)
#         frame = buffer.tobytes()
#         yield (b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + frame + b"\r\n")