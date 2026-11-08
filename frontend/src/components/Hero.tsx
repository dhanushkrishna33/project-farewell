import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Sparkles, Upload, Zap, ArrowRight, ShieldCheck, HeartHandshake } from 'lucide-react';
import { Event } from '../types';

interface HeroProps {
  currentEvent: Event | null;
  totalPhotos: number;
  totalFaces: number;
  onStartScan: () => void;
  onOpenUpload: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  currentEvent,
  totalPhotos,
  totalFaces,
  onStartScan,
  onOpenUpload,
}) => {
  return (
    <div className="relative min-h-[calc(100vh-5rem)] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 overflow-hidden">
      {/* Background glowing ambient orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-purple-700/20 via-indigo-600/15 to-blue-600/20 rounded-full blur-[130px] pointer-events-none -z-10" />
      <div className="absolute top-2/3 right-10 w-96 h-96 bg-pink-600/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Main Hero Container */}
      <div className="max-w-4xl mx-auto text-center space-y-8">
        {/* Event Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-xs sm:text-sm font-medium text-purple-300 border border-purple-500/30 shadow-inner"
        >
          <Sparkles className="w-4 h-4 text-yellow-400" />
          <span>{currentEvent ? currentEvent.name : 'College Farewell Event'}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        </motion.div>

        {/* Main Headline */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="space-y-4"
        >
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
            Every Memory{' '}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
              Has You
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-base sm:text-xl text-slate-300 leading-relaxed font-light">
            Find every farewell moment you were part of. Scan your face and discover your memories instantly.
          </p>
        </motion.div>

        {/* Explanatory Banner */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-xl mx-auto p-4 rounded-2xl glass-panel border border-white/10 text-xs sm:text-sm text-slate-300 flex items-center gap-3 text-left shadow-lg"
        >
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 shrink-0">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-white">How it works:</p>
            <p className="text-slate-400">
              Upload your farewell memories. Scan your face. Discover every photo featuring you.
            </p>
          </div>
        </motion.div>

        {/* Action Buttons: Face Scanner + Dynamic Upload */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
        >
          {/* Main "Find My Photos" Button (The only search entrypoint) */}
          <button
            onClick={onStartScan}
            className="w-full sm:w-auto relative group flex items-center justify-center gap-3 px-10 py-4 rounded-2xl text-base sm:text-lg font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-xl shadow-purple-600/30 hover:shadow-purple-600/50 hover:scale-[1.03] active:scale-[0.98] transition-all"
          >
            <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Camera className="w-6 h-6 animate-bounce" />
            <span>Find My Photos</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Dynamic Photo Upload Trigger */}
          <button
            onClick={onOpenUpload}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-base font-semibold text-slate-200 glass-card hover:bg-white/10 hover:border-purple-500/40 transition-all"
          >
            <Upload className="w-5 h-5 text-purple-400" />
            <span>Upload Photos</span>
          </button>
        </motion.div>

        {/* Stats & Trust Signals */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto"
        >
          <div className="p-4 rounded-2xl glass-card text-center">
            <div className="text-2xl sm:text-3xl font-black text-white">
              {totalPhotos > 0 ? `${totalPhotos}+` : '550+'}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-medium">Farewell Photos</div>
          </div>

          <div className="p-4 rounded-2xl glass-card text-center">
            <div className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {totalFaces > 0 ? `${totalFaces}+` : 'Multi-Face'}
            </div>
            <div className="text-xs text-slate-400 mt-1 font-medium">Indexed Faces</div>
          </div>

          <div className="p-4 rounded-2xl glass-card text-center">
            <div className="text-2xl sm:text-3xl font-black text-white flex items-center justify-center gap-1">
              <Zap className="w-6 h-6 text-yellow-400" />
              <span>0.3s</span>
            </div>
            <div className="text-xs text-slate-400 mt-1 font-medium">Neural AI Matching</div>
          </div>

          <div className="p-4 rounded-2xl glass-card text-center">
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 flex items-center justify-center gap-1">
              <ShieldCheck className="w-6 h-6" />
              <span>100%</span>
            </div>
            <div className="text-xs text-slate-400 mt-1 font-medium">Private & Non-Stored</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
