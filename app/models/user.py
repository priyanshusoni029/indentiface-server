from ..extensions import db
from datetime import datetime


class User(db.Model):
    __tablename__ = 'users'

    id            = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email         = db.Column(db.Text,    unique=True, nullable=False)
    password_hash = db.Column(db.Text,    nullable=False)
    name          = db.Column(db.Text,    nullable=False)
    status        = db.Column(db.Text,    nullable=False, default='active')
    fcm_token     = db.Column(db.Text,    nullable=True)  # Firebase Cloud Messaging token
    created_at    = db.Column(db.Text,    nullable=False,
                              default=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))