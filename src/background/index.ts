import type { RPCCommand, RPCResponse } from '../shared/types';
import type { PanelToBackgroundMessage, BackgroundToPanelMessage } from '../shared/rpc/messages';

// Handle RPC requests from panel
chrome.runtime.onMessage.addListener(
  (
    message: PanelToBackgroundMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: BackgroundToPanelMessage) => void
  ) => {
    if (message.type !== 'OPFS_RPC_REQUEST') {
      return false;
    }

    const { tabId, command, params, requestId } = message;

    executeOPFSCommand(tabId, command, params)
      .then((response) => {
        sendResponse({
          type: 'OPFS_RPC_RESPONSE',
          requestId,
          response,
        });
      })
      .catch((error) => {
        sendResponse({
          type: 'OPFS_RPC_RESPONSE',
          requestId,
          response: {
            ok: false,
            error: {
              code: 'EXECUTION_ERROR',
              message: error instanceof Error ? error.message : String(error),
            },
          },
        });
      });

    return true; // Keep channel open for async response
  }
);

async function executeOPFSCommand(
  tabId: number,
  command: RPCCommand,
  params: Record<string, unknown>
): Promise<RPCResponse> {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: async (cmd: string, p: Record<string, unknown>) => {
      // Define handler if not present or version mismatch (all code self-contained)
      const handlerVersion = '2026-01-28-1';
      if (window.__OPFS_HANDLER_VERSION__ !== handlerVersion) {
        // Helper functions defined inline
        function getMimeType(filename: string): string {
          const ext = filename.split('.').pop()?.toLowerCase() || '';
          const mimeTypes: Record<string, string> = {
            png: 'image/png',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            gif: 'image/gif',
            webp: 'image/webp',
            svg: 'image/svg+xml',
            ico: 'image/x-icon',
            bmp: 'image/bmp',
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
            csv: 'text/csv',
            pdf: 'application/pdf',
            zip: 'application/zip',
            mp3: 'audio/mpeg',
            wav: 'audio/wav',
            ogg: 'audio/ogg',
            mp4: 'video/mp4',
            webm: 'video/webm',
          };
          return mimeTypes[ext] || 'application/octet-stream';
        }

        async function getDirectoryHandle(
          root: FileSystemDirectoryHandle,
          path: string,
          create = false
        ): Promise<FileSystemDirectoryHandle> {
          if (path === '/' || path === '') return root;
          const parts = path.split('/').filter((part) => part.length > 0);
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
          const parts = path.split('/').filter((part) => part.length > 0);
          if (parts.length === 0) throw new Error('Invalid file path');
          let current: FileSystemDirectoryHandle = root;
          for (let i = 0; i < parts.length - 1; i++) {
            current = await current.getDirectoryHandle(parts[i], { create });
          }
          return await current.getFileHandle(parts[parts.length - 1], { create });
        }

        async function getHandleAtPath(
          root: FileSystemDirectoryHandle,
          path: string,
          options?: { create?: boolean; isFile?: boolean }
        ): Promise<FileSystemDirectoryHandle | FileSystemFileHandle> {
          const parts = path.split('/').filter((part) => part.length > 0);
          if (parts.length === 0) return root;
          let current: FileSystemDirectoryHandle = root;
          for (let i = 0; i < parts.length - 1; i++) {
            current = await current.getDirectoryHandle(parts[i], { create: options?.create });
          }
          const lastName = parts[parts.length - 1];
          if (options?.isFile) {
            return await current.getFileHandle(lastName, { create: options?.create });
          }
          try {
            return await current.getDirectoryHandle(lastName, { create: options?.create });
          } catch {
            return await current.getFileHandle(lastName, { create: false });
          }
        }

        function getParentPath(path: string): string {
          const parts = path.split('/').filter((part) => part.length > 0);
          if (parts.length <= 1) return '/';
          return '/' + parts.slice(0, -1).join('/');
        }

        function getBasename(path: string): string {
          const parts = path.split('/').filter((part) => part.length > 0);
          return parts[parts.length - 1] || '';
        }

        async function isAvailable(): Promise<{ available: boolean; reason?: string }> {
          if (!('storage' in navigator)) {
            return { available: false, reason: 'Storage API not available' };
          }
          if (!('getDirectory' in navigator.storage)) {
            return { available: false, reason: 'OPFS not supported' };
          }
          try {
            await navigator.storage.getDirectory();
            return { available: true };
          } catch (e) {
            const err = e as Error;
            return { available: false, reason: 'Cannot access OPFS: ' + (err.message || e) };
          }
        }

        async function estimate(): Promise<{ usage: number; quota: number }> {
          const est = await navigator.storage.estimate();
          return { usage: est.usage || 0, quota: est.quota || 0 };
        }

        interface FSEntry {
          name: string;
          path: string;
          kind: 'file' | 'directory';
          size?: number;
          lastModified?: number;
          mimeType?: string;
          children?: FSEntry[];
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
            const entryPath = path === '/' ? '/' + name : path + '/' + name;
            if (kind === 'file' && !includeFiles) continue;
            if (kind === 'directory' && !includeDirs) continue;
            const entry: FSEntry = { name, path: entryPath, kind };
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

        async function stat(path: string): Promise<{
          kind: 'file' | 'directory';
          size: number;
          lastModified: number;
          mimeType?: string;
        }> {
          const root = await navigator.storage.getDirectory();
          const handle = await getHandleAtPath(root, path);
          if (handle.kind === 'directory') {
            return { kind: 'directory', size: 0, lastModified: Date.now() };
          }
          const file = await (handle as FileSystemFileHandle).getFile();
          return {
            kind: 'file',
            size: file.size,
            lastModified: file.lastModified,
            mimeType: getMimeType(file.name),
          };
        }

        async function readText(
          path: string,
          maxBytes?: number
        ): Promise<{ text: string; truncated: boolean }> {
          const root = await navigator.storage.getDirectory();
          const handle = await getFileHandle(root, path);
          const file = await handle.getFile();
          const max = maxBytes || 2 * 1024 * 1024;
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

        async function readBase64(
          path: string,
          maxBytes?: number
        ): Promise<{ base64: string; mimeType: string; truncated: boolean }> {
          const root = await navigator.storage.getDirectory();
          const handle = await getFileHandle(root, path);
          const file = await handle.getFile();
          const max = maxBytes || 10 * 1024 * 1024;
          const truncated = file.size > max;
          const blob = truncated ? file.slice(0, max) : file;
          const buffer = await blob.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          return { base64: btoa(binary), mimeType: getMimeType(file.name), truncated };
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

        async function copyEntry(from: string, to: string, _overwrite = false): Promise<void> {
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
            await mkdir(to);
            const sourceDir = sourceHandle as FileSystemDirectoryHandle;
            for await (const [name] of sourceDir.entries()) {
              await copyEntry(from + '/' + name, to + '/' + name, _overwrite);
            }
          }
        }

        async function moveEntry(from: string, to: string, overwrite = false): Promise<void> {
          await copyEntry(from, to, overwrite);
          await deleteEntry(from, true);
        }

        // Define the handler
        window.__OPFS_HANDLER__ = async function (
          command: string,
          params: Record<string, unknown>
        ) {
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
                result = await readText(
                  params.path as string,
                  params.maxBytes as number | undefined
                );
                break;
              case 'fs.writeText':
                await writeText(params.path as string, params.text as string);
                result = null;
                break;
              case 'fs.readBase64':
                result = await readBase64(
                  params.path as string,
                  params.maxBytes as number | undefined
                );
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
                await copyEntry(
                  params.from as string,
                  params.to as string,
                  params.overwrite as boolean
                );
                result = null;
                break;
              case 'fs.move':
                await moveEntry(
                  params.from as string,
                  params.to as string,
                  params.overwrite as boolean
                );
                result = null;
                break;
              default:
                return {
                  ok: false,
                  error: { code: 'UNKNOWN_COMMAND', message: 'Unknown command: ' + command },
                };
            }
            return { ok: true, data: result };
          } catch (e) {
            const err = e as Error;
            let code = 'UNKNOWN_ERROR';
            if (err.name === 'NotFoundError') code = 'NOT_FOUND';
            else if (err.name === 'NotAllowedError') code = 'NOT_ALLOWED';
            else if (err.name === 'InvalidModificationError') code = 'INVALID_MODIFICATION';
            else if (err.name === 'NoModificationAllowedError') code = 'LOCKED';
            else if (err.name === 'TypeMismatchError') code = 'TYPE_MISMATCH';
            return {
              ok: false,
              error: { code, message: err.message || String(e), details: err.stack },
            };
          }
        };
        window.__OPFS_HANDLER_VERSION__ = handlerVersion;
      }

      // Execute command
      return await window.__OPFS_HANDLER__!(cmd, p);
    },
    args: [command, params],
  });

  if (!results || results.length === 0) {
    return {
      ok: false,
      error: {
        code: 'NO_RESULT',
        message: 'No result from script execution',
      },
    };
  }

  return results[0].result as RPCResponse;
}

// Declare global type for the injected handler
declare global {
  interface Window {
    __OPFS_HANDLER__?: (command: string, params: Record<string, unknown>) => Promise<RPCResponse>;
    __OPFS_HANDLER_VERSION__?: string;
  }
}
