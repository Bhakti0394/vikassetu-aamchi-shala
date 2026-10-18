import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Child, Activity, Observation, ActivityLog
from app.ai_recommendations import (
    generate_ai_recommendation,
    build_deterministic_item,
    get_groq_api_key,
    get_groq_model,
    ChildRecommendationResult,
    RecommendationPedagogy,
)

logger = logging.getLogger("vikassetu.recommendations")

router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])

class ClientChildData(BaseModel):
    id: str
    name: str
    age: Optional[float] = 4.0
    strengths: Optional[List[str]] = []
    needs: Optional[List[str]] = []
    scores: Optional[dict] = {}

class ClientObservation(BaseModel):
    id: Optional[str] = None
    child_id: Optional[str] = None
    childId: Optional[str] = None
    domain: str
    score: Optional[int] = None
    note: Optional[str] = None
    date: Optional[str] = None

class ClientTrial(BaseModel):
    activity_id: Optional[str] = None
    activityId: Optional[str] = None
    outcome: str
    note: Optional[str] = None
    completed_steps: Optional[int] = None
    total_steps: Optional[int] = None
    created_at: Optional[str] = None

class PersonalizedRecommendationRequest(BaseModel):
    child_id: str
    limit_domains: int = 2
    child_data: Optional[ClientChildData] = None
    observations: Optional[List[ClientObservation]] = None
    recent_trials: Optional[List[ClientTrial]] = None

class AIStatusResponse(BaseModel):
    configured: bool
    model: str
    engine: str = "Groq Hybrid Recommendation Engine"

@router.get("/status", response_model=AIStatusResponse)
def get_ai_status():
    """Returns AI readiness status without exposing any credentials."""
    key = get_groq_api_key()
    return AIStatusResponse(
        configured=bool(key),
        model=get_groq_model(),
    )

@router.post("/personalized", response_model=ChildRecommendationResult)
async def get_personalized_recommendations(
    payload: PersonalizedRecommendationRequest,
    db: Session = Depends(get_db),
):
    """
    Generates personalized, observation-driven learning recommendations for a child.
    Combines database records with Groq LLM pedagogical reasoning and client evidence.
    Falls back gracefully to deterministic pedagogical rules if AI is unavailable.
    """
    child = db.query(Child).filter(Child.id == payload.child_id).first()
    if not child and payload.child_data:
        child = Child(
            id=payload.child_data.id,
            name=payload.child_data.name,
            age=payload.child_data.age or 4.0,
            strengths=payload.child_data.strengths or [],
            needs=payload.child_data.needs or [],
            scores=payload.child_data.scores or {},
        )
    elif not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Child '{payload.child_id}' not found",
        )

    db_observations = (
        db.query(Observation)
        .filter(Observation.child_id == child.id)
        .order_by(Observation.date.desc(), Observation.id.desc())
        .all()
    )

    # Activity trial logs from DB
    db_logs = (
        db.query(ActivityLog)
        .filter(ActivityLog.child_id == child.id)
        .order_by(ActivityLog.created_at.desc(), ActivityLog.id.desc())
        .all()
    )

    # Merge observations from DB and client payload
    merged_observations = []
    seen_obs_ids = set()
    seen_signatures = set()

    if payload.observations:
        for co in payload.observations:
            # Strictly filter client observations to the requested child to prevent data leakage
            if (co.child_id and co.child_id != payload.child_id) or (co.childId and co.childId != payload.child_id):
                continue
            obs_id = co.id or f"client_{len(merged_observations)}"
            seen_obs_ids.add(obs_id)
            sig = (co.domain, (co.note or "").strip().lower(), (co.date or "")[:10])
            seen_signatures.add(sig)
            merged_observations.append({
                "id": obs_id,
                "domain": co.domain,
                "score": co.score,
                "note": co.note,
                "date": co.date or datetime.now(timezone.utc).isoformat(),
            })

    for do in db_observations:
        sig = (do.domain, (do.note or "").strip().lower(), (do.date or "")[:10])
        if do.id in seen_obs_ids or (sig in seen_signatures and do.note and do.note.strip().lower() != "baseline"):
            continue
        merged_observations.append({
            "id": do.id,
            "domain": do.domain,
            "score": do.score,
            "note": do.note,
            "date": do.date,
        })

    # Merge activity trial logs
    logs_data = []
    seen_trial_keys = set()

    if payload.recent_trials:
        for ct in payload.recent_trials:
            act_id = ct.activity_id or ct.activityId or ""
            key = f"{act_id}_{(ct.created_at or '')[:19]}_{ct.outcome}"
            seen_trial_keys.add(key)
            if ct.note:
                seen_trial_keys.add(f"{act_id}_{ct.outcome}_{(ct.note or '').strip().lower()}")
            c_steps = ct.completed_steps
            t_steps = ct.total_steps
            if c_steps is None:
                db_match = next((dl for dl in db_logs if dl.activity_id == act_id and dl.outcome == ct.outcome), None)
                if db_match:
                    c_steps = db_match.completed_steps
                    t_steps = db_match.total_steps
            logs_data.append({
                "activity_id": act_id,
                "outcome": ct.outcome,
                "note": ct.note,
                "completed_steps": c_steps if c_steps is not None else (3 if ct.outcome == "tried_helped" else 0),
                "total_steps": t_steps if t_steps is not None else 3,
                "created_at": ct.created_at or datetime.now(timezone.utc).isoformat(),
            })

    for dl in db_logs:
        exact_key = f"{dl.activity_id}_{(dl.created_at or '')[:19]}_{dl.outcome}"
        loose_key = f"{dl.activity_id}_{dl.outcome}_{(dl.note or '').strip().lower()}" if dl.note else None
        if exact_key in seen_trial_keys or (loose_key and loose_key in seen_trial_keys):
            continue
        logs_data.append({
            "activity_id": dl.activity_id,
            "outcome": dl.outcome,
            "note": dl.note,
            "completed_steps": dl.completed_steps,
            "total_steps": dl.total_steps,
            "created_at": dl.created_at,
        })

    if not merged_observations and not logs_data:
        # Truly no observations or activity trials recorded yet
        return ChildRecommendationResult(
            child_id=child.id,
            recommendations=[],
            generated_at=datetime.now(timezone.utc).isoformat(),
            model_used=get_groq_model(),
            fallback=False,
            fallback_reason="No observations recorded yet. First observations pending.",
        )

    # Find latest score and evidence per domain
    domain_order = ["alphabet", "numbers", "colours", "art", "stories"]
    latest_scores = {}
    explicit_scores = {}
    domain_evidence = {d: [] for d in domain_order}

    for obs in merged_observations:
        dom = obs["domain"]
        if dom not in domain_order:
            continue
        raw_s = obs.get("score")
        if raw_s is not None and dom not in explicit_scores:
            explicit_scores[dom] = raw_s

        # Rule: Do not discard an observation merely because an assessment score is missing.
        # Fall back to child profile baseline score or 1 as contextual evidence.
        s = raw_s
        if s is None:
            child_scores = child.scores if isinstance(child.scores, dict) else {}
            s = child_scores.get(dom, 1)

        if dom not in latest_scores:
            latest_scores[dom] = s

        note = obs.get("note")
        if note and note.strip() and note.strip().lower() != "baseline":
            if note.strip() not in domain_evidence[dom]:
                domain_evidence[dom].append(note.strip())

    # Incorporate activity trial logs as classroom evidence
    for l in logs_data:
        act = db.query(Activity).filter(Activity.id == l["activity_id"]).first()
        if act and act.domain in domain_evidence:
            outcome_text = (
                "helped"
                if l["outcome"] == "tried_helped"
                else ("needed support" if l["outcome"] == "tried_needs_support" else "not tried")
            )
            trial_evidence = f"Tried {act.name} ({l.get('completed_steps', 0)}/{l.get('total_steps', 3)} steps, outcome: {outcome_text})"
            if l.get("note"):
                trial_evidence += f": {l['note']}"
            if trial_evidence not in domain_evidence[act.domain]:
                domain_evidence[act.domain].append(trial_evidence)
            if act.domain not in latest_scores:
                latest_scores[act.domain] = 2 if l["outcome"] == "tried_helped" else 1

    # 1. Weakest assessed domains (score < 3, prioritized: score 1 over score 2)
    weak_domains = []
    for d in domain_order:
        s = latest_scores.get(d)
        if s is not None and s < 3:
            weak_domains.append({"domain": d, "score": s, "is_exploratory": False})

    weak_domains.sort(key=lambda x: (x["score"], domain_order.index(x["domain"])))
    selected_domains = weak_domains[: payload.limit_domains]

    # 2. If all assessed domains are score 3 (e.g. Yash with Level 3, or all 5 at Level 3):
    # Offer Level 3 creative extension / peer leadership in observed domains
    if not selected_domains and latest_scores:
        for d in domain_order:
            if d in latest_scores and not any(sd["domain"] == d for sd in selected_domains):
                selected_domains.append({"domain": d, "score": 3, "is_exploratory": False})
                if len(selected_domains) >= payload.limit_domains:
                    break

    # 3. If child has no observations, or fewer than limit, pull in unobserved domains with baseline needs
    if len(selected_domains) < payload.limit_domains and not latest_scores:
        unobserved = [d for d in domain_order if d not in latest_scores]
        if unobserved:
            unobserved_needs = []
            for d in unobserved:
                child_scores = child.scores if isinstance(child.scores, dict) else {}
                b_score = child_scores.get(d, 1)
                unobserved_needs.append({"domain": d, "score": b_score, "is_exploratory": True})
            unobserved_needs.sort(key=lambda x: (x["score"], domain_order.index(x["domain"])))
            for un_need in unobserved_needs:
                if len(selected_domains) >= payload.limit_domains:
                    break
                selected_domains.append(un_need)

    # All activities from DB
    all_activities = db.query(Activity).all()
    activities_by_domain = {}
    for act in all_activities:
        act_dict = {
            "id": act.id,
            "name": act.name,
            "domain": act.domain,
            "difficulty": act.difficulty,
            "minutes": act.minutes,
            "emoji": act.emoji,
            "skills": act.skills or [],
            "steps": act.steps or [],
            "for_level": act.for_level or [],
        }
        activities_by_domain.setdefault(act.domain, []).append(act_dict)

    had_support_need = any(l["outcome"] == "tried_needs_support" for l in logs_data)

    recommendations: List[RecommendationPedagogy] = []
    is_any_fallback = False

    for target in selected_domains:
        domain = target["domain"]
        score = target["score"]
        is_exploratory = target.get("is_exploratory", False)

        candidates = [
            a for a in activities_by_domain.get(domain, [])
            if score in a.get("for_level", [])
        ]
        if not candidates:
            candidates = activities_by_domain.get(domain, [])
        if not candidates:
            continue

        # Smart Evidence-Aware Candidate Rotation:
        cand_stats = []
        for cand in candidates:
            c_logs = [l for l in logs_data if l["activity_id"] == cand["id"]]
            helped = any(l["outcome"] == "tried_helped" for l in c_logs)
            needs_support = bool(c_logs and c_logs[0]["outcome"] == "tried_needs_support")
            cand_stats.append({
                "cand": cand,
                "trial_count": len(c_logs),
                "helped": helped,
                "needs_support": needs_support,
            })

        # Separate unmastered candidates from helped candidates
        unmastered = [cs for cs in cand_stats if not cs["helped"]]
        pool_stats = unmastered if unmastered else cand_stats

        # Sort pool:
        # 1. Easy difficulty first if support needed
        # 2. Fewer trial counts first (rotates so untried activities get presented)
        pool_stats.sort(key=lambda cs: (
            0 if (had_support_need and cs["cand"].get("difficulty") == "Easy") else 1,
            cs["trial_count"],
        ))

        sorted_candidates = [cs["cand"] for cs in pool_stats]

        evidence_list = domain_evidence.get(domain, [])
        child_strengths = child.strengths or []
        child_needs = child.needs or []

        rec_item = await generate_ai_recommendation(
            child_id=child.id,
            domain=domain,
            score=score,
            candidate_activities=sorted_candidates,
            evidence_notes=evidence_list,
            child_strengths=child_strengths,
            child_needs=child_needs,
            recent_logs=logs_data,
        )

        if not rec_item.is_ai_generated:
            is_any_fallback = True

        recommendations.append(rec_item)

    return ChildRecommendationResult(
        child_id=child.id,
        recommendations=recommendations,
        generated_at=datetime.now(timezone.utc).isoformat(),
        model_used=get_groq_model(),
        fallback=is_any_fallback,
        fallback_reason="Used deterministic fallback" if is_any_fallback else None,
    )
