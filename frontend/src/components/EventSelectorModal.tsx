import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Lock, Check, X, Sparkles, ChevronRight, AlertCircle } from 'lucide-react';
import { Event } from '../types';
import { verifyEventCode } from '../services/api';

interface EventSelectorModalProps {
  isOpen: boolean;
  events: Event[];
  currentEvent: Event | null;
  onSelectEvent: (event: Event, accessCode?: string) => void;
  onClose: () => void;
}

export const EventSelectorModal: React.FC<EventSelectorModalProps> = ({
  isOpen,
  events,
  currentEvent,
  onSelectEvent,
  onClose,
}) => {
  const [selected, setSelected] = useState<Event | null>(currentEvent || events[0] || null);
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!selected) return;

    if (selected.requires_code) {
      if (!accessCode.trim()) {
        setError('Please enter the access code provided by your event organizer.');
        return;
      }
      setIsVerifying(true);
      setError(null);
      try {
        await verifyEventCode(selected.id, accessCode.trim());
        onSelectEvent(selected, accessCode.trim());
        onClose();
      } catch (err: any) {
        setError(err.message || 'Incorrect access code');
      } finally {
        setIsVerifying(false);
      }
    } else {
      onSelectEvent(selected);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg rounded-3xl glass-panel border border-white/10 shadow-2xl p-6 sm:p-8 space-y-6"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-bold text-white">Select Farewell Event</h3>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {events.map((ev) => {
              const isCurrent = selected?.id === ev.id;
              return (
                <div
                  key={ev.id}
                  onClick={() => {
                    setSelected(ev);
                    setError(null);
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    isCurrent
                      ? 'bg-purple-600/20 border-purple-500/50 text-white shadow-lg shadow-purple-600/10'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{ev.name}</span>
                      {ev.requires_code && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-semibold">
                          <Lock className="w-3 h-3" />
                          <span>Code Required</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {ev.event_date ? `${ev.event_date} • ` : ''}{ev.photo_count} Photographs ({ev.indexed_count} indexed)
                    </p>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    isCurrent ? 'border-purple-400 bg-purple-500 text-white' : 'border-white/20'
                  }`}>
                    {isCurrent && <Check className="w-3 h-3" />}
                  </div>
                </div>
              );
            })}
          </div>

          {selected?.requires_code && (
            <div className="space-y-2 pt-2 border-t border-white/10">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>Enter Event Access Code</span>
              </label>
              <input
                type="text"
                placeholder="Event passcode..."
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl glass-card text-xs font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isVerifying || !selected}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50"
            >
              {isVerifying ? 'Verifying...' : 'Select Event'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
