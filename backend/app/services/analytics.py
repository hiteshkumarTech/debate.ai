"""
Analytics and leaderboard aggregation, computed from completed sessions in
the database. The streak/average/weekly logic mirrors the frontend's
debateHistory.js so numbers match what users already saw client-side.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session as DBSession

from app.models.entities import Session as SessionModel, User


def _completed(db: DBSession, user_id: int) -> list[SessionModel]:
    return (
        db.query(SessionModel)
        .filter(
            SessionModel.user_id == user_id,
            SessionModel.status == "completed",
            SessionModel.score_overall.isnot(None),
        )
        .all()
    )


def _as_utc(dt: datetime) -> datetime:
    # Stored datetimes may be naive (SQLite) — treat them as UTC.
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def compute_streak(sessions: list[SessionModel]) -> int:
    if not sessions:
        return 0
    days = sorted(
        {
            _as_utc(s.completed_at or s.created_at).date()
            for s in sessions
        },
        reverse=True,
    )
    today = datetime.now(timezone.utc).date()
    if days[0] != today and days[0] != today - timedelta(days=1):
        return 0
    streak = 1
    for i in range(len(days) - 1):
        if days[i] - days[i + 1] == timedelta(days=1):
            streak += 1
        else:
            break
    return streak


def compute_weekly(sessions: list[SessionModel], weeks: int = 5) -> list[dict]:
    now = datetime.now(timezone.utc)
    out = []
    for i in range(weeks - 1, -1, -1):
        start = (now - timedelta(days=i * 7 + now.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        end = start + timedelta(days=7)
        in_week = [
            s for s in sessions if start <= _as_utc(s.completed_at or s.created_at) < end
        ]
        avg = (
            round(sum(s.score_overall for s in in_week) / len(in_week))
            if in_week
            else None
        )
        out.append({"label": f"Wk {weeks - i}", "average": avg, "count": len(in_week)})
    return out


def compute_analytics(db: DBSession, user_id: int) -> dict:
    sessions = _completed(db, user_id)
    total = len(sessions)
    debates = sum(1 for s in sessions if s.kind == "debate")
    interviews = sum(1 for s in sessions if s.kind == "interview")
    avg = round(sum(s.score_overall for s in sessions) / total) if total else 0

    by_topic = defaultdict(list)
    for s in sessions:
        by_topic[s.topic].append(s.score_overall)
    topic_avgs = [
        (topic, sum(scores) / len(scores)) for topic, scores in by_topic.items()
    ]
    topic_avgs.sort(key=lambda x: x[1], reverse=True)
    strongest = topic_avgs[0][0] if topic_avgs else None
    weakest = topic_avgs[-1][0] if topic_avgs else None

    return {
        "total_sessions": total,
        "total_debates": debates,
        "total_interviews": interviews,
        "average_score": avg,
        "streak_days": compute_streak(sessions),
        "strongest_topic": strongest,
        "weakest_topic": weakest,
        "weekly": compute_weekly(sessions),
    }


# Placeholder competitors for the leaderboard until there's a real user
# pool. Mirrors the frontend's labeled sample data.
_PLACEHOLDERS = [
    ("Aarav S.", 94, 51), ("Mei L.", 91, 43), ("Diego R.", 88, 38),
    ("Fatima K.", 85, 47), ("Jonas W.", 82, 29), ("Priya N.", 79, 33),
    ("Sam O.", 76, 22), ("Lena M.", 73, 26), ("Tariq B.", 70, 19),
    ("Chloe D.", 67, 24),
]


def compute_leaderboard(db: DBSession, current_user_id: int) -> dict:
    """
    Real version: ranks ALL users by their average completed-session score.
    Until there are multiple real users, blends the current user's real
    average into the labeled placeholder field so the board looks alive.
    """
    # Real users with at least one completed, scored session.
    rows = []
    users = db.query(User).all()
    for u in users:
        sessions = _completed(db, u.id)
        if not sessions:
            continue
        avg = round(sum(s.score_overall for s in sessions) / len(sessions))
        rows.append(
            {
                "name": u.display_name or (u.email.split("@")[0] if u.email else "User"),
                "score": avg,
                "sessions": len(sessions),
                "is_current_user": u.id == current_user_id,
                "_real": True,
            }
        )

    # If the only real player is the current user (or none), pad with
    # clearly-labeled placeholders so the board isn't a lonely single row.
    real_others = [r for r in rows if not r["is_current_user"]]
    if len(real_others) == 0:
        for name, score, sessions in _PLACEHOLDERS:
            rows.append(
                {
                    "name": name,
                    "score": score,
                    "sessions": sessions,
                    "is_current_user": False,
                    "_real": False,
                }
            )

    rows.sort(key=lambda r: r["score"], reverse=True)
    for i, r in enumerate(rows):
        r["rank"] = i + 1

    current_rank = next(
        (r["rank"] for r in rows if r["is_current_user"]), None
    )
    # Strip internal flag before returning.
    for r in rows:
        r.pop("_real", None)

    return {"rows": rows, "current_user_rank": current_rank}
