from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Activity
from app.schemas import ActivityResponse

router = APIRouter(prefix="/api/activities", tags=["Activities"])

@router.get("", response_model=List[ActivityResponse])
def get_activities(domain: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Activity)
    if domain:
        query = query.filter(Activity.domain == domain)
    return query.all()

@router.get("/{id}", response_model=ActivityResponse)
def get_activity(id: str, db: Session = Depends(get_db)):
    activity = db.query(Activity).filter(Activity.id == id).first()
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Activity '{id}' not found")
    return activity
