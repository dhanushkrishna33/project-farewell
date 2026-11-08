import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { CameraScannerModal } from './components/CameraScannerModal';
import { GalleryResults } from './components/GalleryResults';
import { DynamicUploadModal } from './components/DynamicUploadModal';
import { PhotoViewerModal } from './components/PhotoViewerModal';
import { EventSelectorModal } from './components/EventSelectorModal';
import { AdminLoginModal } from './components/Admin/AdminLoginModal';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { Event, Photo, MatchResultItem } from './types';
import { fetchEvents, searchFace, getAdminToken, removeAdminToken } from './services/api';

export function App() {
  const [activeView, setActiveView] = useState<'home' | 'results' | 'admin'>('home');
  const [events, setEvents] = useState<Event[]>([]);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [currentAccessCode, setCurrentAccessCode] = useState<string>('');

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isEventSelectorOpen, setIsEventSelectorOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  // Search Results
  const [searchResults, setSearchResults] = useState<MatchResultItem[]>([]);
  const [searchId, setSearchId] = useState<string>('');

  // Lightbox Viewer
  const [viewerPhoto, setViewerPhoto] = useState<Photo | null>(null);
  const [viewerMatchScore, setViewerMatchScore] = useState<number | undefined>(undefined);

  // Load events on mount
  const loadEvents = useCallback(async () => {
    try {
      const data = await fetchEvents();
      setEvents(data);
      if (data.length > 0 && !currentEvent) {
        setCurrentEvent(data[0]);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  }, [currentEvent]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Handle Face Scan & Search
  const handleCaptureAndSearch = async (blob: Blob, _base64: string) => {
    setIsSearching(true);
    try {
      const res = await searchFace({
        eventId: currentEvent?.id,
        accessCode: currentAccessCode,
        selfieBlob: blob,
      });

      setSearchResults(res.matched_photos);
      setSearchId(res.search_id);
      setIsScannerOpen(false);
      setActiveView('results');
    } catch (err: any) {
      alert(err.message || 'Face matching search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle Admin Access
  const handleOpenAdmin = () => {
    const token = getAdminToken();
    if (token) {
      setActiveView('admin');
    } else {
      setIsAdminLoginOpen(true);
    }
  };

  const handleAdminLogout = () => {
    removeAdminToken();
    setActiveView('home');
  };

  // Get total stats for hero
  const totalPhotos = events.reduce((acc, ev) => acc + (ev.photo_count || 0), 0);
  const totalIndexed = events.reduce((acc, ev) => acc + (ev.indexed_count || 0), 0);

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col selection:bg-purple-500 selection:text-white">
      {/* Sticky Global Navbar */}
      <Navbar
        currentEvent={currentEvent}
        activeView={activeView}
        onOpenEventSelector={() => setIsEventSelectorOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenAdmin={handleOpenAdmin}
        onGoHome={() => setActiveView('home')}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {activeView === 'home' && (
          <Hero
            currentEvent={currentEvent}
            totalPhotos={totalPhotos}
            totalFaces={totalIndexed}
            onStartScan={() => setIsScannerOpen(true)}
            onOpenUpload={() => setIsUploadOpen(true)}
          />
        )}

        {activeView === 'results' && (
          <GalleryResults
            results={searchResults}
            searchId={searchId}
            eventName={currentEvent?.name}
            onScanAgain={() => setIsScannerOpen(true)}
            onBackToHome={() => setActiveView('home')}
            onSelectPhoto={(photo, score) => {
              setViewerPhoto(photo);
              setViewerMatchScore(score);
            }}
          />
        )}

        {activeView === 'admin' && (
          <AdminDashboard
            events={events}
            onRefreshEvents={loadEvents}
            onLogout={handleAdminLogout}
            onSelectPhoto={(photo) => {
              setViewerPhoto(photo);
              setViewerMatchScore(undefined);
            }}
          />
        )}
      </main>

      {/* Global Modals */}

      {/* 1. Mobile Camera Face Scanner Modal */}
      <CameraScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onCaptureAndSearch={handleCaptureAndSearch}
        isSearching={isSearching}
      />

      {/* 2. Dynamic Photo Upload Modal */}
      <DynamicUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        currentEvent={currentEvent}
        events={events}
        onUploadSuccess={loadEvents}
        onStartFaceScan={() => setIsScannerOpen(true)}
      />

      {/* 3. Fullscreen Photo Lightbox Modal */}
      {viewerPhoto && (
        <PhotoViewerModal
          photo={viewerPhoto}
          matchScore={viewerMatchScore}
          allPhotos={
            activeView === 'results'
              ? searchResults.map((r) => r.photo)
              : [viewerPhoto]
          }
          onClose={() => setViewerPhoto(null)}
          onNavigate={(nextP) => {
            setViewerPhoto(nextP);
            if (activeView === 'results') {
              const match = searchResults.find((r) => r.photo_id === nextP.id);
              setViewerMatchScore(match?.best_confidence);
            }
          }}
          scanSessionId={searchId}
        />
      )}

      {/* 4. Event Selector Modal */}
      <EventSelectorModal
        isOpen={isEventSelectorOpen}
        events={events}
        currentEvent={currentEvent}
        onClose={() => setIsEventSelectorOpen(false)}
        onSelectEvent={(ev, code) => {
          setCurrentEvent(ev);
          setCurrentAccessCode(code || '');
        }}
      />

      {/* 5. Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onSuccess={() => setActiveView('admin')}
      />

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-4 text-center text-xs text-slate-500">
        <p>Farewell Face Finder • AI-Powered Facial Recognition Photo Gallery</p>
        <p className="mt-1 text-[11px] text-slate-600">
          Scan your face to discover your photos • Privacy Preserved (Selfies Not Permanently Stored)
        </p>
      </footer>
    </div>
  );
}

export default App;
