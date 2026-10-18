from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Child, Activity, ActivityLog
from app.schemas import ActivityLogCreate, ActivityLogResponse
from app.services import current_utc_iso

router = APIRouter(prefix="/api/activity-logs", tags=["Activity Logs"])

@router.get("", response_model=List[ActivityLogResponse])
def get_activity_logs(child_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(ActivityLog)
    if child_id:
        query = query.filter(ActivityLog.child_id == child_id)
    return query.order_by(ActivityLog.created_at.desc(), ActivityLog.id.desc()).all()

@router.post("", response_model=ActivityLogResponse, status_code=status.HTTP_201_CREATED)
def create_activity_log(payload: ActivityLogCreate, db: Session = Depends(get_db)):
    child = db.query(Child).filter(Child.id == payload.child_id).first()
    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Child '{payload.child_id}' not found"
        )

    activity = db.query(Activity).filter(Activity.id == payload.activity_id).first()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity '{payload.activity_id}' not found"
        )

    # Idempotency check: prevent duplicate activity logs on repeated online events or retries
    existing = (
        db.query(ActivityLog)
        .filter(
            ActivityLog.child_id == payload.child_id,
            ActivityLog.activity_id == payload.activity_id,
            ActivityLog.completed_steps == payload.completed_steps,
            ActivityLog.total_steps == payload.total_steps,
            ActivityLog.outcome == payload.outcome,
            ActivityLog.note == payload.note,
        )
        .order_by(ActivityLog.created_at.desc(), ActivityLog.id.desc())
        .first()
    )
    if existing:
        return existing

    new_log = ActivityLog(
        child_id=payload.child_id,
        activity_id=payload.activity_id,
        completed_steps=payload.completed_steps,
        total_steps=payload.total_steps,
        outcome=payload.outcome,
        note=payload.note,
        created_at=current_utc_iso(),
    )
    db.add(new_log)
    db.commit()
    db.refresh(new_log)
    return new_log
