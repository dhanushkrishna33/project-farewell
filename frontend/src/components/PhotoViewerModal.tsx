import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Share2, 
  Sparkles, 
  Flag, 
  Scan, 
  Check, 
  Users, 
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { Photo } from '../types';
import { submitReport, fetchPhotoDetail } from '../services/api';

interface PhotoViewerModalProps {
  photo: Photo | null;
  matchScore?: number;
  allPhotos: Photo[];
  onClose: () => void;
  onNavigate: (nextPhoto: Photo) => void;
  scanSessionId?: string;
}

export const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({
  photo,
  matchScore,
  allPhotos,
  onClose,
  onNavigate,
  scanSessionId,
}) => {
  const [showFaceBoxes, setShowFaceBoxes] = useState(true);
  const [fullPhotoData, setFullPhotoData] = useState<Photo | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('wrong_match');
  const [reportNotes, setReportNotes] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  // Fetch detailed photo with all detected face bounding boxes
  useEffect(() => {
    if (photo) {
      setFullPhotoData(photo);
      fetchPhotoDetail(photo.id)
        .then((detail) => setFullPhotoData(detail))
        .catch(() => {});
    }
  }, [photo]);

  // Keyboard navigation (Escape, Left, Right)
  const currentIndex = allPhotos.findIndex((p) => p.id === photo?.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allPhotos.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev) {
      onNavigate(allPhotos[currentIndex - 1]);
    }
  }, [hasPrev, currentIndex, allPhotos, onNavigate]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      onNavigate(allPhotos[currentIndex + 1]);
    }
  }, [hasNext, currentIndex, allPhotos, onNavigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handlePrev, handleNext]);

  if (!photo) return null;

  const activePhoto = fullPhotoData || photo;
  const photoUrl = '/' + (activePhoto.storage_path || activePhoto.thumbnail_path);

  // Share photo
  const handleShare = async () => {
    const fullUrl = window.location.origin + photoUrl;
    if (navigator.share) {
      try {
        await navigator.share({
          title: activePhoto.filename,
          text: 'Check out this farewell event memory!',
          url: fullUrl,
        });
      } catch (err) {}
    } else {
      await navigator.clipboard.writeText(fullUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Submit bad match report
  const handleSendReport = async () => {
    try {
      await submitReport({
        photoId: activePhoto.id,
        scanSessionId,
        reportType,
        notes: reportNotes,
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReportSuccess(false);
        setShowReportModal(false);
      }, 1500);
    } catch (err) {
      alert('Failed to submit report. Please try again.');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-2xl p-2 sm:p-6 overflow-hidden">
        {/* Top Header Controls */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between text-white pointer-events-auto">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm sm:text-base truncate max-w-[200px] sm:max-w-md">
              {activePhoto.filename}
            </span>
            {matchScore !== undefined && (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{matchScore}% Match</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Bounding Boxes Button */}
            {activePhoto.faces && activePhoto.faces.length > 0 && (
              <button
                onClick={() => setShowFaceBoxes(!showFaceBoxes)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  showFaceBoxes
                    ? 'bg-purple-600/30 text-purple-300 border-purple-500/40'
                    : 'bg-white/10 text-slate-300 border-white/10 hover:bg-white/15'
                }`}
                title="Toggle AI Face Detection Bounding Boxes"
              >
                <Scan className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {showFaceBoxes ? 'Hide Faces' : 'Highlight Faces'} ({activePhoto.faces.length})
                </span>
              </button>
            )}

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
              title="Share photo"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            {/* Download Original DSLR File */}
            <a
              href={`/api/photos/${activePhoto.id}/download`}
              download={activePhoto.filename}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all"
              title="Download original high-resolution photo"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download DSLR</span>
            </a>

            {/* Report Incorrect Match */}
            <button
              onClick={() => setShowReportModal(true)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-300 transition-colors"
              title="Report incorrect face match"
            >
              <Flag className="w-4 h-4" />
            </button>

            {/* Close Lightbox */}
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Previous Image Arrow */}
        {hasPrev && (
          <button
            onClick={handlePrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-110"
            title="Previous photo (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next Image Arrow */}
        {hasNext && (
          <button
            onClick={handleNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/60 hover:bg-black/90 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-110"
            title="Next photo (Right Arrow)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Main Image Display Viewport */}
        <div className="relative max-w-6xl max-h-[82vh] flex items-center justify-center">
          <div className="relative inline-block max-w-full max-h-[82vh]">
            <img
              src={photoUrl}
              alt={activePhoto.filename}
              className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl select-none"
            />

            {/* Face Detection Bounding Boxes Overlay */}
            {showFaceBoxes && activePhoto.faces && activePhoto.faces.map((fc, idx) => {
              if (!fc.norm_bbox) return null;
              const { x, y, w, h } = fc.norm_bbox;

              return (
                <div
                  key={fc.id || idx}
                  style={{
                    left: `${x * 100}%`,
                    top: `${y * 100}%`,
                    width: `${w * 100}%`,
                    height: `${h * 100}%`,
                  }}
                  className="absolute border-2 border-purple-400/90 rounded-lg shadow-lg pointer-events-none transition-all"
                >
                  <div className="absolute -top-6 left-0 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md border border-purple-500/40 text-[10px] text-purple-300 font-mono whitespace-nowrap">
                    Face #{idx + 1} ({Math.round(fc.detection_confidence * 100)}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Counter Bar */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs text-slate-400 font-medium z-20">
          <span>{currentIndex + 1} of {allPhotos.length}</span>
        </div>

        {/* Report Incorrect Match Modal Dialog */}
        {showReportModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80">
            <div className="w-full max-w-md rounded-3xl glass-panel p-6 space-y-4 border border-white/20 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Report Matching Issue</span>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-300">
                Help us improve the AI accuracy. Please tell us what was wrong with this photo match:
              </p>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Issue Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="wrong_match">This is not my face (Incorrect Match)</option>
                  <option value="another_person">Matched another classmate instead of me</option>
                  <option value="poor_quality">Photo quality or crop is distorted</option>
                  <option value="privacy_request">I prefer this photo removed</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Additional Notes (Optional)</label>
                <textarea
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="Describe where you were sitting or the issue..."
                  rows={3}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {reportSuccess ? (
                <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-semibold text-center flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Report submitted successfully! Thank you.</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="flex-1 py-2.5 rounded-xl glass-card text-xs font-medium text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendReport}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all"
                  >
                    Submit Report
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
