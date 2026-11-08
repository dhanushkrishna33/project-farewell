from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, LargeBinary
from sqlalchemy.orm import relationship
from backend.app.database.session import Base

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False, index=True)
    event_date = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    access_code = Column(String(100), default="", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    photos = relationship("Photo", back_populates="event", cascade="all, delete-orphan")
    scan_sessions = relationship("ScanSession", back_populates="event")


class Photo(Base):
    __tablename__ = "photos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False, index=True)
    storage_path = Column(String(500), nullable=False)
    thumbnail_path = Column(String(500), nullable=True)
    image_width = Column(Integer, default=0)
    image_height = Column(Integer, default=0)
    file_size = Column(Integer, default=0)
    face_count = Column(Integer, default=0, index=True)
    is_group = Column(Boolean, default=False, index=True)
    processing_status = Column(String(50), default="uploaded", index=True)  # uploaded, processing, indexed, failed
    error_message = Column(Text, nullable=True)
    upload_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    indexed_at = Column(DateTime, nullable=True)

    event = relationship("Event", back_populates="photos")
    faces = relationship("Face", back_populates="photo", cascade="all, delete-orphan")
    reports = relationship("FeedbackReport", back_populates="photo", cascade="all, delete-orphan")


class Face(Base):
    __tablename__ = "faces"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    photo_id = Column(Integer, ForeignKey("photos.id", ondelete="CASCADE"), nullable=False, index=True)
    embedding = Column(LargeBinary, nullable=False)  # 128 float32 values as raw bytes
    bbox_x = Column(Float, nullable=False)
    bbox_y = Column(Float, nullable=False)
    bbox_w = Column(Float, nullable=False)
    bbox_h = Column(Float, nullable=False)
    norm_bbox = Column(Text, nullable=True)  # JSON: {"x": 0.1, "y": 0.2, "w": 0.15, "h": 0.2}
    landmarks = Column(Text, nullable=True)  # JSON string of 5-point facial landmarks
    detection_confidence = Column(Float, default=0.0)
    crop_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    photo = relationship("Photo", back_populates="faces")


class ScanSession(Base):
    __tablename__ = "scan_sessions"

    id = Column(String(64), primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    result_count = Column(Integer, default=0)
    matched_photo_ids = Column(Text, nullable=True)  # JSON array of {photo_id, confidence, similarity}
    temporary_scan_reference = Column(String(500), nullable=True)

    event = relationship("Event", back_populates="scan_sessions")


class FeedbackReport(Base):
    __tablename__ = "feedback_reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    photo_id = Column(Integer, ForeignKey("photos.id", ondelete="CASCADE"), nullable=False, index=True)
    scan_session_id = Column(String(64), nullable=True, index=True)
    report_type = Column(String(100), default="wrong_match")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    photo = relationship("Photo", back_populates="reports")


class AdminSetting(Base):
    __tablename__ = "admin_settings"

    key = Column(String(100), primary_key=True)
    value = Column(String(255), nullable=False)
