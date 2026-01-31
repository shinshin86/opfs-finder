/**
 * Path utilities for OPFS paths
 * All paths use "/" as separator and start with "/"
 */

export function normalize(path: string): string {
  // Remove trailing slash, ensure leading slash
  const parts = path.split('/').filter((p) => p.length > 0);
  return '/' + parts.join('/');
}

export function join(...paths: string[]): string {
  const combined = paths
    .map((p) => p.split('/'))
    .flat()
    .filter((p) => p.length > 0);
  return '/' + combined.join('/');
}

export function dirname(path: string): string {
  const normalized = normalize(path);
  const parts = normalized.split('/').filter((p) => p.length > 0);
  if (parts.length <= 1) return '/';
  return '/' + parts.slice(0, -1).join('/');
}

export function basename(path: string, ext?: string): string {
  const normalized = normalize(path);
  const parts = normalized.split('/').filter((p) => p.length > 0);
  const name = parts[parts.length - 1] || '';
  if (ext && name.endsWith(ext)) {
    return name.slice(0, -ext.length);
  }
  return name;
}

export function extname(path: string): string {
  const name = basename(path);
  const lastDot = name.lastIndexOf('.');
  if (lastDot === -1 || lastDot === 0) return '';
  return name.slice(lastDot);
}

export function isRoot(path: string): boolean {
  return normalize(path) === '/';
}

export function getPathParts(path: string): string[] {
  return normalize(path)
    .split('/')
    .filter((p) => p.length > 0);
}

export function getBreadcrumbs(path: string): { name: string; path: string }[] {
  const parts = getPathParts(path);
  const breadcrumbs = [{ name: 'OPFS', path: '/' }];

  let currentPath = '';
  for (const part of parts) {
    currentPath += '/' + part;
    breadcrumbs.push({ name: part, path: currentPath });
  }

  return breadcrumbs;
}

/**
 * Generate a unique name by appending a number suffix
 * e.g., "file.txt" -> "file 2.txt", "folder" -> "folder 2"
 */
export function generateUniqueName(
  baseName: string,
  existingNames: Set<string>,
  suffix = ' copy'
): string {
  const ext = extname(baseName);
  const nameWithoutExt = ext ? baseName.slice(0, -ext.length) : baseName;

  // First try with suffix
  let newName = nameWithoutExt + suffix + ext;
  if (!existingNames.has(newName)) {
    return newName;
  }

  // Then try with numbers
  let counter = 2;
  while (counter < 1000) {
    newName = `${nameWithoutExt}${suffix} ${counter}${ext}`;
    if (!existingNames.has(newName)) {
      return newName;
    }
    counter++;
  }

  // Fallback with timestamp
  return `${nameWithoutExt}${suffix} ${Date.now()}${ext}`;
}

/**
 * Check if a path is a child of another path
 */
export function isChildOf(childPath: string, parentPath: string): boolean {
  const normalizedChild = normalize(childPath);
  const normalizedParent = normalize(parentPath);

  if (normalizedParent === '/') {
    return normalizedChild !== '/';
  }

  return normalizedChild.startsWith(normalizedParent + '/');
}

/**
 * Flatten a nested FSEntry tree into a flat array
 * Only includes files, not directories
 */
export interface FSEntryLike {
  path: string;
  name: string;
  kind: 'file' | 'directory';
  size?: number;
  lastModified?: number;
  children?: FSEntryLike[];
}

export function flattenEntries<T extends FSEntryLike>(entries: T[]): T[] {
  const result: T[] = [];

  function traverse(items: T[]) {
    for (const item of items) {
      // Include all entries (both files and directories)
      result.push(item);
      if (item.children && item.children.length > 0) {
        traverse(item.children as T[]);
      }
    }
  }

  traverse(entries);
  return result;
}
