import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Slider from '@radix-ui/react-slider';
import {
  X,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Crop,
  Save,
  Undo,
  Redo,
  Download,
} from 'lucide-react';
import { useToastStore } from '../../store';
import { opfsApi } from '../../utils/rpc';
import { basename, dirname, extname, join } from '../../utils/path';
import { createObjectUrlFromBase64 } from '../../../shared/utils/base64';
import styles from './ImageEditor.module.css';

interface ImageEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imagePath: string;
  onSave: () => void;
}

interface HistoryState {
  dataUrl: string;
}

type ExportFormat = 'png' | 'jpeg' | 'webp';

export function ImageEditor({ open, onOpenChange, imagePath, onSave }: ImageEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { addToast } = useToastStore();

  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);

  // Crop state
  const [isCropping, setIsCropping] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);

  // Resize state
  const [showResize, setShowResize] = useState(false);
  const [resizeWidth, setResizeWidth] = useState(0);
  const [resizeHeight, setResizeHeight] = useState(0);
  const [keepAspect, setKeepAspect] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(1);

  // Export state
  const [showExport, setShowExport] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
  const [exportQuality, setExportQuality] = useState(0.9);

  const loadImage = useCallback(async () => {
    if (!open || !imagePath) return;

    setIsLoading(true);
    try {
      const result = await opfsApi.readBase64({ path: imagePath });
      const url = createObjectUrlFromBase64(result.base64, result.mimeType);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        setResizeWidth(img.width);
        setResizeHeight(img.height);
        setAspectRatio(img.width / img.height);

        // Save initial state
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        setHistory([{ dataUrl: canvas.toDataURL() }]);
        setHistoryIndex(0);
        setIsLoading(false);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        addToast({
          type: 'error',
          title: 'Failed to load image',
          message: 'Image data could not be decoded',
        });
        setIsLoading(false);
        onOpenChange(false);
      };
      img.src = url;
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to load image',
        message: error instanceof Error ? error.message : String(error),
      });
      setIsLoading(false);
      onOpenChange(false);
    }
  }, [open, imagePath, addToast, onOpenChange]);

  useEffect(() => {
    loadImage();
  }, [loadImage]);

  const getCurrentDataUrl = useCallback(() => {
    if (historyIndex >= 0 && history[historyIndex]) {
      return history[historyIndex].dataUrl;
    }
    return null;
  }, [history, historyIndex]);

  const drawToCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const dataUrl = getCurrentDataUrl();
    if (!canvas || !dataUrl) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Draw crop overlay if cropping
      if (isCropping && cropStart && cropEnd) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const x = Math.min(cropStart.x, cropEnd.x);
        const y = Math.min(cropStart.y, cropEnd.y);
        const w = Math.abs(cropEnd.x - cropStart.x);
        const h = Math.abs(cropEnd.y - cropStart.y);

        ctx.clearRect(x, y, w, h);
        ctx.strokeStyle = '#0071e3';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
      }
    };
    img.src = dataUrl;
  }, [getCurrentDataUrl, isCropping, cropStart, cropEnd]);

  useEffect(() => {
    drawToCanvas();
  }, [drawToCanvas]);

  const pushHistory = useCallback(
    (dataUrl: string) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push({ dataUrl });
      // Limit history to 20 states
      if (newHistory.length > 20) {
        newHistory.shift();
      }
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    },
    [history, historyIndex]
  );

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
    }
  }, [historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
    }
  }, [historyIndex, history.length]);

  const rotate = useCallback(() => {
    const dataUrl = getCurrentDataUrl();
    if (!dataUrl) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d')!;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      pushHistory(canvas.toDataURL());
    };
    img.src = dataUrl;
  }, [getCurrentDataUrl, pushHistory]);

  const flipHorizontal = useCallback(() => {
    const dataUrl = getCurrentDataUrl();
    if (!dataUrl) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      pushHistory(canvas.toDataURL());
    };
    img.src = dataUrl;
  }, [getCurrentDataUrl, pushHistory]);

  const flipVertical = useCallback(() => {
    const dataUrl = getCurrentDataUrl();
    if (!dataUrl) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.translate(0, canvas.height);
      ctx.scale(1, -1);
      ctx.drawImage(img, 0, 0);
      pushHistory(canvas.toDataURL());
    };
    img.src = dataUrl;
  }, [getCurrentDataUrl, pushHistory]);

  const applyCrop = useCallback(() => {
    if (!cropStart || !cropEnd) return;

    const dataUrl = getCurrentDataUrl();
    if (!dataUrl) return;

    const x = Math.min(cropStart.x, cropEnd.x);
    const y = Math.min(cropStart.y, cropEnd.y);
    const w = Math.abs(cropEnd.x - cropStart.x);
    const h = Math.abs(cropEnd.y - cropStart.y);

    if (w < 1 || h < 1) {
      setIsCropping(false);
      setCropStart(null);
      setCropEnd(null);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
      pushHistory(canvas.toDataURL());
      setIsCropping(false);
      setCropStart(null);
      setCropEnd(null);
    };
    img.src = dataUrl;
  }, [cropStart, cropEnd, getCurrentDataUrl, pushHistory]);

  const applyResize = useCallback(() => {
    const dataUrl = getCurrentDataUrl();
    if (!dataUrl || resizeWidth < 1 || resizeHeight < 1) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = resizeWidth;
      canvas.height = resizeHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, resizeWidth, resizeHeight);
      pushHistory(canvas.toDataURL());
      setShowResize(false);
    };
    img.src = dataUrl;
  }, [getCurrentDataUrl, resizeWidth, resizeHeight, pushHistory]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isCropping) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      setCropStart({ x, y });
      setCropEnd({ x, y });
    },
    [isCropping]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isCropping || !cropStart) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.max(0, Math.min(canvas.width, (e.clientX - rect.left) * scaleX));
      const y = Math.max(0, Math.min(canvas.height, (e.clientY - rect.top) * scaleY));

      setCropEnd({ x, y });
    },
    [isCropping, cropStart]
  );

  const handleMouseUp = useCallback(() => {
    if (!isCropping || !cropStart || !cropEnd) return;
    // Crop selection complete, user can now click Apply
  }, [isCropping, cropStart, cropEnd]);

  const handleSave = useCallback(async () => {
    const dataUrl = getCurrentDataUrl();
    if (!dataUrl) return;

    try {
      setIsLoading(true);
      const base64 = dataUrl.split(',')[1];
      await opfsApi.writeBase64({ path: imagePath, base64 });
      addToast({
        type: 'success',
        title: 'Image saved',
        message: basename(imagePath),
      });
      onSave();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to save',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [getCurrentDataUrl, imagePath, addToast, onSave]);

  const handleSaveAs = useCallback(
    async (filename: string) => {
      const dataUrl = getCurrentDataUrl();
      if (!dataUrl) return;

      try {
        setIsLoading(true);
        const newPath = join(dirname(imagePath), filename);
        const base64 = dataUrl.split(',')[1];
        await opfsApi.writeBase64({ path: newPath, base64 });
        addToast({
          type: 'success',
          title: 'Image saved',
          message: filename,
        });
        onSave();
        setShowExport(false);
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Failed to save',
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setIsLoading(false);
      }
    },
    [getCurrentDataUrl, imagePath, addToast, onSave]
  );

  const handleExport = useCallback(() => {
    const dataUrl = getCurrentDataUrl();
    if (!dataUrl) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const mimeType =
        exportFormat === 'png'
          ? 'image/png'
          : exportFormat === 'jpeg'
            ? 'image/jpeg'
            : 'image/webp';
      const quality = exportFormat === 'png' ? undefined : exportQuality;
      const exportDataUrl = canvas.toDataURL(mimeType, quality);

      const link = document.createElement('a');
      const name = basename(imagePath, extname(imagePath));
      link.download = `${name}.${exportFormat}`;
      link.href = exportDataUrl;
      link.click();
    };
    img.src = dataUrl;
  }, [getCurrentDataUrl, imagePath, exportFormat, exportQuality]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.content}>
          <div className={styles.header}>
            <Dialog.Title className={styles.title}>Edit Image - {basename(imagePath)}</Dialog.Title>
            <Dialog.Close asChild>
              <button className={styles.closeButton}>
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <div className={styles.toolbar}>
            <button className={styles.toolButton} onClick={undo} disabled={!canUndo} title="Undo">
              <Undo size={16} />
            </button>
            <button className={styles.toolButton} onClick={redo} disabled={!canRedo} title="Redo">
              <Redo size={16} />
            </button>
            <div className={styles.separator} />
            <button className={styles.toolButton} onClick={rotate} title="Rotate 90">
              <RotateCw size={16} />
            </button>
            <button className={styles.toolButton} onClick={flipHorizontal} title="Flip Horizontal">
              <FlipHorizontal size={16} />
            </button>
            <button className={styles.toolButton} onClick={flipVertical} title="Flip Vertical">
              <FlipVertical size={16} />
            </button>
            <div className={styles.separator} />
            <button
              className={`${styles.toolButton} ${isCropping ? styles.active : ''}`}
              onClick={() => {
                setIsCropping(!isCropping);
                setCropStart(null);
                setCropEnd(null);
              }}
              title="Crop"
            >
              <Crop size={16} />
            </button>
            {isCropping && cropStart && cropEnd && (
              <button className={`${styles.toolButton} ${styles.primary}`} onClick={applyCrop}>
                Apply Crop
              </button>
            )}
            <button
              className={styles.toolButton}
              onClick={() => {
                const dataUrl = getCurrentDataUrl();
                if (dataUrl) {
                  const img = new Image();
                  img.onload = () => {
                    setResizeWidth(img.width);
                    setResizeHeight(img.height);
                    setAspectRatio(img.width / img.height);
                    setShowResize(true);
                  };
                  img.src = dataUrl;
                }
              }}
              title="Resize"
            >
              Resize
            </button>
            <div className={styles.separator} />
            <button className={`${styles.toolButton} ${styles.primary}`} onClick={handleSave}>
              <Save size={16} />
              <span>Save</span>
            </button>
            <button className={styles.toolButton} onClick={() => setShowExport(true)}>
              <Download size={16} />
              <span>Export</span>
            </button>
          </div>

          <div className={styles.canvasContainer}>
            {isLoading ? (
              <div className={styles.loading}>Loading...</div>
            ) : (
              <canvas
                ref={canvasRef}
                className={styles.canvas}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            )}
          </div>

          {/* Resize Dialog */}
          {showResize && (
            <div className={styles.modal}>
              <div className={styles.modalContent}>
                <h3>Resize Image</h3>
                <div className={styles.resizeInputs}>
                  <label>
                    Width:
                    <input
                      type="number"
                      value={resizeWidth}
                      onChange={(e) => {
                        const w = parseInt(e.target.value) || 0;
                        setResizeWidth(w);
                        if (keepAspect) {
                          setResizeHeight(Math.round(w / aspectRatio));
                        }
                      }}
                    />
                  </label>
                  <label>
                    Height:
                    <input
                      type="number"
                      value={resizeHeight}
                      onChange={(e) => {
                        const h = parseInt(e.target.value) || 0;
                        setResizeHeight(h);
                        if (keepAspect) {
                          setResizeWidth(Math.round(h * aspectRatio));
                        }
                      }}
                    />
                  </label>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={keepAspect}
                      onChange={(e) => setKeepAspect(e.target.checked)}
                    />
                    Keep aspect ratio
                  </label>
                </div>
                <div className={styles.modalActions}>
                  <button onClick={() => setShowResize(false)}>Cancel</button>
                  <button className={styles.primary} onClick={applyResize}>
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Export Dialog */}
          {showExport && (
            <div className={styles.modal}>
              <div className={styles.modalContent}>
                <h3>Export Image</h3>
                <div className={styles.exportOptions}>
                  <label>
                    Format:
                    <select
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                    >
                      <option value="png">PNG</option>
                      <option value="jpeg">JPEG</option>
                      <option value="webp">WebP</option>
                    </select>
                  </label>
                  {exportFormat !== 'png' && (
                    <label>
                      Quality: {Math.round(exportQuality * 100)}%
                      <Slider.Root
                        className={styles.slider}
                        value={[exportQuality]}
                        onValueChange={([v]) => setExportQuality(v)}
                        min={0.1}
                        max={1}
                        step={0.1}
                      >
                        <Slider.Track className={styles.sliderTrack}>
                          <Slider.Range className={styles.sliderRange} />
                        </Slider.Track>
                        <Slider.Thumb className={styles.sliderThumb} />
                      </Slider.Root>
                    </label>
                  )}
                </div>
                <div className={styles.modalActions}>
                  <button onClick={() => setShowExport(false)}>Cancel</button>
                  <button onClick={handleExport}>Download</button>
                  <button
                    className={styles.primary}
                    onClick={() => {
                      const name = basename(imagePath, extname(imagePath));
                      handleSaveAs(`${name}.${exportFormat}`);
                    }}
                  >
                    Save As
                  </button>
                </div>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
