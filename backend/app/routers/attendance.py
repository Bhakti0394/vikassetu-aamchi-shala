from typing import Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Child, Attendance
from app.schemas import AttendanceRecord, BulkAttendanceCreate, AttendanceMapResponse

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])

@router.get("", response_model=AttendanceMapResponse)
def get_attendance(month: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Attendance)
    if month:
        query = query.filter(Attendance.date.startswith(month))

    records = query.all()
    matrix: Dict[str, Dict[str, bool]] = {}

    for r in records:
        if r.child_id not in matrix:
            matrix[r.child_id] = {}
        matrix[r.child_id][r.date] = r.present

    return {"attendance": matrix}

@router.post("", response_model=AttendanceRecord, status_code=status.HTTP_200_OK)
def set_attendance(payload: AttendanceRecord, db: Session = Depends(get_db)):
    child = db.query(Child).filter(Child.id == payload.child_id).first()
    if not child:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Child '{payload.child_id}' not found"
        )

    # Upsert attendance record
    existing = (
        db.query(Attendance)
        .filter(Attendance.child_id == payload.child_id, Attendance.date == payload.date)
        .first()
    )

    if existing:
        existing.present = payload.present
        db.add(existing)
    else:
        new_att = Attendance(
            child_id=payload.child_id,
            date=payload.date,
            present=payload.present,
        )
        db.add(new_att)

    db.commit()
    return payload

@router.post("/bulk", response_model=Dict[str, int])
def set_bulk_attendance(payload: BulkAttendanceCreate, db: Session = Depends(get_db)):
    # 1. Verify all children exist
    child_ids = {r.child_id for r in payload.records}
    existing_ids = {
        c.id for c in db.query(Child.id).filter(Child.id.in_(child_ids)).all()
    }
    missing = child_ids - existing_ids
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Children not found: {list(missing)}"
        )

    # 2. Upsert each record
    updated_count = 0
    for r in payload.records:
        rec_date = payload.date or r.date
        existing = (
            db.query(Attendance)
            .filter(Attendance.child_id == r.child_id, Attendance.date == rec_date)
            .first()
        )
        if existing:
            existing.present = r.present
            db.add(existing)
        else:
            db.add(Attendance(
                child_id=r.child_id,
                date=rec_date,
                present=r.present,
            ))
        updated_count += 1

    db.commit()
    return {"updated": updated_count}
