import React from 'react';
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
import type { FSEntry, ClipboardData } from '../../../shared/types';
import styles from './ContextMenu.module.css';

interface ContextMenuProps {
  children: React.ReactNode;
  entry?: FSEntry;
  selectedCount: number;
  clipboard: ClipboardData | null;
  onOpen?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onCopyPath?: () => void;
  onExport?: () => void;
  onNewFolder?: () => void;
  onNewFile?: () => void;
  onAddToFavorites?: () => void;
}

export function ContextMenu({
  children,
  entry,
  selectedCount,
  clipboard,
  onOpen,
  onRename,
  onDelete,
  onDuplicate,
  onCopy,
  onPaste,
  onCopyPath,
  onExport,
  onNewFolder,
  onNewFile,
  onAddToFavorites,
}: ContextMenuProps) {
  const hasEntry = !!entry;
  const hasClipboard = clipboard && clipboard.paths.length > 0;
  const isDirectory = entry?.kind === 'directory';

  return (
    <ContextMenuPrimitive.Root>
      <ContextMenuPrimitive.Trigger asChild>{children}</ContextMenuPrimitive.Trigger>
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content className={styles.content}>
          {hasEntry && (
            <>
              <ContextMenuPrimitive.Item className={styles.item} onClick={onOpen}>
                <Eye size={14} />
                <span>Open</span>
              </ContextMenuPrimitive.Item>
              <ContextMenuPrimitive.Separator className={styles.separator} />
              <ContextMenuPrimitive.Item className={styles.item} onClick={onRename}>
                <Pencil size={14} />
                <span>Rename</span>
              </ContextMenuPrimitive.Item>
              <ContextMenuPrimitive.Item className={styles.item} onClick={onDuplicate}>
                <Copy size={14} />
                <span>Duplicate</span>
              </ContextMenuPrimitive.Item>
              <ContextMenuPrimitive.Item
                className={`${styles.item} ${styles.danger}`}
                onClick={onDelete}
              >
                <Trash2 size={14} />
                <span>Delete{selectedCount > 1 ? ` (${selectedCount})` : ''}</span>
              </ContextMenuPrimitive.Item>
              <ContextMenuPrimitive.Separator className={styles.separator} />
              <ContextMenuPrimitive.Item className={styles.item} onClick={onCopy}>
                <Copy size={14} />
                <span>Copy{selectedCount > 1 ? ` (${selectedCount})` : ''}</span>
              </ContextMenuPrimitive.Item>
              {hasClipboard && isDirectory && (
                <ContextMenuPrimitive.Item className={styles.item} onClick={onPaste}>
                  <Clipboard size={14} />
                  <span>Paste ({clipboard.paths.length})</span>
                </ContextMenuPrimitive.Item>
              )}
              <ContextMenuPrimitive.Separator className={styles.separator} />
              <ContextMenuPrimitive.Item className={styles.item} onClick={onCopyPath}>
                <Link size={14} />
                <span>Copy Path</span>
              </ContextMenuPrimitive.Item>
              <ContextMenuPrimitive.Item className={styles.item} onClick={onExport}>
                <Download size={14} />
                <span>Export</span>
              </ContextMenuPrimitive.Item>
              {isDirectory && (
                <ContextMenuPrimitive.Item className={styles.item} onClick={onAddToFavorites}>
                  <Star size={14} />
                  <span>Add to Favorites</span>
                </ContextMenuPrimitive.Item>
              )}
            </>
          )}
          {!hasEntry && (
            <>
              <ContextMenuPrimitive.Item className={styles.item} onClick={onNewFolder}>
                <FolderPlus size={14} />
                <span>New Folder</span>
              </ContextMenuPrimitive.Item>
              <ContextMenuPrimitive.Item className={styles.item} onClick={onNewFile}>
                <FilePlus size={14} />
                <span>New File</span>
              </ContextMenuPrimitive.Item>
              {hasClipboard && (
                <>
                  <ContextMenuPrimitive.Separator className={styles.separator} />
                  <ContextMenuPrimitive.Item className={styles.item} onClick={onPaste}>
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
  );
}

// Standalone context menu trigger wrapper
interface ContextMenuWrapperProps {
  children: React.ReactNode;
  onContextMenu: (e: React.MouseEvent) => void;
}

export function ContextMenuWrapper({ children, onContextMenu }: ContextMenuWrapperProps) {
  return <div onContextMenu={onContextMenu}>{children}</div>;
}
