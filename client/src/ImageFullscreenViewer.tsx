import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface ImageFullscreenViewerProps {
  /** Image source URL (can be authenticated API URL or regular URL) */
  src: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Callback when viewer is closed */
  onClose: () => void;
  /** Optional filename for download */
  fileName?: string;
  /** Optional portal container */
  portalContainer?: HTMLElement;
}

const FaDownload = ({ className }: { className?: string }) => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M216 0h80c13.3 0 24 10.7 24 24v168h87.7c17.8 0 26.7 21.5 14.1 34.1L269.7 378.3c-7.5 7.5-19.8 7.5-27.3 0L90.1 226.1c-12.6-12.6-3.7-34.1 14.1-34.1H192V24c0-13.3 10.7-24 24-24zm296 376v112c0 13.3-10.7 24-24 24H24c-13.3 0-24-10.7-24-24V376c0-13.3 10.7-24 24-24h146.7l49 49c20.1 20.1 52.5 20.1 72.6 0l49-49H488c13.3 0 24 10.7 24 24zM24 432c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H40c-8.8 0-16-7.2-16-16v-32z"></path>
  </svg>
);

const FaTimes = ({ className }: { className?: string }) => (
  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 352 512" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.19 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.19 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"></path>
  </svg>
);

/**
 * ImageFullscreenViewer provides a lightbox-style fullscreen viewer for images.
 * Supports authenticated API images, keyboard navigation (ESC to close), and download functionality.
 */
export default function ImageFullscreenViewer({ src, alt, onClose, fileName, portalContainer }: ImageFullscreenViewerProps) {
  
  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when viewer is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Handle backdrop click (click outside image)
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  // Handle download
  const handleDownload = useCallback(() => {
    const link = document.createElement('a');
    link.href = src;
    link.download = fileName || alt || 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [src, fileName, alt]);

  return createPortal(
    <div 
      className="fixed inset-0 z-[2000] bg-white flex items-center justify-center p-4 animate-fade-in"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Image fullscreen viewer"
    >
      {/* Control buttons */}
      <div className="absolute top-4 right-4 flex items-center space-x-2 z-10">
        <button
          onClick={handleDownload}
          className="p-3 bg-black bg-opacity-10 hover:bg-opacity-20 rounded-lg text-black transition-all duration-200 backdrop-blur-sm"
          aria-label="Download image"
          title="Download image"
        >
          <FaDownload className="w-5 h-5" />
        </button>
        <button
          onClick={onClose}
          className="p-3 bg-black bg-opacity-10 hover:bg-opacity-20 rounded-lg text-black transition-all duration-200 backdrop-blur-sm"
          aria-label="Close viewer"
          title="Close (ESC)"
        >
          <FaTimes className="w-5 h-5" />
        </button>
      </div>

      {/* Image container with max constraints to prevent overflow */}
      <div 
        className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[95vh] object-contain rounded-lg shadow-2xl cursor-default"
          style={{ userSelect: 'none' }}
        />
      </div>

      {/* Instructions hint */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-black text-sm opacity-75 bg-white bg-opacity-50 px-4 py-2 rounded-full backdrop-blur-sm">
        Press ESC or click outside to close
      </div>
    </div>,
    portalContainer || document.body
  );
}

