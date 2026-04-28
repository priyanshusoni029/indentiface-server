from ..extensions import db


class AppSettings(db.Model):
    __tablename__ = 'app_settings'

    id                 = db.Column(db.Integer, primary_key=True)
    geofencing_enabled = db.Column(db.Boolean, nullable=False, default=False)
    office_lat         = db.Column(db.Float)
    office_lng         = db.Column(db.Float)
    radius_meters      = db.Column(db.Float,   default=10)