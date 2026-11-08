import threading
import cv2
import numpy as np
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from backend.app.core.config import settings
from backend.app.face_recognition.downloader import ensure_models_exist

_thread_local = threading.local()

def get_face_detector(input_size: Tuple[int, int] = (320, 320)) -> cv2.FaceDetectorYN:
    """Get thread-local YuNet face detector instance."""
    if not hasattr(_thread_local, "detector") or _thread_local.detector is None:
        ensure_models_exist()
        detector = cv2.FaceDetectorYN.create(
            str(settings.YUNET_MODEL_PATH),
            "",
            input_size,
            score_threshold=settings.DETECTION_CONFIDENCE_THRESHOLD,
            nms_threshold=settings.DETECTION_NMS_THRESHOLD,
            top_k=500
        )
        _thread_local.detector = detector
    return _thread_local.detector

def get_face_recognizer() -> cv2.FaceRecognizerSF:
    """Get thread-local SFace face recognizer instance."""
    if not hasattr(_thread_local, "recognizer") or _thread_local.recognizer is None:
        ensure_models_exist()
        recognizer = cv2.FaceRecognizerSF.create(
            str(settings.SFACE_MODEL_PATH),
            ""
        )
        _thread_local.recognizer = recognizer
    return _thread_local.recognizer


class FaceDetectionResult:
    def __init__(
        self,
        bbox: Tuple[float, float, float, float],
        norm_bbox: Dict[str, float],
        confidence: float,
        landmarks: List[Tuple[float, float]],
        embedding: np.ndarray,
        raw_face: np.ndarray
    ):
        self.bbox = bbox  # (x, y, w, h) in pixels
        self.norm_bbox = norm_bbox  # {x, y, w, h} in [0, 1]
        self.confidence = confidence  # 0.0 - 1.0
        self.landmarks = landmarks
        self.embedding = embedding  # 128-d float32 L2-normalized vector
        self.raw_face = raw_face


def process_image_for_faces(image_bgr: np.ndarray) -> List[FaceDetectionResult]:
    """
    Detect all faces in an image and compute their normalized embeddings.
    Handles high-resolution images by downscaling for detection and scaling
    coordinates back to full resolution for maximum crop and embedding accuracy.
    """
    orig_h, orig_w = image_bgr.shape[:2]
    if orig_h == 0 or orig_w == 0:
        return []

    # Downscale for fast face detection
    max_dim = settings.MAX_DETECTION_DIMENSION
    scale = 1.0
    if max(orig_h, orig_w) > max_dim:
        scale = max_dim / max(orig_h, orig_w)
        proc_w = int(orig_w * scale)
        proc_h = int(orig_h * scale)
        proc_img = cv2.resize(image_bgr, (proc_w, proc_h), interpolation=cv2.INTER_AREA)
    else:
        proc_w, proc_h = orig_w, orig_h
        proc_img = image_bgr

    detector = get_face_detector((proc_w, proc_h))
    detector.setInputSize((proc_w, proc_h))
    
    status, raw_faces = detector.detect(proc_img)
    if raw_faces is None or len(raw_faces) == 0:
        return []

    recognizer = get_face_recognizer()
    results: List[FaceDetectionResult] = []

    for face in raw_faces:
        # face contains: [x, y, w, h, x_re, y_re, x_le, y_le, x_nt, y_nt, x_rc, y_rc, x_lc, y_lc, score]
        conf = float(face[-1])
        if conf < settings.DETECTION_CONFIDENCE_THRESHOLD:
            continue

        # Scale back to original coordinates for high quality alignment
        inv_scale = 1.0 / scale
        orig_face = face.copy()
        # Scale coordinates (first 14 numbers: bbox 4 + landmarks 10)
        orig_face[:14] = face[:14] * inv_scale

        x, y, w, h = float(orig_face[0]), float(orig_face[1]), float(orig_face[2]), float(orig_face[3])
        
        # Ensure coordinates are within image boundaries
        x = max(0.0, min(float(orig_w - 1), x))
        y = max(0.0, min(float(orig_h - 1), y))
        w = max(1.0, min(float(orig_w - x), w))
        h = max(1.0, min(float(orig_h - y), h))

        norm_bbox = {
            "x": round(x / orig_w, 4),
            "y": round(y / orig_h, 4),
            "w": round(w / orig_w, 4),
            "h": round(h / orig_h, 4),
        }

        landmarks = [
            (round(float(orig_face[4]), 2), round(float(orig_face[5]), 2)),  # right eye
            (round(float(orig_face[6]), 2), round(float(orig_face[7]), 2)),  # left eye
            (round(float(orig_face[8]), 2), round(float(orig_face[9]), 2)),  # nose tip
            (round(float(orig_face[10]), 2), round(float(orig_face[11]), 2)), # right mouth corner
            (round(float(orig_face[12]), 2), round(float(orig_face[13]), 2)), # left mouth corner
        ]

        # Extract 112x112 aligned face chip from the original image for maximal feature quality
        aligned_face = recognizer.alignCrop(image_bgr, orig_face)
        feature = recognizer.feature(aligned_face)
        
        # L2 normalize feature
        feat_norm = np.linalg.norm(feature)
        if feat_norm > 1e-6:
            normalized_embedding = (feature / feat_norm).astype(np.float32).flatten()
        else:
            normalized_embedding = feature.astype(np.float32).flatten()

        results.append(
            FaceDetectionResult(
                bbox=(x, y, w, h),
                norm_bbox=norm_bbox,
                confidence=round(conf, 4),
                landmarks=landmarks,
                embedding=normalized_embedding,
                raw_face=orig_face
            )
        )

    return results


def calculate_cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """Compute cosine similarity between two 1D float vectors."""
    n1 = np.linalg.norm(vec1)
    n2 = np.linalg.norm(vec2)
    if n1 < 1e-6 or n2 < 1e-6:
        return 0.0
    return float(np.dot(vec1, vec2) / (n1 * n2))


def map_similarity_to_confidence(similarity: float, threshold: float = 0.38) -> float:
    """
    Map cosine similarity to an intuitive confidence percentage (e.g. 75% to 99.5%).
    SFace cosine distance typical match is >= 0.363.
    """
    if similarity < threshold:
        return round(max(0.0, (similarity / threshold) * 50.0), 1)
    
    # Range [threshold, 0.75] maps to [70.0%, 99.5%]
    denom = max(0.1, 0.75 - threshold)
    ratio = min(1.0, max(0.0, (similarity - threshold) / denom))
    confidence = 70.0 + (ratio * 29.5)
    return round(confidence, 1)


def match_selfie_against_gallery(
    selfie_embedding: np.ndarray,
    candidates: List[Dict],
    threshold: float = 0.38
) -> List[Dict]:
    """
    Compare selfie embedding against list of candidates:
    candidate dict contains: {
        'face_id': int,
        'photo_id': int,
        'embedding': np.ndarray,
        'norm_bbox': dict,
        'confidence': float,
        'photo': dict
    }
    
    Returns deduplicated matching photos ordered by best match confidence.
    """
    if not candidates:
        return []

    # Build matrix for fast batch vector dot product
    embeddings_list = [c["embedding"] for c in candidates]
    mat = np.array(embeddings_list, dtype=np.float32)  # shape: (N, 128)
    
    # Ensure vectors are normalized
    norms = np.linalg.norm(mat, axis=1, keepdims=True)
    norms[norms < 1e-6] = 1.0
    norm_mat = mat / norms

    target_norm = np.linalg.norm(selfie_embedding)
    if target_norm < 1e-6:
        return []
    target_norm_vec = selfie_embedding / target_norm

    # Batch cosine similarity
    similarities = np.dot(norm_mat, target_norm_vec).flatten()

    # Group matches by photo_id
    matches_by_photo: Dict[int, Dict] = {}

    for idx, sim in enumerate(similarities):
        sim_val = float(sim)
        if sim_val >= threshold:
            cand = candidates[idx]
            photo_id = cand["photo_id"]
            confidence = map_similarity_to_confidence(sim_val, threshold)

            matched_face_info = {
                "face_id": cand["face_id"],
                "similarity": round(sim_val, 4),
                "confidence": confidence,
                "norm_bbox": cand["norm_bbox"],
                "detection_confidence": cand.get("confidence", 0.0)
            }

            if photo_id not in matches_by_photo:
                matches_by_photo[photo_id] = {
                    "photo_id": photo_id,
                    "best_similarity": sim_val,
                    "best_confidence": confidence,
                    "matching_faces": [matched_face_info],
                    "photo": cand["photo"]
                }
            else:
                matches_by_photo[photo_id]["matching_faces"].append(matched_face_info)
                if sim_val > matches_by_photo[photo_id]["best_similarity"]:
                    matches_by_photo[photo_id]["best_similarity"] = sim_val
                    matches_by_photo[photo_id]["best_confidence"] = confidence

    # Sort results by highest confidence descending
    results = sorted(matches_by_photo.values(), key=lambda x: x["best_similarity"], reverse=True)
    return results
