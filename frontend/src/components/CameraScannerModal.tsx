import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  RefreshCw, 
  X, 
  Upload, 
  Check, 
  AlertCircle, 
  Sparkles, 
  SwitchCamera, 
  Eye, 
  ShieldAlert,
  Loader2
} from 'lucide-react';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaptureAndSearch: (blob: Blob, base64: string) => Promise<void>;
  isSearching: boolean;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onCaptureAndSearch,
  isSearching,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Stop camera stream safely
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Start mobile camera stream
  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    setIsInitializing(true);
    setCameraError(null);
    stopStream();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not supported in this browser. Please upload a photo instead.');
      setIsInitializing(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setHasPermission(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please enable camera access in your browser settings, or upload a selfie below.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera detected on this device. You can upload a photo from your gallery instead.');
      } else {
        setCameraError('Could not start camera feed. You can use the photo upload option below.');
      }
    } finally {
      setIsInitializing(false);
    }
  }, [stopStream]);

  // Handle open/close and mode switches
  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera(facingMode);
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen, facingMode, capturedImage, startCamera, stopStream]);

  // Flip front/back camera
  const handleToggleCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
  };

  // Capture freeze-frame selfie from video
  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If front-facing, mirror horizontally to match mirror preview
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          setCapturedImage(dataUrl);
          stopStream();
        }
      },
      'image/jpeg',
      0.92
    );
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedBlob(null);
    startCamera(facingMode);
  };

  // Confirm and start face search
  const handleConfirmSearch = async () => {
    if (!capturedBlob || !capturedImage) return;
    await onCaptureAndSearch(capturedBlob, capturedImage);
  };

  // Fallback: Upload selfie from file / gallery
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCapturedImage(dataUrl);
      setCapturedBlob(file);
      stopStream();
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-lg rounded-3xl glass-panel border border-white/10 shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Scan Your Face</h3>
                <p className="text-xs text-slate-400">Position your face inside the frame.</p>
              </div>
            </div>

            <button
              onClick={() => {
                stopStream();
                onClose();
              }}
              disabled={isSearching}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scanner / Camera Viewport */}
          <div className="relative w-full aspect-[4/5] sm:aspect-square bg-slate-950 flex items-center justify-center overflow-hidden">
            {/* Live Video Preview */}
            {!capturedImage && !cameraError && (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />
            )}

            {/* Captured Freeze-Frame Preview */}
            {capturedImage && (
              <img
                src={capturedImage}
                alt="Captured Selfie"
                className="w-full h-full object-cover"
              />
            )}

            {/* Face Scanning Frame Overlay (when live camera is active) */}
            {!capturedImage && !cameraError && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                {/* Glowing Oval Face Guide */}
                <div className="relative w-64 h-80 sm:w-72 sm:h-96 rounded-[50%] border-2 border-purple-500/60 scanner-oval flex items-center justify-center">
                  {/* Laser Scanning Beam */}
                  <div className="scanner-laser" />

                  {/* Corner Accent Guides */}
                  <div className="absolute top-2 w-12 h-1 bg-purple-400 rounded-full opacity-80" />
                  <div className="absolute bottom-2 w-12 h-1 bg-purple-400 rounded-full opacity-80" />
                  <div className="absolute left-2 h-12 w-1 bg-purple-400 rounded-full opacity-80" />
                  <div className="absolute right-2 h-12 w-1 bg-purple-400 rounded-full opacity-80" />

                  {/* Center Target Reticle */}
                  <div className="w-8 h-8 rounded-full border border-dashed border-white/40 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  </div>
                </div>

                {/* Live Positioning Guidance */}
                <div className="absolute bottom-4 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-medium text-slate-200 flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-purple-400" />
                  <span>Center your face inside the frame</span>
                </div>
              </div>
            )}

            {/* Initializing Spinner */}
            {isInitializing && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                <p className="text-xs text-slate-300 font-medium">Starting camera...</p>
              </div>
            )}

            {/* Permission or Device Error Screen */}
            {cameraError && !capturedImage && (
              <div className="absolute inset-0 p-6 bg-slate-950 flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-white font-semibold text-sm sm:text-base">Camera Access Notice</h4>
                  <p className="text-xs sm:text-sm text-slate-400 max-w-xs">{cameraError}</p>
                </div>
                <div className="flex flex-col gap-2 w-full max-w-xs pt-2">
                  <button
                    onClick={() => startCamera(facingMode)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Try Camera Again</span>
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-all"
                  >
                    <Upload className="w-4 h-4 text-purple-400" />
                    <span>Choose Selfie From Gallery</span>
                  </button>
                </div>
              </div>
            )}

            {/* Flip Camera Button (top right of video preview) */}
            {!capturedImage && !cameraError && (
              <button
                onClick={handleToggleCamera}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white transition-all"
                title="Switch between front and back camera"
              >
                <SwitchCamera className="w-4 h-4" />
              </button>
            )}

            {/* Privacy watermark badge */}
            <div className="absolute top-4 left-4 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Face Matching Only • No Identity Storage</span>
            </div>
          </div>

          {/* Hidden File Input for Gallery upload fallback */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Footer Controls */}
          <div className="p-6 border-t border-white/10 bg-slate-900/60 flex flex-col gap-3">
            {!capturedImage ? (
              /* Live Preview Controls */
              <div className="flex items-center justify-between gap-4">
                {/* Gallery File Upload Fallback */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10 transition-all"
                >
                  <Upload className="w-4 h-4 text-purple-400" />
                  <span className="hidden sm:inline">Upload Selfie</span>
                </button>

                {/* Shutter Capture Button */}
                <button
                  onClick={handleCapture}
                  disabled={isInitializing || !!cameraError}
                  className="relative group flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 p-1 shadow-lg shadow-purple-600/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  title="Capture selfie"
                >
                  <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center group-hover:bg-transparent transition-colors">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </button>

                {/* Cancel Button */}
                <button
                  onClick={() => {
                    stopStream();
                    onClose();
                  }}
                  className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-medium transition-all"
                >
                  Cancel
                </button>
              </div>
            ) : (
              /* Captured Confirmation Controls */
              <div className="space-y-3">
                <div className="text-center">
                  <p className="text-xs text-slate-300 font-medium">
                    Selfie captured! Is your face clear and centered?
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRetake}
                    disabled={isSearching}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl glass-card hover:bg-white/10 text-slate-300 text-xs sm:text-sm font-semibold transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Retake</span>
                  </button>

                  <button
                    onClick={handleConfirmSearch}
                    disabled={isSearching}
                    className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50 transition-all disabled:opacity-50"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Matching Faces in AI Gallery...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Find My Matching Photos</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
