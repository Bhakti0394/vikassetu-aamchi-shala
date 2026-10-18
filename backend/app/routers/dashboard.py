from datetime import datetime
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Child, Observation, Attendance
from app.schemas import DashboardSummaryResponse
from app.services import DOMAIN_KEYS

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(db: Session = Depends(get_db)):
    # 1. Date calculation strictly in Asia/Kolkata timezone
    today_kolkata = datetime.now(ZoneInfo("Asia/Kolkata")).strftime("%Y-%m-%d")

    # 2. Total children count
    total_children = db.query(Child).count()

    # 3. Present today count
    present_today = (
        db.query(Attendance)
        .filter(Attendance.date == today_kolkata, Attendance.present == True)
        .count()
    )

    # 4. Activities done: count non-baseline observations only
    activities_done = (
        db.query(Observation)
        .filter(Observation.is_baseline == False)
        .count()
    )

    # 5. Attention list & domain distribution (evaluating observed domains only)
    all_children = db.query(Child).all()

    attention_pairs = []
    domain_distribution = {d: {1: 0, 2: 0, 3: 0} for d in DOMAIN_KEYS}

    for child in all_children:
        obs_domains = child.observed_domains  # domains with at least one observation

        # Attention check: at least one observed domain has latest score == 1
        if any(child.scores.get(d) == 1 for d in obs_domains):
            avg_obs_score = (
                sum(child.scores.get(d, 1) for d in obs_domains) / len(obs_domains)
                if obs_domains else 3.0
            )
            attention_pairs.append((avg_obs_score, child))

        # Tally domain distribution for observed domains only
        for d in obs_domains:
            score = child.scores.get(d)
            if score in (1, 2, 3):
                domain_distribution[d][score] += 1

    # Sort attention list by lowest average score among observed domains
    attention_pairs.sort(key=lambda x: x[0])
    attention_list = [pair[1] for pair in attention_pairs]
    needs_attention_count = len(attention_list)

    return {
        "total_children": total_children,
        "present_today": present_today,
        "needs_attention_count": needs_attention_count,
        "activities_done": activities_done,
        "attention_list": attention_list,
        "domain_distribution": domain_distribution,
    }
