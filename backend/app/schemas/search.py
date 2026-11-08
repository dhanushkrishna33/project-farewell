from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from backend.app.schemas.photo import PhotoResponse

class MatchedFaceInfo(BaseModel):
    face_id: int
    similarity: float
    confidence: float
    norm_bbox: Optional[Dict[str, float]] = None
    detection_confidence: float

class MatchResultItem(BaseModel):
    photo_id: int
    best_similarity: float
    best_confidence: float
    matching_faces: List[MatchedFaceInfo]
    photo: PhotoResponse

class FaceSearchResponse(BaseModel):
    search_id: str
    total_matches: int
    matched_photos: List[MatchResultItem]
    detected_selfie_faces: int
    message: str

class SearchSessionResponse(BaseModel):
    id: str
    event_id: Optional[int]
    created_at: datetime
    result_count: int
    matched_photos: List[MatchResultItem]

class FeedbackCreate(BaseModel):
    photo_id: int
    scan_session_id: Optional[str] = None
    report_type: str = "wrong_match"
    notes: Optional[str] = None
