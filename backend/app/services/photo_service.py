import os
import uuid
import json
import cv2
import numpy as np
from pathlib import Path
from PIL import Image, ImageOps
from typing import Tuple, Optional
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.database.models import Photo, Face, Event

def create_optimized_thumbnail(source_path: Path, dest_path: Path, max_dim: int = 900) -> Tuple[int, int]:
    """
    Generate a web-optimized JPEG thumbnail preserving EXIF orientation.
    Returns (width, height) of the generated thumbnail.
    """
    with Image.open(source_path) as img:
        # Transpose based on EXIF orientation
        img = ImageOps.exif_transpose(img)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        
        orig_w, orig_h = img.size
        # Resize thumbnail maintaining aspect ratio
        img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
        thumb_w, thumb_h = img.size
        
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(dest_path, "JPEG", quality=settings.THUMBNAIL_QUALITY, optimize=True)
        return thumb_w, thumb_h

def get_image_dimensions(image_path: Path) -> Tuple[int, int]:
    """Get dimensions (width, height) of an image with EXIF transpose."""
    try:
        with Image.open(image_path) as img:
            img = ImageOps.exif_transpose(img)
            return img.size
    except Exception:
        # Fallback to cv2
        img = cv2.imread(str(image_path))
        if img is not None:
            return img.shape[1], img.shape[0]
        return 0, 0

def save_uploaded_photo(
    file_bytes: bytes,
    original_filename: str,
    event_id: int,
    db: Session
) -> Photo:
    """Save an uploaded photo, generate thumbnail, and persist Photo metadata."""
    unique_id = uuid.uuid4().hex[:10]
    safe_name = Path(original_filename).name.replace(" ", "_")
    storage_filename = f"ev{event_id}_{unique_id}_{safe_name}"
    
    photo_path = settings.PHOTOS_DIR / storage_filename
    thumb_path = settings.THUMBNAILS_DIR / f"thumb_{storage_filename}"
    
    with open(photo_path, "wb") as f:
        f.write(file_bytes)
        
    width, height = get_image_dimensions(photo_path)
    file_size = photo_path.stat().st_size
    
    # Create thumbnail
    create_optimized_thumbnail(photo_path, thumb_path, max_dim=settings.THUMBNAIL_MAX_DIMENSION)
    
    photo = Photo(
        event_id=event_id,
        filename=original_filename,
        storage_path=str(photo_path.relative_to(settings.BASE_DIR)).replace("\\", "/"),
        thumbnail_path=str(thumb_path.relative_to(settings.BASE_DIR)).replace("\\", "/"),
        image_width=width,
        image_height=height,
        file_size=file_size,
        face_count=0,
        is_group=False,
        processing_status="uploaded"
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo

def import_existing_file(
    source_path: Path,
    event_id: int,
    db: Session
) -> Optional[Photo]:
    """Import an already existing local file into storage and database."""
    if not source_path.exists():
        return None
        
    unique_id = uuid.uuid4().hex[:8]
    storage_filename = f"ev{event_id}_{unique_id}_{source_path.name}"
    dest_photo_path = settings.PHOTOS_DIR / storage_filename
    thumb_path = settings.THUMBNAILS_DIR / f"thumb_{storage_filename}"
    
    # Copy file to storage
    with open(source_path, "rb") as sf, open(dest_photo_path, "wb") as df:
        df.write(sf.read())
        
    width, height = get_image_dimensions(dest_photo_path)
    file_size = dest_photo_path.stat().st_size
    create_optimized_thumbnail(dest_photo_path, thumb_path, max_dim=settings.THUMBNAIL_MAX_DIMENSION)
    
    photo = Photo(
        event_id=event_id,
        filename=source_path.name,
        storage_path=str(dest_photo_path.relative_to(settings.BASE_DIR)).replace("\\", "/"),
        thumbnail_path=str(thumb_path.relative_to(settings.BASE_DIR)).replace("\\", "/"),
        image_width=width,
        image_height=height,
        file_size=file_size,
        face_count=0,
        is_group=False,
        processing_status="uploaded"
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo

def delete_photo_record(photo_id: int, db: Session) -> bool:
    """Delete photo, associated face records and physical files."""
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        return False
        
    try:
        p_path = settings.BASE_DIR / photo.storage_path
        if p_path.exists():
            p_path.unlink()
    except Exception:
        pass
        
    try:
        if photo.thumbnail_path:
            t_path = settings.BASE_DIR / photo.thumbnail_path
            if t_path.exists():
                t_path.unlink()
    except Exception:
        pass
        
    db.delete(photo)
    db.commit()
    return True
