import os
from datetime import timedelta

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class Config:
    # ── Flask ──
    SECRET_KEY                = os.environ.get('SECRET_KEY', 'your-secret-key-here')
    SESSION_PERMANENT         = True
    PERMANENT_SESSION_LIFETIME = timedelta(hours=8)
    
    # ── Supabase Storage ──
    SUPABASE_URL = os.environ.get('SUPABASE_URL')
    SUPABASE_KEY = os.environ.get('SUPABASE_KEY')

    # ── SQLAlchemy ──
    # Check for Supabase/PostgreSQL URL first, fallback to local SQLite
    _db_url = os.environ.get('DATABASE_URL')
    if _db_url and _db_url.startswith('postgres://'):
        _db_url = _db_url.replace('postgres://', 'postgresql://', 1)
        
    SQLALCHEMY_DATABASE_URI = _db_url or f"sqlite:///{os.path.join(BASE_DIR, 'attendance.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ── Admin credentials (use env vars in production) ──
    ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', '12345678')

    # ── Face Recognition ──
    LINE_Y             = 300
    ENTRANCE_DIRECTION = "up"
    MAX_RETRY_ATTEMPTS = 3
    K_NEIGHBORS        = 3
    COSINE_THRESHOLD   = 0.91
    KNN_VOTE_THRESHOLD = 2
    MAX_IMAGE_DIM      = 640

    # ── Paths ──
    BASE_DIR           = BASE_DIR
    KNOWN_FACES_DIR    = os.path.join(BASE_DIR, 'known_faces')
    PENDING_FACES_DIR  = os.path.join(BASE_DIR, 'pending_faces')
    PROFILE_PHOTOS_DIR = os.path.join(BASE_DIR, 'profile_photos')
    ENCODER_SCRIPT        = os.path.join(BASE_DIR, 'generate_encoding.py')