from ..extensions import db


class Attendance(db.Model):
    __tablename__ = 'attendance'

    id            = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name          = db.Column(db.Text,    nullable=False, index=True)
    timestamp     = db.Column(db.Text,    nullable=False)
    date          = db.Column(db.Text,    nullable=False, index=True)
    location_type = db.Column(db.Text,    nullable=False, default='remote')


class EntryLog(db.Model):
    __tablename__ = 'entry_logs'

    id        = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name      = db.Column(db.Text,    nullable=False, index=True)
    timestamp = db.Column(db.Text,    nullable=False)
    date      = db.Column(db.Text,    nullable=False, index=True)
    counter   = db.Column(db.Integer)