import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  FSEntry,
  StorageEstimate,
  ViewMode,
  SortConfig,
  ClipboardData,
  Favorite,
  RecentItem,
  Toast,
  Theme,
} from '../../shared/types';

interface FileSystemState {
  // Current state
  currentPath: string;
  entries: FSEntry[];
  selectedPaths: Set<string>;
  lastSelectedPath: string | null;
  isLoading: boolean;
  error: string | null;
  storageEstimate: StorageEstimate | null;
  isOPFSAvailable: boolean | null;
  opfsUnavailableReason: string | null;

  // Global search cache
  allEntries: FSEntry[];
  isLoadingGlobal: boolean;

  // View state
  viewMode: ViewMode;
  sortConfig: SortConfig;
  searchQuery: string;
  searchGlobal: boolean;

  // Clipboard
  clipboard: ClipboardData | null;

  // Preview state
  previewPath: string | null;

  // Edit state
  editingPath: string | null;
  isDirty: boolean;

  // Actions
  setCurrentPath: (path: string) => void;
  setEntries: (entries: FSEntry[]) => void;
  setSelectedPaths: (paths: Set<string>) => void;
  addToSelection: (path: string) => void;
  removeFromSelection: (path: string) => void;
  toggleSelection: (path: string) => void;
  selectRange: (fromPath: string, toPath: string, entries: FSEntry[]) => void;
  clearSelection: () => void;
  setLastSelectedPath: (path: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setStorageEstimate: (estimate: StorageEstimate | null) => void;
  setOPFSAvailable: (available: boolean, reason?: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setSortConfig: (config: SortConfig) => void;
  setSearchQuery: (query: string) => void;
  setSearchGlobal: (global: boolean) => void;
  setAllEntries: (entries: FSEntry[]) => void;
  setLoadingGlobal: (loading: boolean) => void;
  setClipboard: (data: ClipboardData | null) => void;
  setPreviewPath: (path: string | null) => void;
  setEditingPath: (path: string | null) => void;
  setDirty: (dirty: boolean) => void;
}

export const useFileSystemStore = create<FileSystemState>()((set) => ({
  // Initial state
  currentPath: '/',
  entries: [],
  selectedPaths: new Set<string>(),
  lastSelectedPath: null,
  isLoading: false,
  error: null,
  storageEstimate: null,
  isOPFSAvailable: null,
  opfsUnavailableReason: null,

  // Global search cache
  allEntries: [],
  isLoadingGlobal: false,

  viewMode: 'list',
  sortConfig: { field: 'name', direction: 'asc' },
  searchQuery: '',
  searchGlobal: false,

  clipboard: null,

  previewPath: null,

  editingPath: null,
  isDirty: false,

  // Actions
  setCurrentPath: (path) => set({ currentPath: path }),
  setEntries: (entries) => set({ entries }),
  setSelectedPaths: (paths) => set({ selectedPaths: paths }),
  addToSelection: (path) =>
    set((state) => {
      const newPaths = new Set(state.selectedPaths);
      newPaths.add(path);
      return { selectedPaths: newPaths };
    }),
  removeFromSelection: (path) =>
    set((state) => {
      const newPaths = new Set(state.selectedPaths);
      newPaths.delete(path);
      return { selectedPaths: newPaths };
    }),
  toggleSelection: (path) =>
    set((state) => {
      const newPaths = new Set(state.selectedPaths);
      if (newPaths.has(path)) {
        newPaths.delete(path);
      } else {
        newPaths.add(path);
      }
      return { selectedPaths: newPaths };
    }),
  selectRange: (fromPath, toPath, entries) =>
    set((state) => {
      const paths = entries.map((e) => e.path);
      const fromIndex = paths.indexOf(fromPath);
      const toIndex = paths.indexOf(toPath);

      if (fromIndex === -1 || toIndex === -1) return state;

      const start = Math.min(fromIndex, toIndex);
      const end = Math.max(fromIndex, toIndex);

      const newPaths = new Set(state.selectedPaths);
      for (let i = start; i <= end; i++) {
        newPaths.add(paths[i]);
      }

      return { selectedPaths: newPaths };
    }),
  clearSelection: () => set({ selectedPaths: new Set() }),
  setLastSelectedPath: (path) => set({ lastSelectedPath: path }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setStorageEstimate: (estimate) => set({ storageEstimate: estimate }),
  setOPFSAvailable: (available, reason) =>
    set({ isOPFSAvailable: available, opfsUnavailableReason: reason || null }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSortConfig: (config) => set({ sortConfig: config }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchGlobal: (global) => set({ searchGlobal: global }),
  setAllEntries: (entries) => set({ allEntries: entries }),
  setLoadingGlobal: (loading) => set({ isLoadingGlobal: loading }),
  setClipboard: (data) => set({ clipboard: data }),
  setPreviewPath: (path) => set({ previewPath: path }),
  setEditingPath: (path) => set({ editingPath: path }),
  setDirty: (dirty) => set({ isDirty: dirty }),
}));

// Persisted store for favorites and recents
interface PersistedState {
  favorites: Favorite[];
  recents: RecentItem[];
  theme: Theme;
  useClownMode: boolean;

  addFavorite: (favorite: Favorite) => void;
  removeFavorite: (path: string) => void;
  addRecent: (item: RecentItem) => void;
  clearRecents: () => void;
  setTheme: (theme: Theme) => void;
  setUseClownMode: (value: boolean) => void;
}

export const usePersistedStore = create<PersistedState>()(
  persist(
    (set) => ({
      favorites: [],
      recents: [],
      theme: 'system',
      useClownMode: false,

      addFavorite: (favorite) =>
        set((state) => {
          if (state.favorites.some((f) => f.path === favorite.path)) {
            return state;
          }
          return { favorites: [...state.favorites, favorite] };
        }),
      removeFavorite: (path) =>
        set((state) => ({
          favorites: state.favorites.filter((f) => f.path !== path),
        })),
      addRecent: (item) =>
        set((state) => {
          const filtered = state.recents.filter((r) => r.path !== item.path);
          return {
            recents: [item, ...filtered].slice(0, 20),
          };
        }),
      clearRecents: () => set({ recents: [] }),
      setTheme: (theme) => set({ theme }),
      setUseClownMode: (value) => set({ useClownMode: value }),
    }),
    {
      name: 'opfs-finder-storage',
    }
  )
);

// Toast store
interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  addToast: (toast) =>
    set((state) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const newToast = { ...toast, id };
      return { toasts: [...state.toasts, newToast] };
    }),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
