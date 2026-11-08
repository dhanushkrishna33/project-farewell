from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class EventBase(BaseModel):
    name: str
    event_date: Optional[str] = None
    description: Optional[str] = None
    access_code: Optional[str] = ""

class EventCreate(EventBase):
    pass

class EventResponse(EventBase):
    id: int
    created_at: datetime
    photo_count: int = 0
    indexed_count: int = 0
    requires_code: bool = False

    class Config:
        from_attributes = True

class EventVerifyRequest(BaseModel):
    access_code: str
