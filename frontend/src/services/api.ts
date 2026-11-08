import { Event, Photo, FaceSearchResponse, AdminStats, IndexingStatus } from '../types';

const API_BASE = '/api';

export function getAdminToken(): string | null {
  return localStorage.getItem('admin_token');
}

export function setAdminToken(token: string): void {
  localStorage.setItem('admin_token', token);
}

export function removeAdminToken(): void {
  localStorage.removeItem('admin_token');
}

function getAuthHeaders(): HeadersInit {
  const token = getAdminToken();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ----------------- Events API -----------------
export async function fetchEvents(): Promise<Event[]> {
  const res = await fetch(`${API_BASE}/events`);
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

export async function createEvent(data: { name: string; event_date?: string; description?: string; access_code?: string }): Promise<Event> {
  const res = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create event' }));
    throw new Error(err.detail || 'Failed to create event');
  }
  return res.json();
}

export async function verifyEventCode(eventId: number, accessCode: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/events/${eventId}/verify-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_code: accessCode }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Invalid access code' }));
    throw new Error(err.detail || 'Invalid access code');
  }
  return true;
}

// ----------------- Face Search API -----------------
export async function searchFace(params: {
  eventId?: number;
  accessCode?: string;
  selfieBlob?: Blob;
  imageBase64?: string;
  threshold?: number;
}): Promise<FaceSearchResponse> {
  const formData = new FormData();
  if (params.eventId) formData.append('event_id', params.eventId.toString());
  if (params.accessCode) formData.append('access_code', params.accessCode);
  if (params.threshold) formData.append('threshold', params.threshold.toString());

  if (params.selfieBlob) {
    formData.append('file', params.selfieBlob, 'selfie.jpg');
  } else if (params.imageBase64) {
    formData.append('image_base64', params.imageBase64);
  } else {
    throw new Error('Selfie image is required');
  }

  const res = await fetch(`${API_BASE}/face-search`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Face search failed' }));
    throw new Error(err.detail || 'Face search failed');
  }
  return res.json();
}

export async function submitReport(data: { photoId: number; scanSessionId?: string; reportType: string; notes?: string }) {
  const res = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      photo_id: data.photoId,
      scan_session_id: data.scanSessionId,
      report_type: data.reportType,
      notes: data.notes,
    }),
  });
  if (!res.ok) throw new Error('Failed to submit feedback');
  return res.json();
}

// ----------------- Photos API -----------------
export async function fetchPhotos(params?: {
  eventId?: number;
  status?: string;
  isGroup?: boolean;
  search?: string;
  skip?: number;
  limit?: number;
}): Promise<Photo[]> {
  const query = new URLSearchParams();
  if (params?.eventId) query.append('event_id', params.eventId.toString());
  if (params?.status) query.append('status', params.status);
  if (params?.isGroup !== undefined) query.append('is_group', String(params.isGroup));
  if (params?.search) query.append('search', params.search);
  if (params?.skip) query.append('skip', params.skip.toString());
  if (params?.limit) query.append('limit', params.limit.toString());

  const res = await fetch(`${API_BASE}/photos?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch photos');
  return res.json();
}

export async function fetchPhotoDetail(photoId: number): Promise<Photo> {
  const res = await fetch(`${API_BASE}/photos/${photoId}`);
  if (!res.ok) throw new Error('Failed to fetch photo details');
  return res.json();
}

export async function uploadPhotos(
  eventId: number,
  files: File[],
  autoIndex: boolean = true
): Promise<Photo[]> {
  const formData = new FormData();
  formData.append('event_id', eventId.toString());
  formData.append('auto_index', String(autoIndex));
  for (const f of files) {
    formData.append('files', f);
  }

  const res = await fetch(`${API_BASE}/photos/upload`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Photo upload failed' }));
    throw new Error(err.detail || 'Photo upload failed');
  }
  return res.json();
}

export async function importLocalPhotos(
  eventId: number,
  maxPhotos?: number,
  autoIndex: boolean = true
): Promise<{ imported_count: number; total_found: number; message: string }> {
  const formData = new FormData();
  formData.append('event_id', eventId.toString());
  formData.append('auto_index', String(autoIndex));
  if (maxPhotos) formData.append('max_photos', maxPhotos.toString());

  const res = await fetch(`${API_BASE}/photos/import-local`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Local import failed' }));
    throw new Error(err.detail || 'Local import failed');
  }
  return res.json();
}

export async function deletePhoto(photoId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/photos/${photoId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete photo');
}

export async function triggerIndexing(eventId?: number): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/photos/index${eventId ? `?event_id=${eventId}` : ''}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to trigger indexing');
  return res.json();
}

export async function retryFailedPhotos(eventId?: number): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/photos/index/retry-failed${eventId ? `?event_id=${eventId}` : ''}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to retry photos');
  return res.json();
}

export async function fetchIndexingStatus(): Promise<IndexingStatus> {
  const res = await fetch(`${API_BASE}/photos/index/status`);
  if (!res.ok) throw new Error('Failed to get indexing status');
  return res.json();
}

// ----------------- Admin API -----------------
export async function adminLogin(username: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Invalid admin credentials' }));
    throw new Error(err.detail || 'Invalid admin credentials');
  }
  const data = await res.json();
  setAdminToken(data.access_token);
  return data.access_token;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await fetch(`${API_BASE}/admin/stats`);
  if (!res.ok) throw new Error('Failed to fetch admin stats');
  return res.json();
}

export async function fetchLocalPhotosCount(): Promise<{ count: number; sample_files: string[]; path: string }> {
  const res = await fetch(`${API_BASE}/admin/local-photos-count`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Failed to check local photos');
  return res.json();
}

export async function updateAdminSettings(settings: { similarity_threshold?: number }) {
  const res = await fetch(`${API_BASE}/admin/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}
