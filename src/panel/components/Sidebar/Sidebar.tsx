import { useState, useEffect, useCallback } from 'react';
import { HardDrive, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { useFileSystemStore, usePersistedStore } from '../../store';
import { opfsApi } from '../../utils/rpc';
import { formatFileSize } from '../../utils/file';
import type { FSEntry } from '../../../shared/types';
import styles from './Sidebar.module.css';

interface SidebarProps {
  onNavigate: (path: string) => void;
  onMove: (sourcePaths: string[], targetPath: string) => void;
}

interface TreeNode {
  entry: FSEntry;
  children: TreeNode[] | null; // null = not loaded, [] = loaded but empty
  isExpanded: boolean;
}

interface FolderTreeItemProps {
  node: TreeNode;
  level: number;
  currentPath: string;
  onToggle: (path: string) => void;
  onSelect: (path: string) => void;
  onMove: (sourcePaths: string[], targetPath: string) => void;
  dragOverPath: string | null;
  onDragHover: (path: string | null) => void;
}

function FolderTreeItem({
  node,
  level,
  currentPath,
  onToggle,
  onSelect,
  onMove,
  dragOverPath,
  onDragHover,
}: FolderTreeItemProps) {
  const isSelected = node.entry.path === currentPath;
  const hasChildren = node.children === null || node.children.length > 0;
  const isDragOver = dragOverPath === node.entry.path;

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(node.entry.path);
  };

  const handleClick = () => {
    onSelect(node.entry.path);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = () => {
    onDragHover(node.entry.path);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    onDragHover(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const pathsJson = e.dataTransfer.getData('application/x-opfs-paths');
    if (!pathsJson) return;
    const paths = JSON.parse(pathsJson) as string[];
    onMove(paths, node.entry.path);
    onDragHover(null);
  };

  return (
    <>
      <button
        className={`${styles.treeItem} ${isSelected ? styles.selected : ''} ${isDragOver ? styles.dragOver : ''}`}
        style={{ paddingLeft: `${8 + level * 16}px` }}
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <span
          className={styles.chevron}
          onClick={handleChevronClick}
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
        >
          {node.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        {node.isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
        <span className={styles.itemName}>{node.entry.name}</span>
      </button>
      {node.isExpanded &&
        node.children &&
        node.children.map((child) => (
          <FolderTreeItem
            key={child.entry.path}
            node={child}
            level={level + 1}
            currentPath={currentPath}
            onToggle={onToggle}
            onSelect={onSelect}
            onMove={onMove}
            dragOverPath={dragOverPath}
            onDragHover={onDragHover}
          />
        ))}
    </>
  );
}

export function Sidebar({ onNavigate, onMove }: SidebarProps) {
  const { currentPath, storageEstimate } = useFileSystemStore();
  const { useClownMode, setUseClownMode } = usePersistedStore();
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['/']));

  const usagePercent = storageEstimate ? (storageEstimate.usage / storageEstimate.quota) * 100 : 0;

  // Load directory entries for a given path
  const loadDirectory = useCallback(async (path: string): Promise<FSEntry[]> => {
    try {
      const result = await opfsApi.list({ path, depth: 1 });
      // Filter to only directories and sort alphabetically
      return result
        .filter((e) => e.kind === 'directory')
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch {
      return [];
    }
  }, []);

  // Build tree node from entries
  const buildTreeNodes = useCallback((entries: FSEntry[], expanded: Set<string>): TreeNode[] => {
    return entries.map((entry) => ({
      entry,
      children: expanded.has(entry.path) ? null : null, // Will be loaded when expanded
      isExpanded: expanded.has(entry.path),
    }));
  }, []);

  // Load root level on mount
  useEffect(() => {
    async function loadRoot() {
      const entries = await loadDirectory('/');
      setTreeData(buildTreeNodes(entries, expandedPaths));
    }
    loadRoot();
  }, []);

  // Auto-expand path to current directory
  useEffect(() => {
    if (currentPath === '/') return;

    const segments = currentPath.split('/').filter(Boolean);
    const pathsToExpand: string[] = ['/'];
    let current = '';
    for (const segment of segments) {
      current += '/' + segment;
      pathsToExpand.push(current);
    }

    // Remove the last path (current directory) from expansion unless it's already expanded
    pathsToExpand.pop();

    setExpandedPaths((prev) => {
      const newSet = new Set(prev);
      pathsToExpand.forEach((p) => newSet.add(p));
      return newSet;
    });
  }, [currentPath]);

  // Load children for expanded paths
  useEffect(() => {
    async function updateTreeWithExpanded() {
      const updateNode = async (nodes: TreeNode[]): Promise<TreeNode[]> => {
        const updated: TreeNode[] = [];
        for (const node of nodes) {
          const isExpanded = expandedPaths.has(node.entry.path);
          let children = node.children;

          if (isExpanded && children === null) {
            // Need to load children
            const entries = await loadDirectory(node.entry.path);
            children = buildTreeNodes(entries, expandedPaths);
          } else if (isExpanded && children) {
            // Recursively update children
            children = await updateNode(children);
          } else if (!isExpanded) {
            children = null;
          }

          updated.push({
            ...node,
            isExpanded,
            children,
          });
        }
        return updated;
      };

      const entries = await loadDirectory('/');
      let newTree = buildTreeNodes(entries, expandedPaths);
      newTree = await updateNode(newTree);
      setTreeData(newTree);
    }

    updateTreeWithExpanded();
  }, [expandedPaths, loadDirectory, buildTreeNodes]);

  const handleToggle = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  }, []);

  const handleSelect = useCallback(
    (path: string) => {
      onNavigate(path);
    },
    [onNavigate]
  );

  const handleRootClick = useCallback(() => {
    onNavigate('/');
  }, [onNavigate]);

  const handleRootDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleRootDragEnter = useCallback(() => {
    setDragOverPath('/');
  }, []);

  const handleRootDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverPath(null);
  }, []);

  const handleRootDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const pathsJson = e.dataTransfer.getData('application/x-opfs-paths');
      if (!pathsJson) return;
      const paths = JSON.parse(pathsJson) as string[];
      onMove(paths, '/');
      setDragOverPath(null);
    },
    [onMove]
  );

  return (
    <div className={styles.sidebar}>
      <div className={styles.treeContainer}>
        {/* Root item */}
        <button
          className={`${styles.treeItem} ${styles.rootItem} ${currentPath === '/' ? styles.selected : ''} ${dragOverPath === '/' ? styles.dragOver : ''}`}
          onClick={handleRootClick}
          onDragEnter={handleRootDragEnter}
          onDragLeave={handleRootDragLeave}
          onDragOver={handleRootDragOver}
          onDrop={handleRootDrop}
        >
          <HardDrive size={16} />
          <span className={styles.itemName}>OPFS</span>
        </button>

        {/* Folder tree */}
        <div className={styles.treeContent}>
          {treeData.map((node) => (
            <FolderTreeItem
              key={node.entry.path}
              node={node}
              level={0}
              currentPath={currentPath}
              onToggle={handleToggle}
              onSelect={handleSelect}
              onMove={onMove}
              dragOverPath={dragOverPath}
              onDragHover={setDragOverPath}
            />
          ))}
        </div>
      </div>

      <div className={styles.storageSection}>
        <div className={styles.storageHeader}>
          <span>Storage</span>
          {storageEstimate && (
            <span className={styles.storageText}>
              {formatFileSize(storageEstimate.usage)} of {formatFileSize(storageEstimate.quota)}
            </span>
          )}
        </div>
        <div className={styles.storageBar}>
          <div
            className={styles.storageUsed}
            style={{ width: `${Math.min(usagePercent, 100)}%` }}
          />
        </div>
        <label className={styles.iconToggle}>
          <input
            type="checkbox"
            checked={useClownMode}
            onChange={(e) => setUseClownMode(e.target.checked)}
          />
          <span>Use Clown mode</span>
        </label>
      </div>
    </div>
  );
}
