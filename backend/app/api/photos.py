import json
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.core.security import verify_token
from backend.app.database.session import get_db
from backend.app.database.models import Photo, Face, Event
from backend.app.schemas.photo import PhotoResponse, PhotoDetailResponse, FaceResponse
from backend.app.services.photo_service import save_uploaded_photo, import_existing_file, delete_photo_record
from backend.app.services.indexing_worker import indexing_worker

router = APIRouter(prefix="/photos", tags=["Photos"])

@router.post("/upload", response_model=List[PhotoResponse])
async def upload_photos(
    event_id: int = Form(...),
    auto_index: bool = Form(True),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload one or multiple farewell photographs.
    Automatically validates format, saves image, generates thumbnail, and queues indexing.
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    saved_photos = []
    for f in files:
        suffix = Path(f.filename).suffix.lower()
        if suffix not in settings.ALLOWED_EXTENSIONS:
            continue
            
        content = await f.read()
        if len(content) == 0:
            continue
            
        try:
            photo = save_uploaded_photo(content, f.filename, event_id, db)
            saved_photos.append(photo)
        except Exception as e:
            print(f"Error saving upload {f.filename}: {e}")

    if auto_index and saved_photos:
        indexing_worker.start(event_id=event_id)

    return saved_photos

@router.post("/import-local")
def import_local_photos(
    event_id: int = Form(...),
    max_photos: Optional[int] = Form(None),
    auto_index: bool = Form(True),
    db: Session = Depends(get_db)
):
    """
    Import existing farewell photos located on server/disk (e.g. current workspace).
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Look in the root workspace directory for JPG files
    workspace_dir = settings.BASE_DIR.parent
    local_files = [
        f for f in workspace_dir.iterdir()
        if f.is_file() and f.suffix.lower() in settings.ALLOWED_EXTENSIONS
    ]

    if not local_files:
        return {"imported_count": 0, "message": "No local photo files found to import"}

    if max_photos:
        local_files = local_files[:max_photos]

    imported = []
    for fpath in local_files:
        # Check if already imported
        existing = db.query(Photo).filter(Photo.event_id == event_id, Photo.filename == fpath.name).first()
        if existing:
            continue
            
        try:
            photo = import_existing_file(fpath, event_id, db)
            if photo:
                imported.append(photo.id)
        except Exception as e:
            print(f"Error importing {fpath.name}: {e}")

    if auto_index and imported:
        indexing_worker.start(event_id=event_id)

    return {
        "imported_count": len(imported),
        "total_found": len(local_files),
        "message": f"Successfully imported {len(imported)} photos"
    }

@router.get("", response_model=List[PhotoResponse])
def list_photos(
    event_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    is_group: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(60, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """List uploaded photos with filtering and pagination."""
    query = db.query(Photo)
    if event_id is not None:
        query = query.filter(Photo.event_id == event_id)
    if status is not None:
        query = query.filter(Photo.processing_status == status)
    if is_group is not None:
        query = query.filter(Photo.is_group == is_group)
    if search:
        query = query.filter(Photo.filename.ilike(f"%{search}%"))

    photos = query.order_by(Photo.id.desc()).offset(skip).limit(limit).all()
    return photos

@router.get("/index/status")
def get_indexing_status():
    """Check face recognition background indexing status and statistics."""
    return indexing_worker.get_status()

@router.post("/index")
def trigger_indexing(
    event_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _token: dict = Depends(verify_token)
):
    """Trigger or resume face indexing worker."""
    indexing_worker.start(event_id=event_id)
    return {"message": "Face indexing worker started", "status": indexing_worker.get_status()}

@router.post("/index/retry-failed")
def retry_failed_photos(
    event_id: Optional[int] = None,
    db: Session = Depends(get_db),
    _token: dict = Depends(verify_token)
):
    """Reset failed photos back to 'uploaded' and trigger indexing."""
    query = db.query(Photo).filter(Photo.processing_status == "failed")
    if event_id:
        query = query.filter(Photo.event_id == event_id)
    updated = query.update({"processing_status": "uploaded", "error_message": None})
    db.commit()
    indexing_worker.start(event_id=event_id)
    return {"message": f"Reset {updated} failed photos for re-indexing"}

@router.get("/{photo_id}", response_model=PhotoDetailResponse)
def get_photo_detail(photo_id: int, db: Session = Depends(get_db)):
    """Retrieve photograph details including detected face bounding boxes."""
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
        
    faces = db.query(Face).filter(Face.photo_id == photo_id).all()
    face_responses = []
    for fc in faces:
        norm_bbox = json.loads(fc.norm_bbox) if fc.norm_bbox else None
        face_responses.append(
            FaceResponse(
                id=fc.id,
                photo_id=fc.photo_id,
                norm_bbox=norm_bbox,
                bbox_x=fc.bbox_x,
                bbox_y=fc.bbox_y,
                bbox_w=fc.bbox_w,
                bbox_h=fc.bbox_h,
                detection_confidence=fc.detection_confidence
            )
        )
        
    res = PhotoDetailResponse.from_orm(photo)
    res.faces = face_responses
    return res

@router.get("/{photo_id}/download")
def download_photo(photo_id: int, db: Session = Depends(get_db)):
    """Directly download the original full-resolution photograph."""
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
        
    file_path = settings.BASE_DIR / photo.storage_path
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image file not found on disk")
        
    return FileResponse(
        path=str(file_path),
        filename=photo.filename,
        media_type="image/jpeg"
    )

@router.delete("/{photo_id}")
def delete_photo(
    photo_id: int,
    db: Session = Depends(get_db),
    _token: dict = Depends(verify_token)
):
    """Delete a photograph and all its indexed face embeddings (Admin protected)."""
    success = delete_photo_record(photo_id, db)
    if not success:
        raise HTTPException(status_code=404, detail="Photo not found")
    return {"message": f"Photo {photo_id} deleted successfully"}
