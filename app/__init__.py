from flask import Flask
from .extensions import db, migrate, cors
from config import Config


def create_app(config_class=Config):
    app = Flask(__name__, template_folder='../templates', static_folder='../static')
    app.config.from_object(config_class)

    # ── Init extensions ──
    db.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app)

    # ── Import all models so SQLAlchemy knows about them before create_all ──
    from .models import User, Attendance, EntryLog, FaceEncoding, BiometricRequest, AppSettings  # noqa

    # ── Register blueprints ──
    from .routes.auth_routes        import auth_bp
    from .routes.recognition_routes import recognition_bp
    from .routes.attendance_routes  import attendance_bp
    from .routes.user_routes        import user_bp
    from .routes.biometric_routes   import biometric_bp
    from .routes.admin_routes       import admin_bp
    from .routes.utility_routes     import utility_bp
    from .utils.db_backup           import backup_cli

    app.register_blueprint(auth_bp)
    app.register_blueprint(recognition_bp)
    app.register_blueprint(attendance_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(biometric_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(utility_bp)
    app.register_blueprint(backup_cli)

    with app.app_context():
        db.create_all()
        _seed_default_data()
        # DB BACKUP ( IF CRASHES )

        # Load face data and start background tasks
        from .services.face_service    import reload_face_data
        from .services.encoder_service import start_face_encoder, refresh_face_database_periodically
        reload_face_data()
        start_face_encoder()
        refresh_face_database_periodically(interval_minutes=5)

    return app


def _seed_default_data():
    """Insert default admin user and settings row if they do not exist."""
    import hashlib
    from .models.user         import User
    from .models.app_settings import AppSettings
    from .extensions          import db
    from config               import Config

    if not AppSettings.query.get(1):
        db.session.add(AppSettings(id=1, geofencing_enabled=False, radius_meters=10))

    default_pw = hashlib.sha256('12345678'.encode()).hexdigest()
    if not User.query.filter_by(email='admin@example.com').first():
        db.session.add(User(
            email='admin@example.com',
            password_hash=default_pw,
            name='Admin User',
            status='active'
        ))

    db.session.commit()