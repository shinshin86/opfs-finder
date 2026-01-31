import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Search,
  RefreshCw,
  Plus,
  FolderPlus,
  FilePlus,
  Upload,
  List,
  Grid,
  ArrowUpDown,
  ChevronDown,
  Globe,
  FolderSearch,
} from 'lucide-react';
import { useFileSystemStore } from '../../store';
import type { SortField } from '../../../shared/types';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  onRefresh: () => void;
  onNewFolder: () => void;
  onNewFile: () => void;
  onImport: () => void;
}

export function Toolbar({ onRefresh, onNewFolder, onNewFile, onImport }: ToolbarProps) {
  const {
    viewMode,
    setViewMode,
    sortConfig,
    setSortConfig,
    searchQuery,
    setSearchQuery,
    searchGlobal,
    setSearchGlobal,
    isLoading,
    isLoadingGlobal,
  } = useFileSystemStore();

  const handleSortChange = (field: SortField) => {
    setSortConfig({
      field,
      direction: sortConfig.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  const sortLabels: Record<SortField, string> = {
    name: 'Name',
    size: 'Size',
    modified: 'Date Modified',
    kind: 'Kind',
  };

  return (
    <div className={styles.toolbar}>
      {/* Search */}
      <div className={styles.searchContainer}>
        <Search size={14} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder={searchGlobal ? 'Search all files...' : 'Search...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button
          className={`${styles.searchToggle} ${searchGlobal ? styles.active : ''} ${isLoadingGlobal ? styles.loading : ''}`}
          onClick={() => setSearchGlobal(!searchGlobal)}
          title={searchGlobal ? 'Search all files' : 'Search in current folder'}
          disabled={isLoadingGlobal}
        >
          {searchGlobal ? <Globe size={14} /> : <FolderSearch size={14} />}
        </button>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        {/* Sort */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className={styles.iconButton} title="Sort">
              <ArrowUpDown size={16} />
              <ChevronDown size={12} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className={styles.dropdownContent} sideOffset={5}>
              {(Object.keys(sortLabels) as SortField[]).map((field) => (
                <DropdownMenu.Item
                  key={field}
                  className={styles.dropdownItem}
                  onClick={() => handleSortChange(field)}
                >
                  <span>{sortLabels[field]}</span>
                  {sortConfig.field === field && (
                    <span className={styles.sortIndicator}>
                      {sortConfig.direction === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* View Mode */}
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`}
            onClick={() => setViewMode('list')}
            title="List view"
          >
            <List size={16} />
          </button>
          <button
            className={`${styles.viewButton} ${viewMode === 'grid' ? styles.active : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            <Grid size={16} />
          </button>
        </div>

        {/* Refresh */}
        <button
          className={`${styles.iconButton} ${isLoading ? styles.spinning : ''}`}
          onClick={onRefresh}
          title="Refresh"
        >
          <RefreshCw size={16} />
        </button>

        {/* New */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className={styles.iconButton} title="New">
              <Plus size={16} />
              <ChevronDown size={12} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className={styles.dropdownContent} sideOffset={5}>
              <DropdownMenu.Item className={styles.dropdownItem} onClick={onNewFolder}>
                <FolderPlus size={16} />
                <span>New Folder</span>
              </DropdownMenu.Item>
              <DropdownMenu.Item className={styles.dropdownItem} onClick={onNewFile}>
                <FilePlus size={16} />
                <span>New Text File</span>
              </DropdownMenu.Item>
              <DropdownMenu.Separator className={styles.dropdownSeparator} />
              <DropdownMenu.Item className={styles.dropdownItem} onClick={onImport}>
                <Upload size={16} />
                <span>Import Files...</span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </div>
  );
}
