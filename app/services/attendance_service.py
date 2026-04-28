"""
Attendance service.
All attendance write logic lives here — routes only call these functions.
"""

from datetime import datetime
from ..extensions import db
from ..models.attendance import Attendance, EntryLog


def is_already_marked_today(name: str) -> bool:
    today = datetime.now().strftime("%Y-%m-%d")
    return Attendance.query.filter_by(name=name, date=today).first() is not None


def save_attendance(name: str, location_type: str = 'remote') -> bool:
    try:
        now    = datetime.now()
        dt_str = now.strftime("%Y-%m-%d %H:%M:%S")
        d_str  = now.strftime("%Y-%m-%d")

        entry_num = EntryLog.query.filter_by(name=name, date=d_str).count() + 1
        db.session.add(EntryLog(name=name, timestamp=dt_str, date=d_str, counter=entry_num))

        if not Attendance.query.filter_by(name=name, date=d_str).first():
            db.session.add(Attendance(
                name=name, timestamp=dt_str,
                date=d_str, location_type=location_type
            ))

        db.session.commit()
        print(f"Entry #{entry_num} for {name} at {dt_str} [{location_type}]")
        return True
    except Exception as e:
        db.session.rollback()
        print(f"DB error: {e}")
        return False