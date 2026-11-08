export interface Event {
  id: number;
  name: string;
  event_date?: string;
  description?: string;
  created_at: string;
  photo_count: number;
  indexed_count: number;
  requires_code: boolean;
}

export interface NormBBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Face {
  id: number;
  photo_id: number;
  norm_bbox?: NormBBox;
  bbox_x: number;
  bbox_y: number;
  bbox_w: number;
  bbox_h: number;
  detection_confidence: number;
}

export interface Photo {
  id: number;
  event_id: number;
  filename: string;
  storage_path: string;
  thumbnail_path?: string;
  image_width: number;
  image_height: number;
  file_size: number;
  face_count: number;
  is_group: boolean;
  processing_status: 'uploaded' | 'processing' | 'indexed' | 'failed';
  error_message?: string;
  upload_date: string;
  indexed_at?: string;
  faces?: Face[];
}

export interface MatchedFaceInfo {
  face_id: number;
  similarity: number;
  confidence: number;
  norm_bbox?: NormBBox;
  detection_confidence: number;
}

export interface MatchResultItem {
  photo_id: number;
  best_similarity: number;
  best_confidence: number;
  matching_faces: MatchedFaceInfo[];
  photo: Photo;
}

export interface FaceSearchResponse {
  search_id: string;
  total_matches: number;
  matched_photos: MatchResultItem[];
  detected_selfie_faces: number;
  message: string;
}

export interface AdminStats {
  total_photos: number;
  total_faces_detected: number;
  photos_indexed: number;
  photos_remaining: number;
  failed_processing: number;
  total_events: number;
  total_searches: number;
  similarity_threshold: number;
  is_indexing_running: boolean;
}

export interface IndexingStatus {
  is_running: boolean;
  current_filename?: string;
  total_photos: number;
  indexed_photos: number;
  processing_photos: number;
  remaining_photos: number;
  failed_photos: number;
  total_faces: number;
  progress_percentage: number;
  elapsed_seconds: number;
  last_error?: string;
}
