import React, { useEffect, useCallback, useState, useRef } from 'react';
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import {
  Eye,
  Pencil,
  Trash2,
  Copy,
  Clipboard,
  FolderPlus,
  FilePlus,
  Download,
  Link,
  Star,
} from 'lucide-react';
import { SplitPane } from './components/SplitPane';
import { Sidebar } from './components/Sidebar';
import { Toolbar } from './components/Toolbar';
import { FileList, type FileListHandle } from './components/FileList';
import { Preview } from './components/Preview';
import { ToastProvider } from './components/Toast';
import { ConfirmDialog, InputDialog, ConflictDialog } from './components/Dialog';
import { ImageEditor } from './components/ImageEditor';
import { useFileSystemStore, usePersistedStore, useToastStore } from './store';
import { opfsApi } from './utils/rpc';
import {
  join,
  basename,
  dirname,
  generateUniqueName,
  isChildOf,
  flattenEntries,
} from './utils/path';
import { arrayBufferToBase64, createObjectUrlFromBase64 } from '../shared/utils/base64';
import type { FSEntry, ConflictResolution } from '../shared/types';
import styles from './App.module.css';

function App() {
  const {
    currentPath,
    setCurrentPath,
    entries,
    setEntries,
    selectedPaths,
    clearSelection,
    setLoading,
    setError,
    isOPFSAvailable,
    setOPFSAvailable,
    setStorageEstimate,
    clipboard,
    setClipboard,
    setPreviewPath,
    searchGlobal,
    allEntries,
    setAllEntries,
    setLoadingGlobal,
  } = useFileSystemStore();

  const { addFavorite, addRecent, theme } = usePersistedStore();
  const { addToast } = useToastStore();

  // Context menu state
  const [contextMenuEntry, setContextMenuEntry] = useState<FSEntry | null>(null);

  // Dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictFilename, setConflictFilename] = useState('');
  const conflictResolverRef = useRef<((resolution: ConflictResolution) => void) | null>(null);

  // Image editor state
  const [imageEditorPath, setImageEditorPath] = useState<string | null>(null);

  // File input ref for import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // FileList ref for focus management
  const fileListRef = useRef<FileListHandle>(null);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.dataset.theme = prefersDark ? 'dark' : 'light';
    } else {
      root.dataset.theme = theme;
    }
  }, [theme]);

  // Check OPFS availability
  useEffect(() => {
    async function checkOPFS() {
      try {
        const result = await opfsApi.isAvailable();
        setOPFSAvailable(result.available, result.reason);

        if (result.available) {
          const estimate = await opfsApi.estimate();
          setStorageEstimate(estimate);
          loadDirectory('/');
        }
      } catch (error) {
        setOPFSAvailable(false, error instanceof Error ? error.message : 'Unknown error');
      }
    }
    checkOPFS();
  }, []);

  const loadDirectory = useCallback(
    async (path: string) => {
      setLoading(true);
      setError(null);

      try {
        const result = await opfsApi.list({ path, depth: 1 });
        setEntries(result);
        setCurrentPath(path);
        clearSelection();
        setPreviewPath(null);

        // Update storage estimate
        const estimate = await opfsApi.estimate();
        setStorageEstimate(estimate);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load directory');
        addToast({
          type: 'error',
          title: 'Failed to load directory',
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setLoading(false);
      }
    },
    [
      setLoading,
      setError,
      setEntries,
      setCurrentPath,
      clearSelection,
      setPreviewPath,
      setStorageEstimate,
      addToast,
    ]
  );

  const handleRefresh = useCallback(() => {
    loadDirectory(currentPath);
    // Clear global cache so it will be reloaded on next global search
    setAllEntries([]);
  }, [currentPath, loadDirectory, setAllEntries]);

  // Load all entries for global search
  const loadAllEntries = useCallback(async () => {
    setLoadingGlobal(true);
    try {
      const result = await opfsApi.list({ path: '/', depth: 999 });
      const flattened = flattenEntries(result);
      setAllEntries(flattened);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to load all files',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoadingGlobal(false);
    }
  }, [setAllEntries, setLoadingGlobal, addToast]);

  // Load all entries when searchGlobal becomes true
  useEffect(() => {
    if (searchGlobal && allEntries.length === 0) {
      loadAllEntries();
    }
  }, [searchGlobal, allEntries.length, loadAllEntries]);

  const handleDoubleClick = useCallback(
    async (entry: FSEntry) => {
      if (entry.kind === 'directory') {
        await loadDirectory(entry.path);
        addRecent({
          path: entry.path,
          name: entry.name,
          kind: 'directory',
          timestamp: Date.now(),
        });
        // Focus the FileList after navigation
        fileListRef.current?.focus();
      } else {
        // Open in preview
        setPreviewPath(entry.path);
        addRecent({
          path: entry.path,
          name: entry.name,
          kind: 'file',
          timestamp: Date.now(),
        });
      }
    },
    [loadDirectory, setPreviewPath, addRecent]
  );

  const handleContextMenu = useCallback((e: React.MouseEvent, entry?: FSEntry) => {
    e.preventDefault();
    setContextMenuEntry(entry || null);
  }, []);

  const handleDelete = useCallback(async () => {
    const pathsToDelete = Array.from(selectedPaths);
    if (pathsToDelete.length === 0) return;

    setShowDeleteDialog(true);
  }, [selectedPaths]);

  const confirmDelete = useCallback(async () => {
    const pathsToDelete = Array.from(selectedPaths);

    for (const path of pathsToDelete) {
      try {
        await opfsApi.delete({ path, recursive: true });
        addToast({
          type: 'success',
          title: 'Deleted',
          message: basename(path),
        });
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Failed to delete',
          message: error instanceof Error ? error.message : String(error),
          details: `Path: ${path}`,
        });
      }
    }

    handleRefresh();
    clearSelection();
    setPreviewPath(null);
  }, [selectedPaths, handleRefresh, clearSelection, setPreviewPath, addToast]);

  const handleRename = useCallback(
    async (newName: string) => {
      const pathToRename = Array.from(selectedPaths)[0];
      if (!pathToRename) return;

      const parentPath = dirname(pathToRename);
      const newPath = join(parentPath, newName);

      try {
        await opfsApi.move({ from: pathToRename, to: newPath });
        addToast({
          type: 'success',
          title: 'Renamed',
          message: `${basename(pathToRename)} → ${newName}`,
        });
        handleRefresh();
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Failed to rename',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [selectedPaths, handleRefresh, addToast]
  );

  const handleDuplicate = useCallback(async () => {
    const pathToDuplicate = Array.from(selectedPaths)[0];
    if (!pathToDuplicate) return;

    const parentPath = dirname(pathToDuplicate);
    const name = basename(pathToDuplicate);
    const existingNames = new Set(entries.map((e) => e.name));
    const newName = generateUniqueName(name, existingNames);
    const newPath = join(parentPath, newName);

    try {
      await opfsApi.copy({ from: pathToDuplicate, to: newPath });
      addToast({
        type: 'success',
        title: 'Duplicated',
        message: newName,
      });
      handleRefresh();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Failed to duplicate',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [selectedPaths, entries, handleRefresh, addToast]);

  const handleCopy = useCallback(() => {
    const paths = Array.from(selectedPaths);
    if (paths.length === 0) return;

    setClipboard({ paths, operation: 'copy' });
    addToast({
      type: 'info',
      title: 'Copied',
      message: `${paths.length} item(s) copied`,
      duration: 2000,
    });
  }, [selectedPaths, setClipboard, addToast]);

  const handlePaste = useCallback(async () => {
    if (!clipboard || clipboard.paths.length === 0) return;

    const targetPath = contextMenuEntry?.kind === 'directory' ? contextMenuEntry.path : currentPath;

    for (const sourcePath of clipboard.paths) {
      // Prevent pasting into itself or its children
      if (isChildOf(targetPath, sourcePath) || targetPath === sourcePath) {
        addToast({
          type: 'error',
          title: 'Cannot paste',
          message: 'Cannot paste a folder into itself',
        });
        continue;
      }

      const name = basename(sourcePath);
      const destPath = join(targetPath, name);

      // Check for conflicts
      const existingEntry = entries.find((e) => e.name === name);
      if (existingEntry) {
        // Show conflict dialog
        setConflictFilename(name);
        const resolution = await new Promise<ConflictResolution>((resolve) => {
          conflictResolverRef.current = resolve;
          setShowConflictDialog(true);
        });

        if (resolution === 'skip') continue;
        if (resolution === 'keep-both') {
          const existingNames = new Set(entries.map((e) => e.name));
          const newName = generateUniqueName(name, existingNames, '');
          const newDestPath = join(targetPath, newName);
          try {
            await opfsApi.copy({ from: sourcePath, to: newDestPath });
          } catch (error) {
            addToast({
              type: 'error',
              title: 'Failed to paste',
              message: error instanceof Error ? error.message : String(error),
            });
          }
          continue;
        }
        // resolution === 'replace' - overwrite
      }

      try {
        await opfsApi.copy({ from: sourcePath, to: destPath, overwrite: true });
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Failed to paste',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    addToast({
      type: 'success',
      title: 'Pasted',
      message: `${clipboard.paths.length} item(s)`,
    });

    handleRefresh();
  }, [clipboard, contextMenuEntry, currentPath, entries, handleRefresh, addToast]);

  const handleCopyPath = useCallback(() => {
    const path = Array.from(selectedPaths)[0];
    if (!path) return;

    navigator.clipboard.writeText(path);
    addToast({
      type: 'info',
      title: 'Path copied',
      message: path,
      duration: 2000,
    });
  }, [selectedPaths, addToast]);

  const handleExport = useCallback(
    async (path: string) => {
      try {
        const result = await opfsApi.readBase64({ path });
        const url = createObjectUrlFromBase64(result.base64, result.mimeType);
        const link = document.createElement('a');
        link.href = url;
        link.download = basename(path);
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        addToast({
          type: 'success',
          title: 'Exported',
          message: basename(path),
        });
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Failed to export',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [addToast]
  );

  const handleNewFolder = useCallback(
    async (name: string) => {
      const newPath = join(currentPath, name);

      try {
        await opfsApi.mkdir({ path: newPath });
        addToast({
          type: 'success',
          title: 'Folder created',
          message: name,
        });
        handleRefresh();
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Failed to create folder',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [currentPath, handleRefresh, addToast]
  );

  const handleNewFile = useCallback(
    async (name: string) => {
      const newPath = join(currentPath, name);

      try {
        await opfsApi.createFile({ path: newPath });
        addToast({
          type: 'success',
          title: 'File created',
          message: name,
        });
        handleRefresh();
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Failed to create file',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [currentPath, handleRefresh, addToast]
  );

  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      await importFiles(files, currentPath);
      e.target.value = '';
    },
    [currentPath]
  );

  const importFiles = useCallback(
    async (files: File[], targetPath: string) => {
      for (const file of files) {
        const destPath = join(targetPath, file.name);

        try {
          const data = await file.arrayBuffer();
          const base64 = arrayBufferToBase64(data);
          await opfsApi.writeBase64({ path: destPath, base64 });
        } catch (error) {
          addToast({
            type: 'error',
            title: 'Failed to import',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      addToast({
        type: 'success',
        title: 'Imported',
        message: `${files.length} file(s)`,
      });

      handleRefresh();
    },
    [handleRefresh, addToast]
  );

  const handleDrop = useCallback(
    (files: File[], targetPath: string) => {
      importFiles(files, targetPath);
    },
    [importFiles]
  );

  const handleMove = useCallback(
    async (sourcePaths: string[], targetPath: string) => {
      for (const sourcePath of sourcePaths) {
        // Prevent moving into itself or its children
        if (isChildOf(targetPath, sourcePath) || targetPath === sourcePath) {
          addToast({
            type: 'error',
            title: 'Cannot move',
            message: 'Cannot move a folder into itself',
          });
          continue;
        }

        const name = basename(sourcePath);
        const destPath = join(targetPath, name);

        if (sourcePath === destPath) continue;

        try {
          await opfsApi.move({ from: sourcePath, to: destPath });
        } catch (error) {
          addToast({
            type: 'error',
            title: 'Failed to move',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }

      addToast({
        type: 'success',
        title: 'Moved',
        message: `${sourcePaths.length} item(s)`,
      });

      handleRefresh();
    },
    [handleRefresh, addToast]
  );

  const handleAddToFavorites = useCallback(() => {
    const path = Array.from(selectedPaths)[0];
    if (!path) return;

    addFavorite({ path, name: basename(path) });
    addToast({
      type: 'success',
      title: 'Added to favorites',
      message: basename(path),
    });
  }, [selectedPaths, addFavorite, addToast]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't handle if in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        e.preventDefault();
        handlePaste();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        handleDuplicate();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Enter' && selectedPaths.size === 1) {
        e.preventDefault();
        setShowRenameDialog(true);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCopy, handlePaste, handleDuplicate, handleDelete, selectedPaths]);

  // Render unavailable state
  if (isOPFSAvailable === false) {
    return (
      <ToastProvider>
        <div className={styles.unavailable}>
          <h2>OPFS Not Available</h2>
          <p>The Origin Private File System is not available for this page.</p>
          <p className={styles.hint}>
            Make sure you're inspecting a page served over HTTPS or localhost.
          </p>
        </div>
      </ToastProvider>
    );
  }

  // Render loading state
  if (isOPFSAvailable === null) {
    return (
      <ToastProvider>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Checking OPFS availability...</span>
        </div>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className={styles.app}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
        />

        <ContextMenuPrimitive.Root>
          <ContextMenuPrimitive.Trigger asChild>
            <div className={styles.mainContent}>
              <SplitPane defaultSizes={[15, 55, 30]} minSizes={[150, 300, 200]}>
                <Sidebar onNavigate={loadDirectory} onMove={handleMove} />
                <div className={styles.centerPane}>
                  <Toolbar
                    onRefresh={handleRefresh}
                    onNewFolder={() => setShowNewFolderDialog(true)}
                    onNewFile={() => setShowNewFileDialog(true)}
                    onImport={handleImport}
                  />
                  <FileList
                    ref={fileListRef}
                    onDoubleClick={handleDoubleClick}
                    onContextMenu={handleContextMenu}
                    onDrop={handleDrop}
                    onMove={handleMove}
                  />
                </div>
                <Preview
                  onDelete={handleDelete}
                  onExport={handleExport}
                  onOpenImageEditor={(path) => setImageEditorPath(path)}
                />
              </SplitPane>
            </div>
          </ContextMenuPrimitive.Trigger>

          <ContextMenuPrimitive.Portal>
            <ContextMenuPrimitive.Content className={styles.contextMenu}>
              {contextMenuEntry && (
                <>
                  <ContextMenuPrimitive.Item
                    className={styles.contextMenuItem}
                    onClick={() => handleDoubleClick(contextMenuEntry)}
                  >
                    <Eye size={14} />
                    <span>Open</span>
                  </ContextMenuPrimitive.Item>
                  <ContextMenuPrimitive.Separator className={styles.contextMenuSeparator} />
                  <ContextMenuPrimitive.Item
                    className={styles.contextMenuItem}
                    onClick={() => setShowRenameDialog(true)}
                  >
                    <Pencil size={14} />
                    <span>Rename</span>
                  </ContextMenuPrimitive.Item>
                  <ContextMenuPrimitive.Item
                    className={styles.contextMenuItem}
                    onClick={handleDuplicate}
                  >
                    <Copy size={14} />
                    <span>Duplicate</span>
                  </ContextMenuPrimitive.Item>
                  <ContextMenuPrimitive.Item
                    className={`${styles.contextMenuItem} ${styles.danger}`}
                    onClick={handleDelete}
                  >
                    <Trash2 size={14} />
                    <span>Delete{selectedPaths.size > 1 ? ` (${selectedPaths.size})` : ''}</span>
                  </ContextMenuPrimitive.Item>
                  <ContextMenuPrimitive.Separator className={styles.contextMenuSeparator} />
                  <ContextMenuPrimitive.Item
                    className={styles.contextMenuItem}
                    onClick={handleCopy}
                  >
                    <Copy size={14} />
                    <span>Copy{selectedPaths.size > 1 ? ` (${selectedPaths.size})` : ''}</span>
                  </ContextMenuPrimitive.Item>
                  {clipboard &&
                    clipboard.paths.length > 0 &&
                    contextMenuEntry.kind === 'directory' && (
                      <ContextMenuPrimitive.Item
                        className={styles.contextMenuItem}
                        onClick={handlePaste}
                      >
                        <Clipboard size={14} />
                        <span>Paste ({clipboard.paths.length})</span>
                      </ContextMenuPrimitive.Item>
                    )}
                  <ContextMenuPrimitive.Separator className={styles.contextMenuSeparator} />
                  <ContextMenuPrimitive.Item
                    className={styles.contextMenuItem}
                    onClick={handleCopyPath}
                  >
                    <Link size={14} />
                    <span>Copy Path</span>
                  </ContextMenuPrimitive.Item>
                  <ContextMenuPrimitive.Item
                    className={styles.contextMenuItem}
                    onClick={() => handleExport(contextMenuEntry.path)}
                  >
                    <Download size={14} />
                    <span>Export</span>
                  </ContextMenuPrimitive.Item>
                  {contextMenuEntry.kind === 'directory' && (
                    <ContextMenuPrimitive.Item
                      className={styles.contextMenuItem}
                      onClick={handleAddToFavorites}
                    >
                      <Star size={14} />
                      <span>Add to Favorites</span>
                    </ContextMenuPrimitive.Item>
                  )}
                </>
              )}
              {!contextMenuEntry && (
                <>
                  <ContextMenuPrimitive.Item
                    className={styles.contextMenuItem}
                    onClick={() => setShowNewFolderDialog(true)}
                  >
                    <FolderPlus size={14} />
                    <span>New Folder</span>
                  </ContextMenuPrimitive.Item>
                  <ContextMenuPrimitive.Item
                    className={styles.contextMenuItem}
                    onClick={() => setShowNewFileDialog(true)}
                  >
                    <FilePlus size={14} />
                    <span>New File</span>
                  </ContextMenuPrimitive.Item>
                  {clipboard && clipboard.paths.length > 0 && (
                    <>
                      <ContextMenuPrimitive.Separator className={styles.contextMenuSeparator} />
                      <ContextMenuPrimitive.Item
                        className={styles.contextMenuItem}
                        onClick={handlePaste}
                      >
                        <Clipboard size={14} />
                        <span>Paste ({clipboard.paths.length})</span>
                      </ContextMenuPrimitive.Item>
                    </>
                  )}
                </>
              )}
            </ContextMenuPrimitive.Content>
          </ContextMenuPrimitive.Portal>
        </ContextMenuPrimitive.Root>

        {/* Dialogs */}
        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title="Delete"
          message={`Are you sure you want to delete ${selectedPaths.size} item(s)? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          danger
        />

        <InputDialog
          open={showRenameDialog}
          onOpenChange={setShowRenameDialog}
          title="Rename"
          label="New name"
          defaultValue={selectedPaths.size === 1 ? basename(Array.from(selectedPaths)[0]) : ''}
          confirmLabel="Rename"
          onConfirm={handleRename}
        />

        <InputDialog
          open={showNewFolderDialog}
          onOpenChange={setShowNewFolderDialog}
          title="New Folder"
          label="Folder name"
          placeholder="Untitled folder"
          confirmLabel="Create"
          onConfirm={handleNewFolder}
        />

        <InputDialog
          open={showNewFileDialog}
          onOpenChange={setShowNewFileDialog}
          title="New File"
          label="File name"
          placeholder="Untitled.txt"
          confirmLabel="Create"
          onConfirm={handleNewFile}
        />

        <ConflictDialog
          open={showConflictDialog}
          onOpenChange={setShowConflictDialog}
          filename={conflictFilename}
          onReplace={() => conflictResolverRef.current?.('replace')}
          onKeepBoth={() => conflictResolverRef.current?.('keep-both')}
          onSkip={() => conflictResolverRef.current?.('skip')}
        />

        {imageEditorPath && (
          <ImageEditor
            open={!!imageEditorPath}
            onOpenChange={(open) => !open && setImageEditorPath(null)}
            imagePath={imageEditorPath}
            onSave={handleRefresh}
          />
        )}
      </div>
    </ToastProvider>
  );
}

export default App;
