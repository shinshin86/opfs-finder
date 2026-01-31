import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  File,
  Folder,
  Download,
  Trash2,
  Edit3,
  RotateCcw,
  Save,
  Image,
  FileText,
  Code,
  HelpCircle,
} from 'lucide-react';
import { useFileSystemStore, useToastStore, usePersistedStore } from '../../store';
import { opfsApi } from '../../utils/rpc';
import { getAssetUrl } from '../../utils/assets';
import {
  formatFileSize,
  formatDate,
  getKindLabel,
  isTextFile,
  isImageFile,
  isEditableImage,
} from '../../utils/file';
import { basename, extname } from '../../utils/path';
import { TextEditor } from '../TextEditor';
import { ImagePreview } from './ImagePreview';
import { HexViewer } from './HexViewer';
import type { FSStats, ReadTextResult, ReadBase64Result } from '../../../shared/types';
import styles from './Preview.module.css';

interface PreviewProps {
  onDelete: (path: string) => void;
  onExport: (path: string) => void;
  onOpenImageEditor: (path: string) => void;
}

export function Preview({ onDelete, onExport, onOpenImageEditor }: PreviewProps) {
  const { previewPath, editingPath, setEditingPath, isDirty, setDirty } = useFileSystemStore();
  const { addToast } = useToastStore();
  const { useClownMode } = usePersistedStore();
  const folderIconUrl = useMemo(() => getAssetUrl('images/folder.png'), []);
  const fileIconUrl = useMemo(() => getAssetUrl('images/file.png'), []);

  const [stats, setStats] = useState<FSStats | null>(null);
  const [textContent, setTextContent] = useState<ReadTextResult | null>(null);
  const [imageContent, setImageContent] = useState<ReadBase64Result | null>(null);
  const [binaryContent, setBinaryContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editedContent, setEditedContent] = useState<string>('');

  const loadPreview = useCallback(async () => {
    if (!previewPath) {
      setStats(null);
      setTextContent(null);
      setImageContent(null);
      setBinaryContent(null);
      return;
    }

    setIsLoading(true);
    setTextContent(null);
    setImageContent(null);
    setBinaryContent(null);

    try {
      const statResult = await opfsApi.stat({ path: previewPath });
      setStats(statResult);

      if (statResult.kind === 'directory') {
        // Nothing to preview for directories
        return;
      }

      const name = basename(previewPath);

      if (isTextFile(name)) {
        const text = await opfsApi.readText({ path: previewPath, maxBytes: 2 * 1024 * 1024 });
        setTextContent(text);
        if (editingPath === previewPath) {
          setEditedContent(text.text);
        }
      } else if (isImageFile(name)) {
        // Check size before loading
        if (statResult.size > 10 * 1024 * 1024) {
          setImageContent({ base64: '', mimeType: '', truncated: true });
        } else {
          const image = await opfsApi.readBase64({ path: previewPath });
          setImageContent(image);
        }
      } else {
        // Load first 1KB for hex preview
        const binary = await opfsApi.readBase64({ path: previewPath, maxBytes: 1024 });
        setBinaryContent(binary.base64);
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to load preview',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, [previewPath, editingPath, addToast]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  const handleStartEdit = useCallback(() => {
    if (previewPath && textContent) {
      setEditingPath(previewPath);
      setEditedContent(textContent.text);
      setDirty(false);
    }
  }, [previewPath, textContent, setEditingPath, setDirty]);

  const handleSave = useCallback(async () => {
    if (!editingPath) return;

    try {
      await opfsApi.writeText({ path: editingPath, text: editedContent });
      setDirty(false);
      addToast({
        type: 'success',
        title: 'File saved',
        message: basename(editingPath),
      });
      // Reload preview
      loadPreview();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to save',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [editingPath, editedContent, setDirty, addToast, loadPreview]);

  const handleRevert = useCallback(() => {
    if (textContent) {
      setEditedContent(textContent.text);
      setDirty(false);
    }
  }, [textContent, setDirty]);

  const handleCancelEdit = useCallback(() => {
    setEditingPath(null);
    setDirty(false);
  }, [setEditingPath, setDirty]);

  const handleContentChange = useCallback(
    (content: string) => {
      setEditedContent(content);
      setDirty(content !== textContent?.text);
    },
    [textContent, setDirty]
  );

  const handleFormatJson = useCallback(() => {
    try {
      const parsed = JSON.parse(editedContent);
      const formatted = JSON.stringify(parsed, null, 2);
      setEditedContent(formatted);
      setDirty(formatted !== textContent?.text);
    } catch {
      addToast({
        type: 'error',
        title: 'Invalid JSON',
        message: 'Cannot format: content is not valid JSON',
      });
    }
  }, [editedContent, textContent, setDirty, addToast]);

  if (!previewPath) {
    return (
      <div className={styles.empty}>
        <HelpCircle size={32} className={styles.emptyIcon} />
        <p>Select a file to preview</p>
        <p className={styles.emptyHint}>Click on a file in the list to see its details here</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <span>Loading...</span>
      </div>
    );
  }

  const isEditing = editingPath === previewPath;
  const name = basename(previewPath);
  const ext = extname(previewPath).slice(1).toLowerCase();
  const canEdit = isTextFile(name) && stats?.kind === 'file';
  const canEditImage = isEditableImage(name);

  return (
    <div className={styles.preview}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.icon}>
          {stats?.kind === 'directory' ? (
            useClownMode ? (
              <img src={folderIconUrl} alt="" className={styles.iconImage} />
            ) : (
              <Folder size={24} />
            )
          ) : isImageFile(name) ? (
            <Image size={24} />
          ) : isTextFile(name) ? (
            <FileText size={24} />
          ) : useClownMode ? (
            <img src={fileIconUrl} alt="" className={styles.iconImage} />
          ) : (
            <File size={24} />
          )}
        </div>
        <div className={styles.meta}>
          <h3 className={styles.name}>{name}</h3>
          <p className={styles.path}>{previewPath}</p>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Kind</span>
          <span className={styles.statValue}>
            {getKindLabel(name, stats?.kind === 'directory')}
          </span>
        </div>
        {stats?.kind === 'file' && (
          <div className={styles.stat}>
            <span className={styles.statLabel}>Size</span>
            <span className={styles.statValue}>{formatFileSize(stats.size)}</span>
          </div>
        )}
        {stats?.lastModified && (
          <div className={styles.stat}>
            <span className={styles.statLabel}>Modified</span>
            <span className={styles.statValue}>{formatDate(stats.lastModified)}</span>
          </div>
        )}
        {stats?.mimeType && (
          <div className={styles.stat}>
            <span className={styles.statLabel}>MIME</span>
            <span className={styles.statValue}>{stats.mimeType}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        {canEdit && !isEditing && (
          <button className={styles.actionButton} onClick={handleStartEdit}>
            <Edit3 size={14} />
            <span>Edit</span>
          </button>
        )}
        {isEditing && (
          <>
            <button
              className={`${styles.actionButton} ${styles.primary}`}
              onClick={handleSave}
              disabled={!isDirty}
            >
              <Save size={14} />
              <span>Save</span>
            </button>
            <button className={styles.actionButton} onClick={handleRevert} disabled={!isDirty}>
              <RotateCcw size={14} />
              <span>Revert</span>
            </button>
            {ext === 'json' && (
              <button className={styles.actionButton} onClick={handleFormatJson}>
                <Code size={14} />
                <span>Format</span>
              </button>
            )}
            <button className={styles.actionButton} onClick={handleCancelEdit}>
              Cancel
            </button>
          </>
        )}
        {canEditImage && !isEditing && (
          <button className={styles.actionButton} onClick={() => onOpenImageEditor(previewPath)}>
            <Edit3 size={14} />
            <span>Edit Image</span>
          </button>
        )}
        <button className={styles.actionButton} onClick={() => onExport(previewPath)}>
          <Download size={14} />
          <span>Export</span>
        </button>
        <button
          className={`${styles.actionButton} ${styles.danger}`}
          onClick={() => onDelete(previewPath)}
        >
          <Trash2 size={14} />
          <span>Delete</span>
        </button>
      </div>

      {/* Content Preview */}
      <div className={styles.content}>
        {isEditing && textContent && (
          <TextEditor
            content={editedContent}
            filename={name}
            onChange={handleContentChange}
            onSave={handleSave}
          />
        )}
        {!isEditing && textContent && (
          <>
            {textContent.truncated && (
              <div className={styles.warning}>File is large. Showing first 2MB only.</div>
            )}
            <TextEditor content={textContent.text} filename={name} readOnly />
          </>
        )}
        {imageContent && (
          <>
            {imageContent.truncated ? (
              <div className={styles.warning}>
                Image is too large ({stats ? formatFileSize(stats.size) : ''}). Export to view
                externally.
              </div>
            ) : (
              <ImagePreview base64={imageContent.base64} mimeType={imageContent.mimeType} />
            )}
          </>
        )}
        {binaryContent && <HexViewer base64={binaryContent} />}
        {stats?.kind === 'directory' && (
          <div className={styles.directoryInfo}>
            {useClownMode ? (
              <img src={folderIconUrl} alt="" className={styles.dirIcon} />
            ) : (
              <Folder size={48} className={styles.dirIcon} />
            )}
            <p>Folder</p>
          </div>
        )}
      </div>
    </div>
  );
}
