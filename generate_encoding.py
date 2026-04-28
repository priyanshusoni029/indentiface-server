import os
import face_recognition
import numpy as np
import hashlib
from app import create_app
from app.extensions import db
from app.models.face_encoding import FaceEncoding
from app.utils.supabase_storage import supabase_storage
from config import Config

def get_file_hash(filepath):
    """MD5 hash of the file - used to detect new/changed images."""
    hasher = hashlib.md5()
    try:
        with open(filepath, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b''):
                hasher.update(chunk)
        return hasher.hexdigest()
    except Exception as e:
        print(f"Error reading file {filepath}: {str(e)}")
        return None

def sync_encodings_with_supabase():
    app = create_app()
    with app.app_context():
        print("--- Starting Sync with Supabase Storage ---")
        
        # 1. Get all files from 'known-faces' bucket
        # Note: Supabase storage list is usually limited to 100 per call, 
        # but we'll assume a reasonable number for now.
        try:
            # We list the root folders (person names)
            buckets = supabase_storage.client.storage.from_("known-faces").list()
            if not buckets:
                print("No files found in known-faces bucket.")
                return

            for folder in buckets:
                person_name = folder['name']
                if folder.get('id') is None: # It's a folder
                    files = supabase_storage.client.storage.from_("known-faces").list(person_name)
                    for file_info in files:
                        filename = file_info['name']
                        if not filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                            continue
                            
                        remote_path = f"{person_name}/{filename}"
                        local_dir = os.path.join(Config.KNOWN_FACES_DIR, person_name)
                        os.makedirs(local_dir, exist_ok=True)
                        local_path = os.path.join(local_dir, filename)
                        
                        # Download if not exists locally or to ensure fresh copy
                        print(f"Checking {remote_path}...")
                        if supabase_storage.download_file("known-faces", remote_path, local_path):
                            file_hash = get_file_hash(local_path)
                            if not file_hash: continue
                            
                            # Check if already in DB
                            existing = FaceEncoding.query.filter_by(file_hash=file_hash).first()
                            if existing:
                                if existing.name != person_name:
                                    print(f"Updating name for {filename}: {existing.name} -> {person_name}")
                                    existing.name = person_name
                                    db.session.commit()
                            else:
                                # Generate encoding
                                print(f"Encoding new face: {remote_path}")
                                try:
                                    image = face_recognition.load_image_file(local_path)
                                    encodings = face_recognition.face_encodings(image)
                                    if encodings:
                                        encoding_blob = np.array(encodings[0], dtype=np.float64).tobytes()
                                        new_encoding = FaceEncoding(
                                            name=person_name,
                                            filename=remote_path,
                                            file_hash=file_hash,
                                            encoding=encoding_blob
                                        )
                                        db.session.add(new_encoding)
                                        db.session.commit()
                                        print(f"Successfully saved encoding for {person_name}")
                                    else:
                                        print(f"No face detected in {local_path}")
                                except Exception as e:
                                    print(f"Error encoding {local_path}: {e}")
                            
                            # Clean up local file to keep container light
                            # os.remove(local_path) 
        except Exception as e:
            print(f"Sync error: {e}")

if __name__ == "__main__":
    sync_encodings_with_supabase()