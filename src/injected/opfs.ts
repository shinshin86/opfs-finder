// This file contains the OPFS operations that will be injected into the page context
// All functions must be self-contained and return JSON-serializable values

import type {
  FSEntry,
  FSStats,
  StorageEstimate,
  IsAvailableResult,
  ReadTextResult,
  ReadBase64Result,
  RPCCommand,
  RPCResponse,
} from '../shared/types';

type OPFSParams = Record<string, unknown>;

// Helper to get MIME type from filename
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const mimeTypes: Record<string, string> = {
    // Images
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    bmp: 'image/bmp',
    // Text
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
    js: 'text/javascript',
    ts: 'text/typescript',
    jsx: 'text/javascript',
    tsx: 'text/typescript',
    css: 'text/css',
    html: 'text/html',
    xml: 'text/xml',
    yaml: 'text/yaml',
    yml: 'text/yaml',
    // Data
    csv: 'text/csv',
    pdf: 'application/pdf',
    zip: 'application/zip',
    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    // Video
    mp4: 'video/mp4',
    webm: 'video/webm',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// Helper to navigate to a path and get the handle
async function getHandleAtPath(
  root: FileSystemDirectoryHandle,
  path: string,
  options?: { create?: boolean; isFile?: boolean }
): Promise<FileSystemDirectoryHandle | FileSystemFileHandle> {
  const parts = path.split('/').filter((p) => p.length > 0);

  if (parts.length === 0) {
    return root;
  }

  let current: FileSystemDirectoryHandle = root;

  for (let i = 0; i < parts.length - 1; i++) {
    current = await current.getDirectoryHandle(parts[i], { create: options?.create });
  }

  const lastName = parts[parts.length - 1];

  if (options?.isFile) {
    return await current.getFileHandle(lastName, { create: options?.create });
  }

  // Try as directory first, then file
  try {
    return await current.getDirectoryHandle(lastName, { create: options?.create });
  } catch {
    return await current.getFileHandle(lastName, { create: false });
  }
}

async function getDirectoryHandle(
  root: FileSystemDirectoryHandle,
  path: string,
  create = false
): Promise<FileSystemDirectoryHandle> {
  if (path === '/' || path === '') {
    return root;
  }

  const parts = path.split('/').filter((p) => p.length > 0);
  let current = root;

  for (const part of parts) {
    current = await current.getDirectoryHandle(part, { create });
  }

  return current;
}

async function getFileHandle(
  root: FileSystemDirectoryHandle,
  path: string,
  create = false
): Promise<FileSystemFileHandle> {
  const parts = path.split('/').filter((p) => p.length > 0);

  if (parts.length === 0) {
    throw new Error('Invalid file path');
  }

  let current: FileSystemDirectoryHandle = root;

  for (let i = 0; i < parts.length - 1; i++) {
    current = await current.getDirectoryHandle(parts[i], { create });
  }

  return await current.getFileHandle(parts[parts.length - 1], { create });
}

function getParentPath(path: string): string {
  const parts = path.split('/').filter((p) => p.length > 0);
  if (parts.length <= 1) return '/';
  return '/' + parts.slice(0, -1).join('/');
}

function getBasename(path: string): string {
  const parts = path.split('/').filter((p) => p.length > 0);
  return parts[parts.length - 1] || '';
}

// OPFS Operations
async function isAvailable(): Promise<IsAvailableResult> {
  if (!('storage' in navigator)) {
    return { available: false, reason: 'Storage API not available' };
  }
  if (!('getDirectory' in navigator.storage)) {
    return { available: false, reason: 'OPFS not supported in this browser' };
  }
  try {
    await navigator.storage.getDirectory();
    return { available: true };
  } catch (e) {
    return {
      available: false,
      reason: `Cannot access OPFS: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

async function estimate(): Promise<StorageEstimate> {
  const est = await navigator.storage.estimate();
  return {
    usage: est.usage || 0,
    quota: est.quota || 0,
  };
}

async function list(
  path: string,
  depth = 1,
  includeFiles = true,
  includeDirs = true
): Promise<FSEntry[]> {
  const root = await navigator.storage.getDirectory();
  const dir = await getDirectoryHandle(root, path);
  const entries: FSEntry[] = [];

  for await (const [name, handle] of dir.entries()) {
    const kind = handle.kind;
    const entryPath = path === '/' ? `/${name}` : `${path}/${name}`;

    if (kind === 'file' && !includeFiles) continue;
    if (kind === 'directory' && !includeDirs) continue;

    const entry: FSEntry = {
      name,
      path: entryPath,
      kind,
    };

    if (kind === 'file') {
      try {
        const file = await (handle as FileSystemFileHandle).getFile();
        entry.size = file.size;
        entry.lastModified = file.lastModified;
        entry.mimeType = getMimeType(name);
      } catch {
        // File may be locked
      }
    } else if (kind === 'directory' && depth > 1) {
      entry.children = await list(entryPath, depth - 1, includeFiles, includeDirs);
    }

    entries.push(entry);
  }

  return entries;
}

async function stat(path: string): Promise<FSStats> {
  const root = await navigator.storage.getDirectory();
  const handle = await getHandleAtPath(root, path);

  if (handle.kind === 'directory') {
    return {
      kind: 'directory',
      size: 0,
      lastModified: Date.now(),
    };
  }

  const file = await (handle as FileSystemFileHandle).getFile();
  return {
    kind: 'file',
    size: file.size,
    lastModified: file.lastModified,
    mimeType: getMimeType(file.name),
  };
}

async function readText(path: string, maxBytes?: number): Promise<ReadTextResult> {
  const root = await navigator.storage.getDirectory();
  const handle = await getFileHandle(root, path);
  const file = await handle.getFile();

  const max = maxBytes || 2 * 1024 * 1024; // 2MB default
  const truncated = file.size > max;

  const blob = truncated ? file.slice(0, max) : file;
  const text = await blob.text();

  return { text, truncated };
}

async function writeText(path: string, text: string): Promise<void> {
  const root = await navigator.storage.getDirectory();
  const handle = await getFileHandle(root, path, true);
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

async function readBase64(path: string, maxBytes?: number): Promise<ReadBase64Result> {
  const root = await navigator.storage.getDirectory();
  const handle = await getFileHandle(root, path);
  const file = await handle.getFile();

  const max = maxBytes || 10 * 1024 * 1024; // 10MB default
  const truncated = file.size > max;

  const blob = truncated ? file.slice(0, max) : file;
  const buffer = await blob.arrayBuffer();

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  return {
    base64,
    mimeType: getMimeType(file.name),
    truncated,
  };
}

async function writeBase64(path: string, base64: string): Promise<void> {
  const root = await navigator.storage.getDirectory();
  const handle = await getFileHandle(root, path, true);

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const writable = await handle.createWritable();
  await writable.write(bytes);
  await writable.close();
}

async function mkdir(path: string): Promise<void> {
  const root = await navigator.storage.getDirectory();
  await getDirectoryHandle(root, path, true);
}

async function createFile(path: string): Promise<void> {
  const root = await navigator.storage.getDirectory();
  await getFileHandle(root, path, true);
}

async function deleteEntry(path: string, recursive = false): Promise<void> {
  const root = await navigator.storage.getDirectory();
  const parentPath = getParentPath(path);
  const name = getBasename(path);

  const parent = await getDirectoryHandle(root, parentPath);
  await parent.removeEntry(name, { recursive });
}

async function copyEntry(from: string, to: string, overwrite = false): Promise<void> {
  const root = await navigator.storage.getDirectory();
  const sourceHandle = await getHandleAtPath(root, from);

  if (sourceHandle.kind === 'file') {
    const file = await (sourceHandle as FileSystemFileHandle).getFile();
    const content = await file.arrayBuffer();

    const destHandle = await getFileHandle(root, to, true);
    const writable = await destHandle.createWritable();
    await writable.write(content);
    await writable.close();
  } else {
    // Directory copy - recursive
    await mkdir(to);

    const sourceDir = sourceHandle as FileSystemDirectoryHandle;
    for await (const [name, handle] of sourceDir.entries()) {
      const newFrom = `${from}/${name}`;
      const newTo = `${to}/${name}`;

      if (handle.kind === 'file') {
        await copyEntry(newFrom, newTo, overwrite);
      } else {
        await copyEntry(newFrom, newTo, overwrite);
      }
    }
  }
}

async function moveEntry(from: string, to: string, _overwrite = false): Promise<void> {
  // Move is implemented as copy + delete since OPFS doesn't have native move
  await copyEntry(from, to, _overwrite);
  await deleteEntry(from, true);
}

// Main RPC handler
export async function handleOPFSRpc(command: RPCCommand, params: OPFSParams): Promise<RPCResponse> {
  try {
    let result: unknown;

    switch (command) {
      case 'opfs.isAvailable':
        result = await isAvailable();
        break;
      case 'opfs.estimate':
        result = await estimate();
        break;
      case 'fs.list':
        result = await list(
          params.path as string,
          (params.depth as number) || 1,
          params.includeFiles !== false,
          params.includeDirs !== false
        );
        break;
      case 'fs.stat':
        result = await stat(params.path as string);
        break;
      case 'fs.readText':
        result = await readText(params.path as string, params.maxBytes as number | undefined);
        break;
      case 'fs.writeText':
        await writeText(params.path as string, params.text as string);
        result = null;
        break;
      case 'fs.readBase64':
        result = await readBase64(params.path as string, params.maxBytes as number | undefined);
        break;
      case 'fs.writeBase64':
        await writeBase64(params.path as string, params.base64 as string);
        result = null;
        break;
      case 'fs.mkdir':
        await mkdir(params.path as string);
        result = null;
        break;
      case 'fs.createFile':
        await createFile(params.path as string);
        result = null;
        break;
      case 'fs.delete':
        await deleteEntry(params.path as string, params.recursive as boolean);
        result = null;
        break;
      case 'fs.copy':
        await copyEntry(params.from as string, params.to as string, params.overwrite as boolean);
        result = null;
        break;
      case 'fs.move':
        await moveEntry(params.from as string, params.to as string, params.overwrite as boolean);
        result = null;
        break;
      default:
        return {
          ok: false,
          error: {
            code: 'UNKNOWN_COMMAND',
            message: `Unknown command: ${command}`,
          },
        };
    }

    return { ok: true, data: result };
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    let code = 'UNKNOWN_ERROR';

    if (error.name === 'NotFoundError') {
      code = 'NOT_FOUND';
    } else if (error.name === 'NotAllowedError') {
      code = 'NOT_ALLOWED';
    } else if (error.name === 'InvalidModificationError') {
      code = 'INVALID_MODIFICATION';
    } else if (error.name === 'NoModificationAllowedError') {
      code = 'LOCKED';
    } else if (error.name === 'TypeMismatchError') {
      code = 'TYPE_MISMATCH';
    }

    return {
      ok: false,
      error: {
        code,
        message: error.message,
        details: error.stack,
      },
    };
  }
}

// Export for use in injected script
export const opfsScript = `
${getMimeType.toString()}
${getHandleAtPath.toString()}
${getDirectoryHandle.toString()}
${getFileHandle.toString()}
${getParentPath.toString()}
${getBasename.toString()}
${isAvailable.toString()}
${estimate.toString()}
${list.toString()}
${stat.toString()}
${readText.toString()}
${writeText.toString()}
${readBase64.toString()}
${writeBase64.toString()}
${mkdir.toString()}
${createFile.toString()}
${deleteEntry.toString()}
${copyEntry.toString()}
${moveEntry.toString()}
${handleOPFSRpc.toString()}
`;
