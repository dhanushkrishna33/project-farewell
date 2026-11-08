import os
import ssl
import urllib.request
from pathlib import Path
from backend.app.core.config import settings

def ensure_models_exist():
    """Ensure ONNX models for YuNet and SFace exist, downloading if missing."""
    models_dir = settings.MODELS_DIR
    models_dir.mkdir(parents=True, exist_ok=True)
    
    yunet_path = settings.YUNET_MODEL_PATH
    sface_path = settings.SFACE_MODEL_PATH
    
    yunet_url = "https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
    sface_url = "https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"
    
    ssl_context = ssl._create_unverified_context()
    
    if not yunet_path.exists() or yunet_path.stat().st_size < 100000:
        print(f"Downloading YuNet model to {yunet_path}...")
        with urllib.request.urlopen(yunet_url, context=ssl_context) as resp, open(yunet_path, "wb") as f:
            f.write(resp.read())
        print(f"YuNet downloaded successfully ({yunet_path.stat().st_size} bytes)")
        
    if not sface_path.exists() or sface_path.stat().st_size < 10000000:
        print(f"Downloading SFace model to {sface_path}...")
        with urllib.request.urlopen(sface_url, context=ssl_context) as resp, open(sface_path, "wb") as f:
            f.write(resp.read())
        print(f"SFace downloaded successfully ({sface_path.stat().st_size} bytes)")

    return yunet_path, sface_path
