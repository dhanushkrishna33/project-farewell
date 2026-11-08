import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage"
PHOTOS_DIR = STORAGE_DIR / "photos"
THUMBNAILS_DIR = STORAGE_DIR / "thumbnails"
CROPS_DIR = STORAGE_DIR / "crops"
MODELS_DIR = BASE_DIR / "models"

for p in [STORAGE_DIR, PHOTOS_DIR, THUMBNAILS_DIR, CROPS_DIR, MODELS_DIR]:
    p.mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    PROJECT_NAME: str = "Farewell Face Finder"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/farewell.db")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "farewell-face-finder-secret-key-2026-super-secure")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "farewell2026")
    
    # Storage Paths
    BASE_DIR: Path = BASE_DIR
    STORAGE_DIR: Path = STORAGE_DIR
    PHOTOS_DIR: Path = PHOTOS_DIR
    THUMBNAILS_DIR: Path = THUMBNAILS_DIR
    CROPS_DIR: Path = CROPS_DIR
    MODELS_DIR: Path = MODELS_DIR
    
    # Face Recognition Models
    YUNET_MODEL_PATH: Path = MODELS_DIR / "face_detection_yunet_2023mar.onnx"
    SFACE_MODEL_PATH: Path = MODELS_DIR / "face_recognition_sface_2021dec.onnx"
    
    # Recognition parameters
    SIMILARITY_THRESHOLD: float = float(os.getenv("SIMILARITY_THRESHOLD", "0.38"))
    DETECTION_CONFIDENCE_THRESHOLD: float = 0.55
    DETECTION_NMS_THRESHOLD: float = 0.3
    
    # Max image processing dimension for detection
    MAX_DETECTION_DIMENSION: int = 1600
    THUMBNAIL_MAX_DIMENSION: int = 900
    THUMBNAIL_QUALITY: int = 82
    
    ALLOWED_EXTENSIONS: set = {".jpg", ".jpeg", ".png", ".webp"}

settings = Settings()
