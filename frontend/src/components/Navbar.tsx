import React from 'react';
import { Camera, Sparkles, Shield, Upload, ChevronDown, Calendar } from 'lucide-react';
import { Event } from '../types';

interface NavbarProps {
  currentEvent: Event | null;
  onOpenEventSelector: () => void;
  onOpenScanner: () => void;
  onOpenUpload: () => void;
  onOpenAdmin: () => void;
  onGoHome: () => void;
  activeView: 'home' | 'results' | 'admin';
}

export const Navbar: React.FC<NavbarProps> = ({
  currentEvent,
  onOpenEventSelector,
  onOpenScanner,
  onOpenUpload,
  onOpenAdmin,
  onGoHome,
  activeView,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-[#070913]/80 border-b border-white/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <div 
          onClick={onGoHome}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 shadow-lg shadow-purple-500/25 group-hover:scale-105 transition-transform">
            <Camera className="w-5 h-5 text-white" />
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-purple-200 bg-clip-text text-transparent">
                Farewell Face Finder
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                AI Powered
              </span>
            </div>
            <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">
              Every Memory Has You
            </p>
          </div>
        </div>

        {/* Center: Event Selector Pill */}
        <div className="flex items-center gap-2">
          {currentEvent && (
            <button
              onClick={onOpenEventSelector}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-all"
              title="Change farewell event album"
            >
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              <span className="max-w-[120px] sm:max-w-[200px] truncate">{currentEvent.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>

        {/* Right Actions: Dynamic Upload & Find My Photos */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Dynamic Upload Photos Button */}
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold glass-card text-slate-200 hover:text-white hover:bg-white/10 transition-all"
            title="Upload photographs dynamically"
          >
            <Upload className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">Upload Photos</span>
          </button>

          {/* Primary Action: Find My Photos */}
          <button
            onClick={onOpenScanner}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>Find My Photos</span>
          </button>

          {/* Admin Settings Button */}
          <button
            onClick={onOpenAdmin}
            className={`p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all ${
              activeView === 'admin' ? 'bg-white/10 text-purple-400 border-purple-500/30' : ''
            }`}
            title="Admin Portal"
          >
            <Shield className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
