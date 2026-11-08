from typing import Optional, Dict, Any
from pydantic import BaseModel

class AdminLoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str

class AdminStatsResponse(BaseModel):
    total_photos: int
    total_faces_detected: int
    photos_indexed: int
    photos_remaining: int
    failed_processing: int
    total_events: int
    total_searches: int
    similarity_threshold: float
    is_indexing_running: bool

class AdminSettingsUpdate(BaseModel):
    similarity_threshold: Optional[float] = None
