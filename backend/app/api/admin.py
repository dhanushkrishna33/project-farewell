from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.core.security import create_access_token, verify_token
from backend.app.database.session import get_db
from backend.app.database.models import Photo, Face, Event, ScanSession, AdminSetting
from backend.app.schemas.admin import AdminLoginRequest, TokenResponse, AdminStatsResponse, AdminSettingsUpdate
from backend.app.services.indexing_worker import indexing_worker

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.post("/login", response_model=TokenResponse)
def admin_login(creds: AdminLoginRequest):
    """Administrator login to manage photos, events, and AI indexing."""
    if creds.username != settings.ADMIN_USERNAME or creds.password != settings.ADMIN_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect administrator username or password"
        )
    token = create_access_token({"sub": creds.username, "role": "admin"})
    return TokenResponse(access_token=token, username=creds.username)

@router.get("/stats", response_model=AdminStatsResponse)
def get_admin_stats(db: Session = Depends(get_db)):
    """Retrieve system overview metrics for the admin dashboard."""
    total_photos = db.query(Photo).count()
    photos_indexed = db.query(Photo).filter(Photo.processing_status == "indexed").count()
    photos_remaining = db.query(Photo).filter(Photo.processing_status.in_(["uploaded", "processing"])).count()
    failed_processing = db.query(Photo).filter(Photo.processing_status == "failed").count()
    total_faces = db.query(Face).count()
    total_events = db.query(Event).count()
    total_searches = db.query(ScanSession).count()
    
    # Get current threshold
    setting = db.query(AdminSetting).filter(AdminSetting.key == "similarity_threshold").first()
    thresh = float(setting.value) if setting else settings.SIMILARITY_THRESHOLD

    return AdminStatsResponse(
        total_photos=total_photos,
        total_faces_detected=total_faces,
        photos_indexed=photos_indexed,
        photos_remaining=photos_remaining,
        failed_processing=failed_processing,
        total_events=total_events,
        total_searches=total_searches,
        similarity_threshold=thresh,
        is_indexing_running=indexing_worker.is_running
    )

@router.get("/local-photos-count")
def get_local_photos_count():
    """Scan local directory for unindexed farewell DSLR photos."""
    workspace_dir = settings.BASE_DIR.parent
    local_files = [
        f.name for f in workspace_dir.iterdir()
        if f.is_file() and f.suffix.lower() in settings.ALLOWED_EXTENSIONS
    ]
    return {
        "count": len(local_files),
        "sample_files": local_files[:5],
        "path": str(workspace_dir)
    }

@router.get("/settings")
def get_settings(db: Session = Depends(get_db), _token: dict = Depends(verify_token)):
    """Get administrator configurable settings."""
    setting = db.query(AdminSetting).filter(AdminSetting.key == "similarity_threshold").first()
    thresh = float(setting.value) if setting else settings.SIMILARITY_THRESHOLD
    return {"similarity_threshold": thresh}

@router.put("/settings")
def update_settings(
    settings_in: AdminSettingsUpdate,
    db: Session = Depends(get_db),
    _token: dict = Depends(verify_token)
):
    """Update similarity threshold or other administrative settings."""
    if settings_in.similarity_threshold is not None:
        val = str(settings_in.similarity_threshold)
        s = db.query(AdminSetting).filter(AdminSetting.key == "similarity_threshold").first()
        if not s:
            s = AdminSetting(key="similarity_threshold", value=val)
            db.add(s)
        else:
            s.value = val
        db.commit()
    return {"message": "Settings updated successfully"}
