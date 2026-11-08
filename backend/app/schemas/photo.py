from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class FaceResponse(BaseModel):
    id: int
    photo_id: int
    norm_bbox: Optional[Dict[str, float]] = None
    bbox_x: float
    bbox_y: float
    bbox_w: float
    bbox_h: float
    detection_confidence: float

    class Config:
        from_attributes = True

class PhotoResponse(BaseModel):
    id: int
    event_id: int
    filename: str
    storage_path: str
    thumbnail_path: Optional[str] = None
    image_width: int
    image_height: int
    file_size: int
    face_count: int
    is_group: bool
    processing_status: str
    error_message: Optional[str] = None
    upload_date: datetime
    indexed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class PhotoDetailResponse(PhotoResponse):
    faces: List[FaceResponse] = []
