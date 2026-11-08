import threading
import time
import json
import cv2
import numpy as np
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.database.session import SessionLocal
from backend.app.database.models import Photo, Face
from backend.app.face_recognition.pipeline import process_image_for_faces

class IndexingWorker:
    def __init__(self):
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        
        self.is_running: bool = False
        self.current_filename: Optional[str] = None
        self.last_error: Optional[str] = None
        self.start_time: Optional[float] = None
        
    def get_status(self) -> Dict[str, Any]:
        """Fetch current indexing progress and counts directly from database."""
        db: Session = SessionLocal()
        try:
            total_photos = db.query(Photo).count()
            indexed_photos = db.query(Photo).filter(Photo.processing_status == "indexed").count()
            processing_photos = db.query(Photo).filter(Photo.processing_status == "processing").count()
            failed_photos = db.query(Photo).filter(Photo.processing_status == "failed").count()
            remaining_photos = db.query(Photo).filter(Photo.processing_status.in_(["uploaded", "processing"])).count()
            total_faces = db.query(Face).count()
            
            progress_pct = 0.0
            if total_photos > 0:
                progress_pct = round((indexed_photos / total_photos) * 100.0, 1)

            elapsed_seconds = round(time.time() - self.start_time, 1) if (self.is_running and self.start_time) else 0

            return {
                "is_running": self.is_running,
                "current_filename": self.current_filename,
                "total_photos": total_photos,
                "indexed_photos": indexed_photos,
                "processing_photos": processing_photos,
                "remaining_photos": remaining_photos,
                "failed_photos": failed_photos,
                "total_faces": total_faces,
                "progress_percentage": progress_pct,
                "elapsed_seconds": elapsed_seconds,
                "last_error": self.last_error
            }
        finally:
            db.close()

    def start(self, event_id: Optional[int] = None):
        """Start background indexing thread if not already active."""
        with self._lock:
            if self.is_running:
                return
            self.is_running = True
            self._stop_event.clear()
            self.start_time = time.time()
            self._thread = threading.Thread(target=self._worker_loop, args=(event_id,), daemon=True)
            self._thread.start()

    def stop(self):
        """Signal worker to stop processing."""
        with self._lock:
            self._stop_event.set()
            self.is_running = False

    def _worker_loop(self, event_id: Optional[int]):
        print("[IndexingWorker] Worker loop started")
        while not self._stop_event.is_set():
            db: Session = SessionLocal()
            try:
                query = db.query(Photo).filter(Photo.processing_status.in_(["uploaded", "processing"]))
                if event_id:
                    query = query.filter(Photo.event_id == event_id)
                
                photo = query.first()
                if not photo:
                    # Nothing left to index
                    print("[IndexingWorker] No unindexed photos remaining.")
                    break

                self.current_filename = photo.filename
                photo.processing_status = "processing"
                db.commit()

                photo_abs_path = settings.BASE_DIR / photo.storage_path
                if not photo_abs_path.exists():
                    photo.processing_status = "failed"
                    photo.error_message = f"File not found on disk: {photo.storage_path}"
                    db.commit()
                    continue

                img_bgr = cv2.imread(str(photo_abs_path))
                if img_bgr is None:
                    photo.processing_status = "failed"
                    photo.error_message = "Corrupted or unreadable image format"
                    db.commit()
                    continue

                # Run real face detection & embedding extraction
                detected_faces = process_image_for_faces(img_bgr)

                # Delete any old face records for this photo
                db.query(Face).filter(Face.photo_id == photo.id).delete()

                # Save all detected faces independently
                for face_res in detected_faces:
                    # Convert float32 embedding to raw bytes
                    embedding_bytes = face_res.embedding.tobytes()
                    face_record = Face(
                        photo_id=photo.id,
                        embedding=embedding_bytes,
                        bbox_x=face_res.bbox[0],
                        bbox_y=face_res.bbox[1],
                        bbox_w=face_res.bbox[2],
                        bbox_h=face_res.bbox[3],
                        norm_bbox=json.dumps(face_res.norm_bbox),
                        landmarks=json.dumps(face_res.landmarks),
                        detection_confidence=face_res.confidence
                    )
                    db.add(face_record)

                photo.face_count = len(detected_faces)
                photo.is_group = (len(detected_faces) > 1)
                photo.processing_status = "indexed"
                photo.indexed_at = datetime.utcnow()
                photo.error_message = None
                db.commit()

            except Exception as e:
                self.last_error = str(e)
                print(f"[IndexingWorker] Error processing photo: {e}")
                try:
                    if photo:
                        photo.processing_status = "failed"
                        photo.error_message = str(e)
                        db.commit()
                except Exception:
                    pass
            finally:
                db.close()
                time.sleep(0.05)  # slight yield to avoid thread starvation

        with self._lock:
            self.is_running = False
            self.current_filename = None
        print("[IndexingWorker] Worker loop finished")

indexing_worker = IndexingWorker()
