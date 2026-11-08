import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  Camera, 
  ArrowLeft, 
  Download, 
  Share2, 
  Maximize2, 
  Filter, 
  Sparkles, 
  Users, 
  User, 
  SlidersHorizontal,
  AlertCircle,
  HelpCircle,
  Check
} from 'lucide-react';
import { MatchResultItem, Photo } from '../types';

interface GalleryResultsProps {
  results: MatchResultItem[];
  searchId: string;
  eventName?: string;
  onScanAgain: () => void;
  onBackToHome: () => void;
  onSelectPhoto: (photo: Photo, matchingScore?: number) => void;
}

export const GalleryResults: React.FC<GalleryResultsProps> = ({
  results,
  searchId,
  eventName = 'College Farewell',
  onScanAgain,
  onBackToHome,
  onSelectPhoto,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'solo' | 'group'>('all');
  const [sortBy, setSortBy] = useState<'best' | 'newest' | 'oldest'>('best');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Trigger celebration confetti on mount if matches exist
  useEffect(() => {
    if (results.length > 0) {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#a855f7', '#3b82f6', '#ec4899', '#eab308']
      });
    }
  }, [results]);

  // Compute counts
  const soloCount = useMemo(() => results.filter((r) => r.photo.face_count === 1).length, [results]);
  const groupCount = useMemo(() => results.filter((r) => r.photo.face_count > 1).length, [results]);
  const bestConfidence = useMemo(() => {
    if (results.length === 0) return 0;
    return Math.max(...results.map((r) => r.best_confidence));
  }, [results]);

  // Filter and sort items
  const filteredAndSorted = useMemo(() => {
    let list = [...results];

    // Filter
    if (filterType === 'solo') {
      list = list.filter((r) => r.photo.face_count === 1);
    } else if (filterType === 'group') {
      list = list.filter((r) => r.photo.face_count > 1);
    }

    // Sort
    if (sortBy === 'best') {
      list.sort((a, b) => b.best_similarity - a.best_similarity);
    } else if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.photo.upload_date).getTime() - new Date(a.photo.upload_date).getTime());
    } else if (sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.photo.upload_date).getTime() - new Date(b.photo.upload_date).getTime());
    }

    return list;
  }, [results, filterType, sortBy]);

  // Share photo
  const handleShare = async (item: MatchResultItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const photoUrl = window.location.origin + '/' + (item.photo.thumbnail_path || item.photo.storage_path);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `My Farewell Moment - ${item.photo.filename}`,
          text: `Found my photo in ${eventName} using Farewell Face Finder!`,
          url: photoUrl,
        });
      } catch (err) {
        // user cancelled share
      }
    } else {
      await navigator.clipboard.writeText(photoUrl);
      setCopiedId(item.photo_id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Direct download
  const handleDownload = (item: MatchResultItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const downloadUrl = `/api/photos/${item.photo.id}/download`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = item.photo.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Top Navigation & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-2 px-4 py-2 rounded-xl glass-card text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={onScanAgain}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>Scan Again</span>
          </button>
        </div>
      </div>

      {/* Main Results Header */}
      <div className="space-y-3 text-center sm:text-left">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{eventName}</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          Your Farewell Memories
        </h2>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl font-light">
          We found photographs that may contain your face.
        </p>
      </div>

      {/* Summary Metrics Banner */}
      {results.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl glass-card">
            <div className="text-2xl sm:text-3xl font-black text-white">{results.length}</div>
            <div className="text-xs text-slate-400 mt-0.5">Matching Photographs</div>
          </div>
          <div className="p-4 rounded-2xl glass-card">
            <div className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              {bestConfidence}%
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Top Match Confidence</div>
          </div>
          <div className="p-4 rounded-2xl glass-card">
            <div className="text-2xl sm:text-3xl font-black text-purple-300">{soloCount}</div>
            <div className="text-xs text-slate-400 mt-0.5">Solo Portraits</div>
          </div>
          <div className="p-4 rounded-2xl glass-card">
            <div className="text-2xl sm:text-3xl font-black text-blue-300">{groupCount}</div>
            <div className="text-xs text-slate-400 mt-0.5">Group Celebrations</div>
          </div>
        </div>
      )}

      {/* Filter and Sort Toolbar */}
      {results.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl glass-panel">
          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterType === 'all'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              All Matches ({results.length})
            </button>

            <button
              onClick={() => setFilterType('solo')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterType === 'solo'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Solo Photos ({soloCount})</span>
            </button>

            <button
              onClick={() => setFilterType('group')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterType === 'group'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Group Moments ({groupCount})</span>
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 border border-white/10 text-white text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-500"
            >
              <option value="best">Best Face Match</option>
              <option value="newest">Newest Photograph</option>
              <option value="oldest">Oldest Photograph</option>
            </select>
          </div>
        </div>
      )}

      {/* Gallery Photo Grid */}
      {filteredAndSorted.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredAndSorted.map((item, idx) => {
            const photoUrl = '/' + (item.photo.thumbnail_path || item.photo.storage_path);
            const isCopied = copiedId === item.photo_id;

            return (
              <motion.div
                key={item.photo_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.04 }}
                onClick={() => onSelectPhoto(item.photo, item.best_confidence)}
                className="group relative rounded-3xl glass-card overflow-hidden cursor-pointer flex flex-col"
              >
                {/* Image Container with Aspect Ratio */}
                <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden">
                  <img
                    src={photoUrl}
                    alt={item.photo.filename}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Gradient Scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20 opacity-80 group-hover:opacity-100 transition-opacity" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    {/* Match Confidence Badge */}
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-lg">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>{item.best_confidence}% Match</span>
                    </div>

                    {/* Group vs Solo Badge */}
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-slate-300 text-[11px] font-medium">
                      {item.photo.face_count > 1 ? (
                        <>
                          <Users className="w-3 h-3 text-blue-400" />
                          <span>{item.photo.face_count} Faces</span>
                        </>
                      ) : (
                        <>
                          <User className="w-3 h-3 text-purple-400" />
                          <span>Solo</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Hover Quick Actions */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleShare(item, e)}
                      className="p-2 rounded-xl bg-black/70 hover:bg-black text-white backdrop-blur-md border border-white/20 transition-all"
                      title="Share photo"
                    >
                      {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => handleDownload(item, e)}
                      className="p-2 rounded-xl bg-black/70 hover:bg-black text-white backdrop-blur-md border border-white/20 transition-all"
                      title="Download original DSLR photo"
                    >
                      <Download className="w-4 h-4 text-purple-400" />
                    </button>
                  </div>
                </div>

                {/* Card Meta Footer */}
                <div className="p-4 flex items-center justify-between text-xs text-slate-400">
                  <div className="truncate max-w-[180px]">
                    <span className="font-medium text-slate-200 block truncate">
                      {item.photo.filename}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(item.photo.upload_date).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-purple-400 group-hover:translate-x-0.5 transition-transform">
                    <span>View</span>
                    <Maximize2 className="w-3.5 h-3.5" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="py-20 text-center space-y-6 max-w-md mx-auto">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <Camera className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">No Matching Photographs Found</h3>
            <p className="text-sm text-slate-400">
              No matching photographs found. Try another selfie with better lighting, facing the camera directly.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={onScanAgain}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-purple-600/30 transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Scan Again</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
