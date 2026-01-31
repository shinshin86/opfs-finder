// File system entry types
export type FileKind = 'file' | 'directory';

export interface FSEntry {
  name: string;
  path: string;
  kind: FileKind;
  size?: number;
  lastModified?: number;
  mimeType?: string;
  children?: FSEntry[];
}

export interface FSStats {
  kind: FileKind;
  size: number;
  lastModified: number;
  mimeType?: string;
}

// Storage estimate
export interface StorageEstimate {
  usage: number;
  quota: number;
}

// RPC Types
export type RPCCommand =
  | 'opfs.isAvailable'
  | 'opfs.estimate'
  | 'fs.list'
  | 'fs.stat'
  | 'fs.readText'
  | 'fs.writeText'
  | 'fs.readBase64'
  | 'fs.writeBase64'
  | 'fs.mkdir'
  | 'fs.createFile'
  | 'fs.delete'
  | 'fs.copy'
  | 'fs.move';

export interface RPCRequest {
  id: string;
  command: RPCCommand;
  params: Record<string, unknown>;
}

export interface RPCSuccessResponse<T = unknown> {
  ok: true;
  data: T;
}

export interface RPCErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: string;
  };
}

export type RPCResponse<T = unknown> = RPCSuccessResponse<T> | RPCErrorResponse;

// Command-specific params and responses
export interface ListParams {
  path: string;
  depth?: number;
  includeFiles?: boolean;
  includeDirs?: boolean;
}

export interface StatParams {
  path: string;
}

export interface ReadTextParams {
  path: string;
  maxBytes?: number;
}

export interface ReadTextResult {
  text: string;
  truncated: boolean;
}

export interface WriteTextParams {
  path: string;
  text: string;
}

export interface ReadBase64Params {
  path: string;
  maxBytes?: number;
}

export interface ReadBase64Result {
  base64: string;
  mimeType: string;
  truncated: boolean;
}

export interface WriteBase64Params {
  path: string;
  base64: string;
}

export interface MkdirParams {
  path: string;
}

export interface CreateFileParams {
  path: string;
}

export interface DeleteParams {
  path: string;
  recursive?: boolean;
}

export interface CopyParams {
  from: string;
  to: string;
  overwrite?: boolean;
}

export interface MoveParams {
  from: string;
  to: string;
  overwrite?: boolean;
}

export interface IsAvailableResult {
  available: boolean;
  reason?: string;
}

// View modes
export type ViewMode = 'list' | 'grid';

// Sort options
export type SortField = 'name' | 'size' | 'modified' | 'kind';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

// Selection
export interface Selection {
  paths: Set<string>;
  lastSelected?: string;
}

// Clipboard
export interface ClipboardData {
  paths: string[];
  operation: 'copy' | 'cut';
}

// Favorites and Recents
export interface Favorite {
  path: string;
  name: string;
}

export interface RecentItem {
  path: string;
  name: string;
  kind: FileKind;
  timestamp: number;
}

// Conflict resolution
export type ConflictResolution = 'replace' | 'keep-both' | 'skip';

// Toast notifications
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  details?: string;
  duration?: number;
}

// Theme
export type Theme = 'light' | 'dark' | 'system';
