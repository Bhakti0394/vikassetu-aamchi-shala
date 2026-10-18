from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Child, Activity, Observation
from app.schemas import ObservationCreate, ObservationUpdate, ObservationResponse
from app.services import generate_observation_id, current_utc_iso, recalculate_child_scores

router = APIRouter(prefix="/api/observations", tags=["Observations"])

@router.get("", response_model=List[ObservationResponse])
def get_observations(
    child_id: Optional[str] = None,
    include_baseline: bool = False,
    db: Session = Depends(get_db)
):
    query = db.query(Observation)
    if child_id:
        query = query.filter(Observation.child_id == child_id)
    if not include_baseline:
        query = query.filter(Observation.is_baseline == False)

    return query.order_by(Observation.date.desc(), Observation.id.desc()).all()

@router.post("", response_model=ObservationResponse, status_code=status.HTTP_201_CREATED)
def create_observation(payload: ObservationCreate, db: Session = Depends(get_db)):
    # 1. Verify child exists
    child = db.query(Child).filter(Child.id == payload.child_id).first()
    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Child '{payload.child_id}' not found"
        )

    # 2. Verify activity exists
    activity = db.query(Activity).filter(Activity.id == payload.activity_id).first()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity '{payload.activity_id}' not found"
        )

    # 3. Verify domain matching
    if activity.domain != payload.domain:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Activity '{activity.id}' domain '{activity.domain}' does not match observation domain '{payload.domain}'"
        )

    # 4. Create observation
    obs_id = generate_observation_id()
    new_obs = Observation(
        id=obs_id,
        child_id=payload.child_id,
        domain=payload.domain,
        activity_id=payload.activity_id,
        score=payload.score,
        note=payload.note,
        date=current_utc_iso(),
        is_baseline=False,
    )
    db.add(new_obs)
    db.commit()
    db.refresh(new_obs)

    # 5. Re-run score derivation for the child
    recalculate_child_scores(child, db)

    return new_obs

@router.put("/{id}", response_model=ObservationResponse)
def update_observation(id: str, payload: ObservationUpdate, db: Session = Depends(get_db)):
    obs = db.query(Observation).filter(Observation.id == id).first()
    if not obs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation '{id}' not found"
        )

    # Merged validation for domain and activity
    merged_domain = payload.domain if payload.domain is not None else obs.domain
    merged_activity_id = payload.activity_id if payload.activity_id is not None else obs.activity_id

    activity = db.query(Activity).filter(Activity.id == merged_activity_id).first()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity '{merged_activity_id}' not found"
        )

    if activity.domain != merged_domain:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Activity '{activity.id}' domain '{activity.domain}' does not match merged observation domain '{merged_domain}'"
        )

    # Apply updates
    if payload.domain is not None:
        obs.domain = payload.domain
    if payload.activity_id is not None:
        obs.activity_id = payload.activity_id
    if payload.score is not None:
        obs.score = payload.score
    if payload.note is not None:
        obs.note = payload.note

    db.add(obs)
    db.commit()
    db.refresh(obs)

    # Re-run score derivation for the child
    child = db.query(Child).filter(Child.id == obs.child_id).first()
    if child:
        recalculate_child_scores(child, db)

    return obs

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_observation(id: str, db: Session = Depends(get_db)):
    obs = db.query(Observation).filter(Observation.id == id).first()
    if not obs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Observation '{id}' not found"
        )

    child_id = obs.child_id
    db.delete(obs)
    db.commit()

    # Re-run score derivation after deletion
    child = db.query(Child).filter(Child.id == child_id).first()
    if child:
        recalculate_child_scores(child, db)

    return Response(status_code=status.HTTP_204_NO_CONTENT)
