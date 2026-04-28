from datetime import datetime
from ..extensions import db


class FaceEncoding(db.Model):
    __tablename__ = 'face_encodings'

    id         = db.Column(db.Integer,      primary_key=True, autoincrement=True)
    name       = db.Column(db.Text,         nullable=False)
    filename   = db.Column(db.Text,         nullable=False)
    file_hash  = db.Column(db.Text,         unique=True, nullable=False)
    encoding   = db.Column(db.LargeBinary,  nullable=False)
    created_at = db.Column(db.Text,         default=lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"))