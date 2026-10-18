from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Child
from app.schemas import ChildCreate, ChildUpdate, ChildResponse
from app.services import generate_child_id, AVATARS

router = APIRouter(prefix="/api/children", tags=["Children"])

@router.get("", response_model=List[ChildResponse])
def get_children(db: Session = Depends(get_db)):
    children = db.query(Child).all()
    return children

@router.post("", response_model=ChildResponse, status_code=status.HTTP_201_CREATED)
def create_child(payload: ChildCreate, db: Session = Depends(get_db)):
    child_id = generate_child_id(payload.name)
    existing_count = db.query(Child).count()
    avatar = AVATARS[existing_count % len(AVATARS)]

    initial_scores = {
        "alphabet": 1,
        "numbers": 1,
        "colours": 1,
        "art": 1,
        "stories": 1,
    }

    new_child = Child(
        id=child_id,
        name=payload.name,
        age=payload.age,
        avatar=avatar,
        tone="teal",
        scores=initial_scores,
        strengths=[],
        needs=["First observations pending"],
    )
    db.add(new_child)
    db.commit()
    db.refresh(new_child)
    return new_child

@router.get("/{id}", response_model=ChildResponse)
def get_child(id: str, db: Session = Depends(get_db)):
    child = db.query(Child).filter(Child.id == id).first()
    if not child:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Child '{id}' not found")
    return child

@router.put("/{id}", response_model=ChildResponse)
def update_child(id: str, payload: ChildUpdate, db: Session = Depends(get_db)):
    child = db.query(Child).filter(Child.id == id).first()
    if not child:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Child '{id}' not found")

    if payload.name is not None:
        child.name = payload.name
    if payload.age is not None:
        child.age = payload.age

    db.add(child)
    db.commit()
    db.refresh(child)
    return child

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_child(id: str, db: Session = Depends(get_db)):
    child = db.query(Child).filter(Child.id == id).first()
    if not child:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Child '{id}' not found")

    db.delete(child)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
