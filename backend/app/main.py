import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from backend.app.core.config import settings
from backend.app.database.session import engine, Base, SessionLocal
from backend.app.database.models import Event, AdminSetting
from backend.app.face_recognition.downloader import ensure_models_exist
from backend.app.api.events import router as events_router
from backend.app.api.photos import router as photos_router
from backend.app.api.face_search import router as search_router
from backend.app.api.admin import router as admin_router
from backend.app.services.indexing_worker import indexing_worker

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables
    print("[Startup] Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Ensure AI face models are in place
    print("[Startup] Verifying AI face detection and recognition models...")
    ensure_models_exist()
    
    # Seed default event and default threshold if empty
    db = SessionLocal()
    try:
        if db.query(Event).count() == 0:
            default_event = Event(
                name="College Farewell 2019",
                event_date="2019-04-25",
                description="Final year farewell celebration, stage performances, batch photos, and departmental portraits.",
                access_code=""  # Public by default for easy access
            )
            db.add(default_event)
            db.commit()
            print("[Startup] Seeded default event: College Farewell 2019")
            
        # Seed default threshold
        if db.query(AdminSetting).filter(AdminSetting.key == "similarity_threshold").count() == 0:
            db.add(AdminSetting(key="similarity_threshold", value=str(settings.SIMILARITY_THRESHOLD)))
            db.commit()
    finally:
        db.close()
        
    yield
    # Shutdown: stop indexing worker
    print("[Shutdown] Stopping indexing worker...")
    indexing_worker.stop()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-Powered Facial Recognition Photo Gallery for College Farewell Events",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for storage (photos, thumbnails, crops)
app.mount("/storage", StaticFiles(directory=str(settings.STORAGE_DIR)), name="storage")

# Include API Routers
app.include_router(events_router, prefix=settings.API_PREFIX)
app.include_router(photos_router, prefix=settings.API_PREFIX)
app.include_router(search_router)  # includes /api/face-search, /api/search/{id}, /api/reports
app.include_router(admin_router, prefix=settings.API_PREFIX)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "models_ready": settings.YUNET_MODEL_PATH.exists() and settings.SFACE_MODEL_PATH.exists()
    }
