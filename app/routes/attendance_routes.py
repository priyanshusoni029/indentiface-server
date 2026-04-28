import calendar
from datetime import datetime
from flask import Blueprint, request, jsonify
from ..models.attendance import Attendance
from ..extensions import db

attendance_bp = Blueprint('attendance', __name__)


def _time_from_timestamp(ts: str):
    """Extract HH:MM:SS from a full timestamp string."""
    try:
        return datetime.strptime(ts, "%Y-%m-%d %H:%M:%S").strftime("%H:%M:%S")
    except Exception:
        return None


@attendance_bp.route('/attendance/stats', methods=['GET'])
def attendance_stats():
    name  = request.args.get('name', '').strip()
    month = request.args.get('month', datetime.now().strftime('%Y-%m'))

    if not name:
        return jsonify({"error": "name required"}), 400

    try:
        year, mon = map(int, month.split('-'))
    except ValueError:
        return jsonify({"error": "month must be YYYY-MM"}), 400

    try:
        rows = (Attendance.query
                .filter(Attendance.name == name,
                        Attendance.date.like(f"{month}%"))
                .order_by(Attendance.date)
                .all())

        today_str    = datetime.now().strftime("%Y-%m-%d")
        today_record = Attendance.query.filter_by(name=name, date=today_str).first()

        _, total_days = calendar.monthrange(year, mon)
        today_date    = datetime.now().date()
        working_days  = sum(
            1 for d in range(1, total_days + 1)
            if datetime(year, mon, d).date() <= today_date
        )

        onsite  = sum(1 for r in rows if r.location_type == 'onsite')
        remote  = sum(1 for r in rows if r.location_type == 'remote')
        present = onsite + remote
        absent  = max(0, working_days - present)

        def pct(n):
            return round(n / working_days * 100) if working_days > 0 else 0

        return jsonify({
            "name":         name,
            "month":        month,
            "working_days": working_days,
            "onsite":       onsite,
            "remote":       remote,
            "absent":       absent,
            "onsite_pct":   pct(onsite),
            "remote_pct":   pct(remote),
            "absent_pct":   pct(absent),
            "today_marked": today_record is not None,
            "today_time":   _time_from_timestamp(today_record.timestamp) if today_record else None,
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@attendance_bp.route('/attendance/history', methods=['GET'])
def attendance_history():
    name = request.args.get('name', '').strip()
    if not name:
        return jsonify({"error": "name required"}), 400
    try:
        rows = (Attendance.query
                .filter_by(name=name)
                .order_by(Attendance.timestamp.desc())
                .all())
        return jsonify([
            {"date": r.date, "time": _time_from_timestamp(r.timestamp), "type": r.location_type}
            for r in rows
        ])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@attendance_bp.route('/attendance/heatmap', methods=['GET'])
def attendance_heatmap():
    name  = request.args.get('name', '').strip()
    month = request.args.get('month', datetime.now().strftime('%Y-%m'))

    if not name:
        return jsonify({"error": "name required"}), 400

    try:
        rows = (Attendance.query
                .filter(Attendance.name == name,
                        Attendance.date.like(f"{month}%"))
                .all())
        days = {r.date: r.location_type for r in rows}
        return jsonify({"name": name, "month": month, "days": days})
    except Exception as e:
        return jsonify({"error": str(e)}), 500