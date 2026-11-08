import uuid
import json
import base64
import cv2
import numpy as np
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.database.session import get_db
from backend.app.database.models import Photo, Face, Event, ScanSession, FeedbackReport, AdminSetting
from backend.app.face_recognition.pipeline import (
    process_image_for_faces,
    match_selfie_against_gallery
)
from backend.app.schemas.search import (
    FaceSearchResponse,
    MatchResultItem,
    MatchedFaceInfo,
    SearchSessionResponse,
    FeedbackCreate
)
from backend.app.schemas.photo import PhotoResponse

router = APIRouter(tags=["Face Search"])

def get_current_threshold(db: Session) -> float:
    """Retrieve current similarity threshold from AdminSetting or fallback to default."""
    setting = db.query(AdminSetting).filter(AdminSetting.key == "similarity_threshold").first()
    if setting:
        try:
            return float(setting.value)
        except ValueError:
            pass
    return settings.SIMILARITY_THRESHOLD

@router.post("/api/face-search", response_model=FaceSearchResponse)
async def search_faces(
    event_id: Optional[int] = Form(None),
    access_code: Optional[str] = Form(None),
    threshold: Optional[float] = Form(None),
    file: Optional[UploadFile] = File(None),
    image_base64: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Search for photographs containing the scanned selfie face.
    Performs real deep learning face detection, alignment, embedding extraction,
    and cosine similarity matching against all indexed farewell photos.
    Does NOT permanently store the selfie on disk (privacy-preserving).
    """
    # Verify event access code if required
    if event_id:
        event = db.query(Event).filter(Event.id == event_id).first()
        if not event:
            raise HTTPException(status_code=404, detail="Selected event not found")
        if event.access_code and event.access_code.strip():
            provided_code = (access_code or "").strip().lower()
            if provided_code != event.access_code.strip().lower():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Invalid event access code. Please enter the correct code to view this event's photos."
                )

    # Decode image from upload file or base64 data string
    image_bytes = None
    if file:
        image_bytes = await file.read()
    elif image_base64:
        # Strip header if present: data:image/jpeg;base64,...
        if "," in image_base64:
            image_base64 = image_base64.split(",", 1)[1]
        try:
            image_bytes = base64.b64decode(image_base64)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid base64 image data")
            
    if not image_bytes:
        raise HTTPException(status_code=400, detail="No selfie image provided")

    # Convert to OpenCV BGR image
    nparr = np.frombuffer(image_bytes, np.uint8)
    selfie_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if selfie_img is None:
        raise HTTPException(status_code=400, detail="Could not decode selfie image. Please try again.")

    # 1. Detect faces in selfie
    detected_faces = process_image_for_faces(selfie_img)
    if not detected_faces:
        raise HTTPException(
            status_code=422,
            detail="No face detected in your selfie. Please ensure good lighting, look straight at the camera, and remove masks/heavy sunglasses."
        )

    # If multiple faces detected in selfie, choose the most prominent face (largest area)
    primary_face = max(detected_faces, key=lambda f: f.bbox[2] * f.bbox[3])
    selfie_embedding = primary_face.embedding

    # 2. Retrieve indexed candidates from DB
    face_query = db.query(Face).join(Photo, Face.photo_id == Photo.id)
    if event_id:
        face_query = face_query.filter(Photo.event_id == event_id)
        
    db_faces = face_query.all()
    if not db_faces:
        return FaceSearchResponse(
            search_id=uuid.uuid4().hex,
            total_matches=0,
            matched_photos=[],
            detected_selfie_faces=len(detected_faces),
            message="No indexed photos found in this event yet. Photos may still be indexing."
        )

    # Build candidates list
    candidates = []
    # Pre-fetch photos to avoid N+1 queries
    photo_ids = list({f.photo_id for f in db_faces})
    photos_map = {p.id: p for p in db.query(Photo).filter(Photo.id.in_(photo_ids)).all()}

    for f in db_faces:
        photo = photos_map.get(f.photo_id)
        if not photo or photo.processing_status != "indexed":
            continue
            
        emb = np.frombuffer(f.embedding, dtype=np.float32)
        norm_bbox = json.loads(f.norm_bbox) if f.norm_bbox else None
        
        candidates.append({
            "face_id": f.id,
            "photo_id": f.photo_id,
            "embedding": emb,
            "norm_bbox": norm_bbox,
            "confidence": f.detection_confidence,
            "photo": photo
        })

    # 3. Match using cosine similarity
    effective_threshold = threshold if threshold is not None else get_current_threshold(db)
    raw_matches = match_selfie_against_gallery(selfie_embedding, candidates, threshold=effective_threshold)

    # 4. Format match results
    matched_results: List[MatchResultItem] = []
    session_photo_records = []

    for item in raw_matches:
        p_obj: Photo = item["photo"]
        photo_resp = PhotoResponse.from_orm(p_obj)
        
        faces_info = [
            MatchedFaceInfo(
                face_id=mf["face_id"],
                similarity=mf["similarity"],
                confidence=mf["confidence"],
                norm_bbox=mf["norm_bbox"],
                detection_confidence=mf["detection_confidence"]
            )
            for mf in item["matching_faces"]
        ]
        
        matched_results.append(
            MatchResultItem(
                photo_id=item["photo_id"],
                best_similarity=item["best_similarity"],
                best_confidence=item["best_confidence"],
                matching_faces=faces_info,
                photo=photo_resp
            )
        )
        session_photo_records.append({
            "photo_id": item["photo_id"],
            "best_similarity": item["best_similarity"],
            "best_confidence": item["best_confidence"]
        })

    # 5. Persist ScanSession (without storing raw selfie image)
    session_id = uuid.uuid4().hex
    scan_session = ScanSession(
        id=session_id,
        event_id=event_id,
        result_count=len(matched_results),
        matched_photo_ids=json.dumps(session_photo_records),
        temporary_scan_reference=None  # Deleted immediately for privacy
    )
    db.add(scan_session)
    db.commit()

    return FaceSearchResponse(
        search_id=session_id,
        total_matches=len(matched_results),
        matched_photos=matched_results,
        detected_selfie_faces=len(detected_faces),
        message=f"Found {len(matched_results)} farewell photos matching your face!"
    )

@router.get("/api/search/{search_id}", response_model=SearchSessionResponse)
def get_search_results(search_id: str, db: Session = Depends(get_db)):
    """Retrieve existing search session results."""
    session = db.query(ScanSession).filter(ScanSession.id == search_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Search session not found or expired")
        
    matched_records = json.loads(session.matched_photo_ids) if session.matched_photo_ids else []
    photo_ids = [r["photo_id"] for r in matched_records]
    photos_map = {p.id: p for p in db.query(Photo).filter(Photo.id.in_(photo_ids)).all()}
    
    results = []
    for rec in matched_records:
        pid = rec["photo_id"]
        p_obj = photos_map.get(pid)
        if not p_obj:
            continue
        photo_resp = PhotoResponse.from_orm(p_obj)
        results.append(
            MatchResultItem(
                photo_id=pid,
                best_similarity=rec["best_similarity"],
                best_confidence=rec["best_confidence"],
                matching_faces=[],
                photo=photo_resp
            )
        )
        
    return SearchSessionResponse(
        id=session.id,
        event_id=session.event_id,
        created_at=session.created_at,
        result_count=len(results),
        matched_photos=results
    )

@router.post("/api/reports")
def report_incorrect_match(
    report_in: FeedbackCreate,
    db: Session = Depends(get_db)
):
    """Allow students to report an incorrect match or photo issue."""
    photo = db.query(Photo).filter(Photo.id == report_in.photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
        
    report = FeedbackReport(
        photo_id=report_in.photo_id,
        scan_session_id=report_in.scan_session_id,
        report_type=report_in.report_type,
        notes=report_in.notes
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return {"message": "Thank you for your feedback. Our team has recorded this report.", "report_id": report.id}
