from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.database.models import Event, Photo
from backend.app.schemas.event import EventCreate, EventResponse, EventVerifyRequest
from backend.app.core.security import verify_token

router = APIRouter(prefix="/events", tags=["Events"])

@router.post("", response_model=EventResponse)
def create_event(
    event_in: EventCreate,
    db: Session = Depends(get_db),
    _token: dict = Depends(verify_token)
):
    """Create a new farewell event (Admin protected)."""
    db_event = Event(
        name=event_in.name,
        event_date=event_in.event_date,
        description=event_in.description,
        access_code=event_in.access_code.strip() if event_in.access_code else ""
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    
    return EventResponse(
        id=db_event.id,
        name=db_event.name,
        event_date=db_event.event_date,
        description=db_event.description,
        access_code="",  # Never leak access code in response
        created_at=db_event.created_at,
        photo_count=0,
        indexed_count=0,
        requires_code=bool(db_event.access_code)
    )

@router.get("", response_model=List[EventResponse])
def list_events(db: Session = Depends(get_db)):
    """List all farewell events with photo counts and access requirement status."""
    events = db.query(Event).order_by(Event.id.desc()).all()
    results = []
    for ev in events:
        p_count = db.query(Photo).filter(Photo.event_id == ev.id).count()
        idx_count = db.query(Photo).filter(Photo.event_id == ev.id, Photo.processing_status == "indexed").count()
        results.append(
            EventResponse(
                id=ev.id,
                name=ev.name,
                event_date=ev.event_date,
                description=ev.description,
                access_code="",
                created_at=ev.created_at,
                photo_count=p_count,
                indexed_count=idx_count,
                requires_code=bool(ev.access_code)
            )
        )
    return results

@router.get("/{event_id}", response_model=EventResponse)
def get_event(event_id: int, db: Session = Depends(get_db)):
    """Retrieve event details."""
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
        
    p_count = db.query(Photo).filter(Photo.event_id == ev.id).count()
    idx_count = db.query(Photo).filter(Photo.event_id == ev.id, Photo.processing_status == "indexed").count()
    return EventResponse(
        id=ev.id,
        name=ev.name,
        event_date=ev.event_date,
        description=ev.description,
        access_code="",
        created_at=ev.created_at,
        photo_count=p_count,
        indexed_count=idx_count,
        requires_code=bool(ev.access_code)
    )

@router.post("/{event_id}/verify-code")
def verify_event_access(
    event_id: int,
    req: EventVerifyRequest,
    db: Session = Depends(get_db)
):
    """Verify event access code."""
    ev = db.query(Event).filter(Event.id == event_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")
        
    if not ev.access_code:
        return {"valid": True, "message": "Public event, no access code needed"}
        
    if req.access_code.strip().lower() == ev.access_code.strip().lower():
        return {"valid": True, "message": "Access granted"}
        
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Incorrect event access code")
