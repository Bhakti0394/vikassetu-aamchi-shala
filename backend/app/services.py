import re
import secrets
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models import Child, Observation, Activity

DOMAIN_KEYS = ["alphabet", "numbers", "colours", "art", "stories"]
DOMAIN_NAMES = {
    "alphabet": "Alphabet & Language",
    "numbers": "Numbers & Counting",
    "colours": "Colours & Shapes",
    "art": "Art & Creativity",
    "stories": "Stories, Habits & Games",
}

AVATARS = ["👦🏽", "👧🏽", "🧒🏽", "👧🏾", "👦🏾"]

def generate_child_id(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    if not slug:
        slug = "child"
    return f"{slug}-{secrets.token_hex(2)}"

def generate_observation_id() -> str:
    return f"obs-{uuid.uuid4().hex[:10]}"

def current_utc_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def recalculate_child_scores(child: Child, db: Session) -> Child:
    """
    Score derivation rule:
    Queries all observations for this child ordered by date desc, id desc.
    - If a domain has observations, use the latest observation's score.
    - If a domain has NO observations, reset its score to 1 and remove its strengths/needs entries.
    - If the child has 0 observations across all domains, set needs=["First observations pending"].
    """
    observations = (
        db.query(Observation)
        .filter(Observation.child_id == child.id)
        .order_by(Observation.date.desc(), Observation.id.desc())
        .all()
    )

    latest_scores = {}
    for obs in observations:
        if obs.domain not in latest_scores:
            latest_scores[obs.domain] = obs.score

    new_scores = {}
    strengths = []
    needs = []

    for d in DOMAIN_KEYS:
        d_name = DOMAIN_NAMES[d]
        if d in latest_scores:
            score = latest_scores[d]
            new_scores[d] = score
            if score == 3:
                strengths.append(f"Doing well in {d_name}")
            else:
                needs.append(f"More practice in {d_name}")
        else:
            new_scores[d] = 1

    if not latest_scores:
        needs = ["First observations pending"]

    # Reassign JSON fields to ensure SQLAlchemy flags them as modified
    child.scores = dict(new_scores)
    child.strengths = list(strengths)
    child.needs = list(needs)

    db.add(child)
    db.commit()
    db.refresh(child)
    return child
