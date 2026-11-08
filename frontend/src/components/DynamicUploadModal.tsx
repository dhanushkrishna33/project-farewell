import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  X, 
  HardDrive, 
  Sparkles, 
  CheckCircle, 
  Loader2, 
  Image as ImageIcon, 
  AlertCircle,
  FolderUp,
  Camera
} from 'lucide-react';
import { Event, IndexingStatus } from '../types';
import { 
  uploadPhotos, 
  importLocalPhotos, 
  fetchLocalPhotosCount, 
  fetchIndexingStatus 
} from '../services/api';

interface DynamicUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEvent: Event | null;
  events: Event[];
  onUploadSuccess: () => void;
  onStartFaceScan: () => void;
}

export const DynamicUploadModal: React.FC<DynamicUploadModalProps> = ({
  isOpen,
  onClose,
  currentEvent,
  events,
  onUploadSuccess,
  onStartFaceScan,
}) => {
  const [selectedEventId, setSelectedEventId] = useState<number>(currentEvent?.id || 1);
  const [localCount, setLocalCount] = useState<number>(0);
  const [isImportingLocal, setIsImportingLocal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState<string | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [indexingStatus, setIndexingStatus] = useState<IndexingStatus | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (currentEvent) {
      setSelectedEventId(currentEvent.id);
    }
  }, [currentEvent]);

  // Fetch local photos count
  useEffect(() => {
    if (isOpen) {
      fetchLocalPhotosCount()
        .then((res) => setLocalCount(res.count))
        .catch(() => {});
      
      fetchIndexingStatus()
        .then((st) => setIndexingStatus(st))
        .catch(() => {});
    }
  }, [isOpen]);

  // Poll indexing status when uploading or running
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      fetchIndexingStatus()
        .then((st) => {
          setIndexingStatus(st);
          if (st.is_running) {
            onUploadSuccess();
          }
        })
        .catch(() => {});
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, onUploadSuccess]);

  if (!isOpen) return null;

  // 1-Click Local Importer
  const handleImportLocal = async () => {
    setIsImportingLocal(true);
    setErrorMessage(null);
    setUploadStatusText('Importing local photos and generating web thumbnails...');
    try {
      const res = await importLocalPhotos(selectedEventId, undefined, true);
      setUploadSuccessMessage(res.message);
      onUploadSuccess();
      setLocalCount(0);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to import local photos');
    } finally {
      setIsImportingLocal(false);
      setUploadStatusText(null);
    }
  };

  // Upload custom selected files / folders
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setErrorMessage(null);
    setUploadSuccessMessage(null);

    try {
      const fileList = Array.from(files);
      const chunkSize = 20;
      let totalUploaded = 0;

      for (let i = 0; i < fileList.length; i += chunkSize) {
        const chunk = fileList.slice(i, i + chunkSize);
        setUploadStatusText(`Uploading ${i + 1} to ${Math.min(i + chunkSize, fileList.length)} of ${fileList.length} photos...`);
        await uploadPhotos(selectedEventId, chunk, true);
        totalUploaded += chunk.length;
      }

      setUploadSuccessMessage(`Successfully uploaded ${totalUploaded} photographs! AI Face Indexing started in background.`);
      onUploadSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadStatusText(null);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl rounded-3xl glass-panel border border-white/10 shadow-2xl p-6 sm:p-8 space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Upload Farewell Photos</h3>
                <p className="text-xs text-slate-400">
                  Add photos dynamically to detect faces and match them instantly.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Event Album Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Target Farewell Album</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(Number(e.target.value))}
              className="w-full bg-slate-900 border border-white/10 text-white text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-purple-500"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.photo_count} photos, {ev.indexed_count} indexed)
                </option>
              ))}
            </select>
          </div>

          {/* 1-Click Local Photos Import Box (if available) */}
          {localCount > 0 && (
            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold">
                  <HardDrive className="w-4 h-4" />
                  <span>{localCount} Farewell Photos Ready to Import</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-400/20 text-indigo-200">
                  Instant
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Found {localCount} DSLR photos in your local workspace. Import them now to index all faces for scanning.
              </p>
              <button
                onClick={handleImportLocal}
                disabled={isImportingLocal || isUploading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isImportingLocal ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Importing & Indexing {localCount} Photos...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Import All {localCount} Local Photos (1-Click)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Dynamic Drag & Drop Upload Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-8 rounded-2xl border-2 border-dashed border-white/20 hover:border-purple-500/60 bg-white/5 hover:bg-white/[0.08] transition-all cursor-pointer text-center space-y-3 group"
          >
            <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Drag and drop your photos here, or click to browse
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Supports JPG, JPEG, PNG, WEBP (individual photos or entire folders)
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md shadow-purple-600/30"
              >
                Select Photos
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  folderInputRef.current?.click();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl glass-card text-xs font-semibold text-slate-200 hover:text-white"
              >
                <FolderUp className="w-3.5 h-3.5 text-purple-400" />
                <span>Upload Entire Folder</span>
              </button>
            </div>
          </div>

          {/* Hidden Inputs */}
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

          {/* Progress / Status feedback */}
          {uploadStatusText && (
            <div className="p-3.5 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-200 text-xs flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-purple-400" />
              <span>{uploadStatusText}</span>
            </div>
          )}

          {uploadSuccessMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{uploadSuccessMessage}</span>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onStartFaceScan();
                }}
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 flex items-center gap-1"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Scan Now</span>
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Live Background Face Indexing Indicator */}
          {indexingStatus && indexingStatus.is_running && (
            <div className="p-3 rounded-2xl bg-slate-900 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                  <span>AI Indexing in Background ({indexingStatus.indexed_photos}/{indexingStatus.total_photos} photos)</span>
                </span>
                <span className="text-slate-400">{indexingStatus.progress_percentage}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${indexingStatus.progress_percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Footer CTA */}
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <span className="text-xs text-slate-400">
              Uploaded photos are indexed immediately.
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl glass-card text-xs font-semibold text-slate-200 hover:text-white"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
