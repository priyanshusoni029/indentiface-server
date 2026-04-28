from datetime import datetime
from ..extensions import db


class BiometricRequest(db.Model):
    __tablename__ = 'biometric_requests'

    id        = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name      = db.Column(db.Text,    nullable=False)
    photo     = db.Column(db.Text)
    status    = db.Column(db.Text,    default='pending')
    timestamp = db.Column(db.Text,    default=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    reviewed  = db.Column(db.Text)