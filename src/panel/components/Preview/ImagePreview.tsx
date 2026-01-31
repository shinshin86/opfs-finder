import { useState, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';
import { createObjectUrlFromBase64 } from '../../../shared/utils/base64';
import styles from './ImagePreview.module.css';

interface ImagePreviewProps {
  base64: string;
  mimeType: string;
}

export function ImagePreview({ base64, mimeType }: ImagePreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState(true);
  const [showChecker, setShowChecker] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Create and cleanup Blob URL in the same effect
  useEffect(() => {
    if (!base64) {
      setBlobUrl(null);
      return;
    }

    const url = createObjectUrlFromBase64(base64, mimeType);
    setBlobUrl(url);

    // Cleanup on unmount or when base64/mimeType changes
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [base64, mimeType]);

  const handleZoomIn = useCallback(() => {
    setFit(false);
    setZoom((z) => Math.min(z * 1.5, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setFit(false);
    setZoom((z) => Math.max(z / 1.5, 0.1));
  }, []);

  const handleFit = useCallback(() => {
    setFit(true);
    setZoom(1);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <button className={styles.toolButton} onClick={handleZoomOut} title="Zoom out">
          <ZoomOut size={14} />
        </button>
        <span className={styles.zoomLevel}>{fit ? 'Fit' : `${Math.round(zoom * 100)}%`}</span>
        <button className={styles.toolButton} onClick={handleZoomIn} title="Zoom in">
          <ZoomIn size={14} />
        </button>
        <button
          className={`${styles.toolButton} ${fit ? styles.active : ''}`}
          onClick={handleFit}
          title="Fit to view"
        >
          {fit ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
        <label className={styles.checkerToggle}>
          <input
            type="checkbox"
            checked={showChecker}
            onChange={(e) => setShowChecker(e.target.checked)}
          />
          <span>Checker</span>
        </label>
      </div>
      <div className={`${styles.imageContainer} ${showChecker ? styles.checker : ''}`}>
        {blobUrl && (
          <img
            src={blobUrl}
            alt="Preview"
            className={styles.image}
            style={
              fit
                ? { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }
                : { transform: `scale(${zoom})`, transformOrigin: 'top left' }
            }
          />
        )}
      </div>
    </div>
  );
}
