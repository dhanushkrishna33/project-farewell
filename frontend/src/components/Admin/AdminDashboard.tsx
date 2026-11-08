import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Upload, 
  Play, 
  Square, 
  RotateCcw, 
  Trash2, 
  Search, 
  FolderPlus, 
  Sparkles, 
  Sliders, 
  Image as ImageIcon, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  HardDrive, 
  Eye, 
  Plus, 
  X,
  Layers,
  ArrowRight
} from 'lucide-react';
import { AdminStats, IndexingStatus, Photo, Event } from '../../types';
import { 
  fetchAdminStats, 
  fetchIndexingStatus, 
  triggerIndexing, 
  retryFailedPhotos, 
  uploadPhotos, 
  importLocalPhotos, 
  fetchLocalPhotosCount, 
  fetchPhotos, 
  deletePhoto, 
  updateAdminSettings, 
  createEvent 
} from '../../services/api';

interface AdminDashboardProps {
  events: Event[];
  onRefreshEvents: () => void;
  onSelectPhoto: (photo: Photo) => void;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  events,
  onRefreshEvents,
  onSelectPhoto,
  onLogout,
}) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [indexingStatus, setIndexingStatus] = useState<IndexingStatus | null>(null);
  const [localCount, setLocalCount] = useState<number>(0);
  const [isImportingLocal, setIsImportingLocal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<number>(events[0]?.id || 1);

  // Photos management
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photosSearch, setPhotosSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);

  // Upload state
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  // Settings
  const [threshold, setThreshold] = useState<number>(0.38);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Create event modal
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventCode, setNewEventCode] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');

  // Polling stats and indexing progress
  const loadStatsAndStatus = useCallback(async () => {
    try {
      const [st, idx] = await Promise.all([fetchAdminStats(), fetchIndexingStatus()]);
      setStats(st);
      setIndexingStatus(idx);
      setThreshold(st.similarity_threshold);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    }
  }, []);

  const loadPhotos = useCallback(async () => {
    setIsLoadingPhotos(true);
    try {
      const data = await fetchPhotos({
        eventId: selectedEventId,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: photosSearch.trim() || undefined,
        limit: 80,
      });
      setPhotos(data);
    } catch (err) {
      console.error('Error fetching photos:', err);
    } finally {
      setIsLoadingPhotos(false);
    }
  }, [selectedEventId, statusFilter, photosSearch]);

  useEffect(() => {
    loadStatsAndStatus();
    fetchLocalPhotosCount()
      .then((res) => setLocalCount(res.count))
      .catch(() => {});
  }, [loadStatsAndStatus]);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  // Periodic polling when indexing is active
  useEffect(() => {
    const timer = setInterval(() => {
      fetchIndexingStatus()
        .then((idx) => {
          setIndexingStatus(idx);
          if (idx.is_running) {
            loadStatsAndStatus();
            loadPhotos();
          }
        })
        .catch(() => {});
    }, 2500);

    return () => clearInterval(timer);
  }, [loadStatsAndStatus, loadPhotos]);

  // Handle 1-Click Local Import
  const handleImportLocal = async () => {
    if (!selectedEventId) return;
    setIsImportingLocal(true);
    try {
      const res = await importLocalPhotos(selectedEventId);
      alert(`Import complete! ${res.message}`);
      await loadStatsAndStatus();
      await loadPhotos();
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    } finally {
      setIsImportingLocal(false);
    }
  };

  // Trigger Indexing
  const handleStartIndexing = async () => {
    try {
      await triggerIndexing(selectedEventId);
      await loadStatsAndStatus();
    } catch (err: any) {
      alert(`Could not start indexing: ${err.message}`);
    }
  };

  // Retry Failed Photos
  const handleRetryFailed = async () => {
    try {
      await retryFailedPhotos(selectedEventId);
      await loadStatsAndStatus();
      await loadPhotos();
    } catch (err: any) {
      alert(`Retry failed: ${err.message}`);
    }
  };

  // Handle file uploads
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(`Uploading ${files.length} photographs...`);

    try {
      const fileList = Array.from(files);
      // Upload in chunks of 20 to avoid payload limits
      const chunkSize = 20;
      let uploadedCount = 0;

      for (let i = 0; i < fileList.length; i += chunkSize) {
        const chunk = fileList.slice(i, i + chunkSize);
        setUploadProgress(`Uploading ${i + 1} to ${Math.min(i + chunkSize, fileList.length)} of ${fileList.length}...`);
        await uploadPhotos(selectedEventId, chunk, true);
        uploadedCount += chunk.length;
      }

      setUploadProgress(`Uploaded ${uploadedCount} photos successfully!`);
      setTimeout(() => setUploadProgress(null), 3000);
      await loadStatsAndStatus();
      await loadPhotos();
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
      setUploadProgress(null);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  // Handle photo deletion
  const handleDeletePhoto = async (photoId: number, filename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete ${filename}? Face embeddings will be deleted permanently.`)) {
      return;
    }
    try {
      await deletePhoto(photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      await loadStatsAndStatus();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await updateAdminSettings({ similarity_threshold: threshold });
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 2000);
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Create Event
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const ev = await createEvent({
        name: newEventName.trim(),
        event_date: newEventDate || undefined,
        access_code: newEventCode.trim() || undefined,
        description: newEventDesc.trim() || undefined,
      });
      setShowCreateEvent(false);
      setNewEventName('');
      setNewEventDate('');
      setNewEventCode('');
      setNewEventDesc('');
      onRefreshEvents();
      setSelectedEventId(ev.id);
    } catch (err: any) {
      alert(err.message || 'Failed to create event');
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-black text-white">Admin Control Center</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                Online
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Manage farewell albums, batch uploads, face embeddings, and AI threshold settings.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(Number(e.target.value))}
            className="bg-slate-900 border border-white/10 text-white text-xs sm:text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.photo_count} photos)
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowCreateEvent(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass-card text-xs font-semibold text-slate-200 hover:text-white"
            title="Create new event"
          >
            <Plus className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">New Album</span>
          </button>

          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Primary Statistics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl glass-card">
          <div className="text-2xl sm:text-3xl font-black text-white">
            {stats ? stats.total_photos : '...'}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
            <span>Total Photos</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card">
          <div className="text-2xl sm:text-3xl font-black text-purple-300">
            {stats ? stats.total_faces_detected : '...'}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>Faces Detected</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card">
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">
            {stats ? stats.photos_indexed : '...'}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Photos Indexed</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card">
          <div className="text-2xl sm:text-3xl font-black text-amber-400">
            {stats ? stats.photos_remaining : '...'}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Remaining</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card col-span-2 sm:col-span-1">
          <div className="text-2xl sm:text-3xl font-black text-red-400">
            {stats ? stats.failed_processing : '...'}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            <span>Failed</span>
          </div>
        </div>
      </div>

      {/* Real-Time Face Indexing & Local Import Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Indexing Status Card (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl glass-panel space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-white text-base">AI Face Recognition Indexing Worker</h3>
            </div>
            {indexingStatus?.is_running ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Indexing in Background</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-white/5 text-slate-400 text-xs font-semibold">
                Idle
              </span>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-400">
                {indexingStatus?.current_filename
                  ? `Processing: ${indexingStatus.current_filename}`
                  : indexingStatus?.remaining_photos === 0
                  ? 'All uploaded photographs have been indexed!'
                  : 'Ready to process uploaded photos'}
              </span>
              <span className="text-purple-300 font-bold">
                {indexingStatus ? `${indexingStatus.progress_percentage}%` : '0%'}
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${indexingStatus?.progress_percentage || 0}%` }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleStartIndexing}
              disabled={indexingStatus?.is_running}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{indexingStatus?.is_running ? 'Indexing...' : 'Start / Resume Indexing'}</span>
            </button>

            {stats && stats.failed_processing > 0 && (
              <button
                onClick={handleRetryFailed}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry {stats.failed_processing} Failed</span>
              </button>
            )}
          </div>
        </div>

        {/* 1-Click Local Farewell Collection Importer (1 col) */}
        <div className="p-6 rounded-3xl glass-panel space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-400">
              <HardDrive className="w-5 h-5" />
              <h3 className="font-bold text-white text-base">Local Photos Detected</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              We detected <span className="font-bold text-white">{localCount} original farewell photos</span> directly in your workspace directory!
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200">
            <p className="font-medium">1-Click Fast Import:</p>
            <p className="text-[11px] text-indigo-300/80 mt-0.5">
              Generates web thumbnails and queues all DSLR photos into the AI recognition pipeline.
            </p>
          </div>

          <button
            onClick={handleImportLocal}
            disabled={isImportingLocal || localCount === 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            {isImportingLocal ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Importing Photos...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Import Local Farewell Collection ({localCount})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Photo Upload & AI Threshold Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Zone (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl glass-panel space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-white text-base">Upload Photographs</h3>
            </div>
            <span className="text-xs text-slate-400">JPG, PNG, WEBP</span>
          </div>

          {/* Drag & Drop Visual Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-8 rounded-2xl border-2 border-dashed border-white/20 hover:border-purple-500/60 bg-white/5 hover:bg-white/[0.07] transition-all cursor-pointer text-center space-y-3 group"
          >
            <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Drag and drop farewell photos here, or click to browse
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Select multiple files or an entire folder
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
              >
                Choose Photos
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  folderInputRef.current?.click();
                }}
                className="px-4 py-2 rounded-xl glass-card text-xs font-semibold text-slate-200 hover:text-white"
              >
                Upload Entire Folder
              </button>
            </div>
          </div>

          {/* Hidden inputs */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFilesSelected}
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            // @ts-ignore
            webkitdirectory="true"
            className="hidden"
            onChange={handleFilesSelected}
          />

          {uploadProgress && (
            <div className="p-3 rounded-xl bg-purple-500/20 text-purple-200 text-xs flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>{uploadProgress}</span>
            </div>
          )}
        </div>

        {/* AI Similarity Threshold Slider (1 col) */}
        <div className="p-6 rounded-3xl glass-panel space-y-5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-white text-base">Similarity Threshold</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Adjust the cosine distance cutoff used to match faces.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Current Threshold:</span>
              <span className="text-base font-black text-purple-300">{threshold.toFixed(2)}</span>
            </div>

            <input
              type="range"
              min="0.25"
              max="0.65"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />

            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.25 (More Matches)</span>
              <span>0.38 (Recommended)</span>
              <span>0.65 (Strictest)</span>
            </div>
          </div>

          {settingsSuccess && (
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-semibold text-center">
              Settings updated!
            </div>
          )}

          <button
            onClick={handleSaveSettings}
            disabled={isSavingSettings}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all"
          >
            {isSavingSettings ? 'Saving...' : 'Apply Threshold'}
          </button>
        </div>
      </div>

      {/* Photo Management Explorer */}
      <div className="p-6 rounded-3xl glass-panel space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="font-bold text-white text-lg">Indexed Photo Gallery</h3>
            <p className="text-xs text-slate-400">
              Click any photo to inspect detected face bounding boxes or delete unwanted photos.
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search filename..."
                value={photosSearch}
                onChange={(e) => setPhotosSearch(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Statuses</option>
              <option value="indexed">Indexed Only</option>
              <option value="uploaded">Uploaded (Queued)</option>
              <option value="failed">Failed Only</option>
            </select>
          </div>
        </div>

        {/* Photos Grid */}
        {isLoadingPhotos ? (
          <div className="py-16 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            <span className="text-xs">Loading photos...</span>
          </div>
        ) : photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {photos.map((p) => {
              const photoUrl = '/' + (p.thumbnail_path || p.storage_path);
              return (
                <div
                  key={p.id}
                  onClick={() => onSelectPhoto(p)}
                  className="group relative rounded-2xl glass-card overflow-hidden cursor-pointer flex flex-col"
                >
                  <div className="aspect-square bg-slate-950 overflow-hidden relative">
                    <img
                      src={photoUrl}
                      alt={p.filename}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />

                    {/* Status Badge */}
                    <div className="absolute top-2 left-2">
                      {p.processing_status === 'indexed' && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/80 text-white text-[10px] font-bold">
                          {p.face_count} {p.face_count === 1 ? 'Face' : 'Faces'}
                        </span>
                      )}
                      {p.processing_status === 'uploaded' && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/80 text-white text-[10px] font-bold">
                          Queued
                        </span>
                      )}
                      {p.processing_status === 'failed' && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/80 text-white text-[10px] font-bold">
                          Failed
                        </span>
                      )}
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => handleDeletePhoto(p.id, p.filename, e)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-2.5 text-[11px] text-slate-300 truncate">
                    <span className="font-medium block truncate">{p.filename}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <ImageIcon className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-xs">No photos found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showCreateEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-md rounded-3xl glass-panel p-6 space-y-4 border border-white/20 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Create Farewell Event Album</h3>
              <button onClick={() => setShowCreateEvent(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Album Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Farewell 2019 - CSE Batch"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Event Date</label>
                <input
                  type="date"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Access Code (Optional for Private Events)</label>
                <input
                  type="text"
                  placeholder="Leave empty for public access"
                  value={newEventCode}
                  onChange={(e) => setNewEventCode(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Description</label>
                <textarea
                  rows={2}
                  placeholder="Ceremony description..."
                  value={newEventDesc}
                  onChange={(e) => setNewEventDesc(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateEvent(false)}
                  className="flex-1 py-2.5 rounded-xl glass-card text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  Create Album
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
