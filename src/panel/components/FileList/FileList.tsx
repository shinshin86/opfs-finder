import React, { useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  Folder,
  File,
  FileText,
  FileJson,
  FileCode,
  Image,
  Film,
  Music,
  Archive,
  FileQuestion,
} from 'lucide-react';
import { useFileSystemStore, usePersistedStore } from '../../store';
import { getAssetUrl } from '../../utils/assets';
import { formatFileSize, formatDate, getKindLabel, getFileCategory } from '../../utils/file';
import { dirname } from '../../utils/path';
import type { FSEntry, SortConfig } from '../../../shared/types';
import styles from './FileList.module.css';

interface FileListProps {
  onDoubleClick: (entry: FSEntry) => void;
  onContextMenu: (e: React.MouseEvent, entry?: FSEntry) => void;
  onDrop: (files: File[], targetPath: string) => void;
  onMove: (sourcePaths: string[], targetPath: string) => void;
}

function getFileIcon(entry: FSEntry) {
  if (entry.kind === 'directory') {
    return <Folder size={18} className={styles.iconFolder} />;
  }

  const category = getFileCategory(entry.name);

  switch (category) {
    case 'image':
      return <Image size={18} className={styles.iconImage} />;
    case 'text':
      return <FileText size={18} className={styles.iconText} />;
    case 'code':
      if (entry.name.endsWith('.json')) {
        return <FileJson size={18} className={styles.iconJson} />;
      }
      return <FileCode size={18} className={styles.iconCode} />;
    case 'video':
      return <Film size={18} className={styles.iconVideo} />;
    case 'audio':
      return <Music size={18} className={styles.iconAudio} />;
    case 'archive':
      return <Archive size={18} className={styles.iconArchive} />;
    default:
      return <File size={18} className={styles.iconFile} />;
  }
}

function getGridIcon(
  entry: FSEntry,
  useClownMode: boolean,
  folderIconUrl: string,
  fileIconUrl: string
) {
  if (!useClownMode) {
    return getFileIcon(entry);
  }
  if (entry.kind === 'directory') {
    return <img src={folderIconUrl} alt="" className={styles.gridIconImage} />;
  }
  return <img src={fileIconUrl} alt="" className={styles.gridIconImage} />;
}

function sortEntries(entries: FSEntry[], config: SortConfig): FSEntry[] {
  return [...entries].sort((a, b) => {
    // Directories always come first
    if (a.kind !== b.kind) {
      return a.kind === 'directory' ? -1 : 1;
    }

    let comparison = 0;

    switch (config.field) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'size':
        comparison = (a.size || 0) - (b.size || 0);
        break;
      case 'modified':
        comparison = (a.lastModified || 0) - (b.lastModified || 0);
        break;
      case 'kind':
        comparison = getKindLabel(a.name, a.kind === 'directory').localeCompare(
          getKindLabel(b.name, b.kind === 'directory')
        );
        break;
    }

    return config.direction === 'asc' ? comparison : -comparison;
  });
}

function filterEntries(entries: FSEntry[], query: string): FSEntry[] {
  if (!query) return entries;
  const lowerQuery = query.toLowerCase();
  return entries.filter((entry) => entry.name.toLowerCase().includes(lowerQuery));
}

export interface FileListHandle {
  focus: () => void;
}

export const FileList = forwardRef<FileListHandle, FileListProps>(function FileList(
  { onDoubleClick, onContextMenu, onDrop, onMove },
  ref
) {
  const {
    entries,
    selectedPaths,
    setSelectedPaths,
    toggleSelection,
    selectRange,
    lastSelectedPath,
    setLastSelectedPath,
    setPreviewPath,
    viewMode,
    sortConfig,
    searchQuery,
    searchGlobal,
    allEntries,
    currentPath,
  } = useFileSystemStore();
  const { useClownMode } = usePersistedStore();
  const emptyIconUrl = useMemo(() => getAssetUrl('images/empty.png'), []);
  const folderIconUrl = useMemo(() => getAssetUrl('images/folder.png'), []);
  const fileIconUrl = useMemo(() => getAssetUrl('images/file.png'), []);

  const parentRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        // Grid view uses containerRef, list view uses parentRef
        if (viewMode === 'grid') {
          containerRef.current?.focus();
        } else {
          parentRef.current?.focus();
        }
      },
    }),
    [viewMode]
  );

  const processedEntries = useMemo(() => {
    const source = searchGlobal ? allEntries : entries;
    const filtered = filterEntries(source, searchQuery);
    const sorted = sortEntries(filtered, sortConfig);
    // Limit to 100 entries for performance when doing global search
    return searchGlobal ? sorted.slice(0, 100) : sorted;
  }, [entries, allEntries, searchQuery, sortConfig, searchGlobal]);

  const rowVirtualizer = useVirtualizer({
    count: processedEntries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (viewMode === 'list' ? (searchGlobal ? 48 : 32) : 100),
    overscan: 5,
  });

  const handleClick = useCallback(
    (e: React.MouseEvent, entry: FSEntry) => {
      if (e.metaKey || e.ctrlKey) {
        toggleSelection(entry.path);
        setLastSelectedPath(entry.path);
      } else if (e.shiftKey && lastSelectedPath) {
        selectRange(lastSelectedPath, entry.path, processedEntries);
      } else {
        setSelectedPaths(new Set([entry.path]));
        setLastSelectedPath(entry.path);
      }
      setPreviewPath(entry.path);
    },
    [
      toggleSelection,
      selectRange,
      setSelectedPaths,
      setLastSelectedPath,
      setPreviewPath,
      lastSelectedPath,
      processedEntries,
    ]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (processedEntries.length === 0) return;

      const currentIndex = processedEntries.findIndex((entry) => entry.path === lastSelectedPath);

      let newIndex = currentIndex;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          newIndex = Math.min(currentIndex + 1, processedEntries.length - 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          newIndex = Math.max(currentIndex - 1, 0);
          break;
        case 'Enter':
          if (lastSelectedPath) {
            const entry = processedEntries.find((e) => e.path === lastSelectedPath);
            if (entry) onDoubleClick(entry);
          }
          return;
        case 'Backspace':
          if (e.metaKey || e.ctrlKey) {
            // Delete shortcut - handled elsewhere
          }
          return;
        default:
          return;
      }

      if (newIndex !== currentIndex && newIndex >= 0) {
        const newEntry = processedEntries[newIndex];
        if (e.shiftKey && lastSelectedPath) {
          selectRange(lastSelectedPath, newEntry.path, processedEntries);
        } else {
          setSelectedPaths(new Set([newEntry.path]));
        }
        setLastSelectedPath(newEntry.path);
        setPreviewPath(newEntry.path);
      }
    },
    [
      processedEntries,
      lastSelectedPath,
      selectRange,
      setSelectedPaths,
      setLastSelectedPath,
      setPreviewPath,
      onDoubleClick,
    ]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, entry: FSEntry) => {
      const paths = selectedPaths.has(entry.path) ? Array.from(selectedPaths) : [entry.path];
      e.dataTransfer.setData('application/x-opfs-paths', JSON.stringify(paths));
      e.dataTransfer.effectAllowed = 'move';
    },
    [selectedPaths]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDropOnEntry = useCallback(
    (e: React.DragEvent, targetEntry: FSEntry) => {
      e.preventDefault();
      e.stopPropagation();

      if (targetEntry.kind !== 'directory') return;

      const pathsJson = e.dataTransfer.getData('application/x-opfs-paths');
      if (pathsJson) {
        const paths = JSON.parse(pathsJson) as string[];
        onMove(paths, targetEntry.path);
        return;
      }

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onDrop(files, targetEntry.path);
      }
    },
    [onMove, onDrop]
  );

  const handleDropOnContainer = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      const pathsJson = e.dataTransfer.getData('application/x-opfs-paths');
      if (pathsJson) {
        const paths = JSON.parse(pathsJson) as string[];
        onMove(paths, currentPath);
        return;
      }

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        onDrop(files, currentPath);
      }
    },
    [onMove, onDrop, currentPath]
  );

  if (processedEntries.length === 0) {
    return (
      <div
        className={styles.emptyState}
        onContextMenu={(e) => onContextMenu(e)}
        onDragOver={handleDragOver}
        onDrop={handleDropOnContainer}
      >
        {useClownMode ? (
          <img src={emptyIconUrl} alt="" className={styles.emptyIconImage} />
        ) : (
          <FileQuestion size={48} className={styles.emptyIcon} />
        )}
        <p className={styles.emptyText}>
          {searchQuery ? 'No matching files' : 'This folder is empty'}
        </p>
        <p className={styles.emptyHint}>Drop files here to import</p>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div
        ref={containerRef}
        className={styles.gridContainer}
        onContextMenu={(e) => onContextMenu(e)}
        onDragOver={handleDragOver}
        onDrop={handleDropOnContainer}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {processedEntries.map((entry) => (
          <div
            key={entry.path}
            className={`${styles.gridItem} ${selectedPaths.has(entry.path) ? styles.selected : ''}`}
            onClick={(e) => handleClick(e, entry)}
            onDoubleClick={() => onDoubleClick(entry)}
            onContextMenu={(e) => {
              if (!selectedPaths.has(entry.path)) {
                setSelectedPaths(new Set([entry.path]));
                setLastSelectedPath(entry.path);
              }
              onContextMenu(e, entry);
            }}
            draggable
            onDragStart={(e) => handleDragStart(e, entry)}
            onDragOver={entry.kind === 'directory' ? handleDragOver : undefined}
            onDrop={entry.kind === 'directory' ? (e) => handleDropOnEntry(e, entry) : undefined}
          >
            <div className={`${styles.gridIcon} ${useClownMode ? styles.gridIconClown : ''}`}>
              {getGridIcon(entry, useClownMode, folderIconUrl, fileIconUrl)}
            </div>
            <span className={styles.gridName}>{entry.name}</span>
            {searchGlobal && <span className={styles.gridPath}>{dirname(entry.path)}</span>}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={styles.listContainer}
      ref={parentRef}
      onContextMenu={(e) => onContextMenu(e)}
      onDragOver={handleDragOver}
      onDrop={handleDropOnContainer}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div className={styles.listHeader}>
        <span className={styles.colName}>Name</span>
        <span className={styles.colKind}>Kind</span>
        <span className={styles.colSize}>Size</span>
        <span className={styles.colDate}>Modified</span>
      </div>
      <div
        className={styles.listBody}
        style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const entry = processedEntries[virtualItem.index];
          return (
            <div
              key={entry.path}
              className={`${styles.listRow} ${selectedPaths.has(entry.path) ? styles.selected : ''}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
              onClick={(e) => handleClick(e, entry)}
              onDoubleClick={() => onDoubleClick(entry)}
              onContextMenu={(e) => {
                if (!selectedPaths.has(entry.path)) {
                  setSelectedPaths(new Set([entry.path]));
                  setLastSelectedPath(entry.path);
                }
                onContextMenu(e, entry);
              }}
              draggable
              onDragStart={(e) => handleDragStart(e, entry)}
              onDragOver={entry.kind === 'directory' ? handleDragOver : undefined}
              onDrop={entry.kind === 'directory' ? (e) => handleDropOnEntry(e, entry) : undefined}
            >
              <span className={styles.colName}>
                {getFileIcon(entry)}
                <span className={styles.fileNameWrapper}>
                  <span className={styles.fileName}>{entry.name}</span>
                  {searchGlobal && <span className={styles.filePath}>{dirname(entry.path)}</span>}
                </span>
              </span>
              <span className={styles.colKind}>
                {getKindLabel(entry.name, entry.kind === 'directory')}
              </span>
              <span className={styles.colSize}>
                {entry.kind === 'file' && entry.size !== undefined
                  ? formatFileSize(entry.size)
                  : '--'}
              </span>
              <span className={styles.colDate}>
                {entry.lastModified ? formatDate(entry.lastModified) : '--'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
