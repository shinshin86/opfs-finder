import { describe, it, expect } from 'vitest';
import {
  normalize,
  join,
  dirname,
  basename,
  extname,
  isRoot,
  getPathParts,
  getBreadcrumbs,
  generateUniqueName,
  isChildOf,
  flattenEntries,
} from '../../src/panel/utils/path';

describe('path utilities', () => {
  describe('normalize', () => {
    it('should normalize paths with leading slash', () => {
      expect(normalize('foo/bar')).toBe('/foo/bar');
      expect(normalize('/foo/bar')).toBe('/foo/bar');
    });

    it('should remove trailing slashes', () => {
      expect(normalize('/foo/bar/')).toBe('/foo/bar');
      expect(normalize('/foo/')).toBe('/foo');
    });

    it('should handle root path', () => {
      expect(normalize('/')).toBe('/');
      expect(normalize('')).toBe('/');
    });

    it('should handle multiple slashes', () => {
      expect(normalize('//foo//bar//')).toBe('/foo/bar');
    });
  });

  describe('join', () => {
    it('should join paths', () => {
      expect(join('/foo', 'bar')).toBe('/foo/bar');
      expect(join('/foo', 'bar', 'baz')).toBe('/foo/bar/baz');
    });

    it('should handle root', () => {
      expect(join('/', 'foo')).toBe('/foo');
    });

    it('should handle empty parts', () => {
      expect(join('/foo', '', 'bar')).toBe('/foo/bar');
    });
  });

  describe('dirname', () => {
    it('should return parent directory', () => {
      expect(dirname('/foo/bar/baz')).toBe('/foo/bar');
      expect(dirname('/foo/bar')).toBe('/foo');
    });

    it('should return root for top-level', () => {
      expect(dirname('/foo')).toBe('/');
      expect(dirname('/')).toBe('/');
    });
  });

  describe('basename', () => {
    it('should return file name', () => {
      expect(basename('/foo/bar/file.txt')).toBe('file.txt');
      expect(basename('/foo/bar')).toBe('bar');
    });

    it('should remove extension if provided', () => {
      expect(basename('/foo/file.txt', '.txt')).toBe('file');
    });

    it('should handle root', () => {
      expect(basename('/')).toBe('');
    });
  });

  describe('extname', () => {
    it('should return extension', () => {
      expect(extname('/foo/file.txt')).toBe('.txt');
      expect(extname('/foo/file.tar.gz')).toBe('.gz');
    });

    it('should return empty for no extension', () => {
      expect(extname('/foo/file')).toBe('');
      expect(extname('/foo/.hidden')).toBe('');
    });
  });

  describe('isRoot', () => {
    it('should detect root path', () => {
      expect(isRoot('/')).toBe(true);
      expect(isRoot('')).toBe(true);
    });

    it('should return false for non-root', () => {
      expect(isRoot('/foo')).toBe(false);
      expect(isRoot('/foo/bar')).toBe(false);
    });
  });

  describe('getPathParts', () => {
    it('should split path into parts', () => {
      expect(getPathParts('/foo/bar/baz')).toEqual(['foo', 'bar', 'baz']);
      expect(getPathParts('/')).toEqual([]);
    });
  });

  describe('getBreadcrumbs', () => {
    it('should return breadcrumbs', () => {
      const crumbs = getBreadcrumbs('/foo/bar');
      expect(crumbs).toEqual([
        { name: 'OPFS', path: '/' },
        { name: 'foo', path: '/foo' },
        { name: 'bar', path: '/foo/bar' },
      ]);
    });

    it('should handle root', () => {
      const crumbs = getBreadcrumbs('/');
      expect(crumbs).toEqual([{ name: 'OPFS', path: '/' }]);
    });
  });

  describe('generateUniqueName', () => {
    it('should generate unique name with copy suffix', () => {
      const existing = new Set(['file.txt']);
      expect(generateUniqueName('file.txt', existing)).toBe('file copy.txt');
    });

    it('should add number if copy exists', () => {
      const existing = new Set(['file.txt', 'file copy.txt']);
      expect(generateUniqueName('file.txt', existing)).toBe('file copy 2.txt');
    });

    it('should work with folders', () => {
      const existing = new Set(['folder']);
      expect(generateUniqueName('folder', existing)).toBe('folder copy');
    });
  });

  describe('isChildOf', () => {
    it('should detect child paths', () => {
      expect(isChildOf('/foo/bar', '/foo')).toBe(true);
      expect(isChildOf('/foo/bar/baz', '/foo')).toBe(true);
    });

    it('should return false for same path', () => {
      expect(isChildOf('/foo', '/foo')).toBe(false);
    });

    it('should return false for non-child', () => {
      expect(isChildOf('/bar', '/foo')).toBe(false);
      expect(isChildOf('/foobar', '/foo')).toBe(false);
    });

    it('should handle root as parent', () => {
      expect(isChildOf('/foo', '/')).toBe(true);
      expect(isChildOf('/', '/')).toBe(false);
    });
  });

  describe('flattenEntries', () => {
    it('should flatten nested entries', () => {
      const entries = [
        { path: '/foo', name: 'foo', kind: 'directory' as const, children: [
          { path: '/foo/bar.txt', name: 'bar.txt', kind: 'file' as const },
          { path: '/foo/baz', name: 'baz', kind: 'directory' as const, children: [
            { path: '/foo/baz/qux.txt', name: 'qux.txt', kind: 'file' as const },
          ] },
        ] },
        { path: '/root.txt', name: 'root.txt', kind: 'file' as const },
      ];

      const result = flattenEntries(entries);
      expect(result).toHaveLength(5);
      expect(result.map(e => e.path)).toEqual([
        '/foo',
        '/foo/bar.txt',
        '/foo/baz',
        '/foo/baz/qux.txt',
        '/root.txt',
      ]);
    });

    it('should return empty array for empty input', () => {
      expect(flattenEntries([])).toEqual([]);
    });

    it('should handle entries without children', () => {
      const entries = [
        { path: '/a.txt', name: 'a.txt', kind: 'file' as const },
        { path: '/b.txt', name: 'b.txt', kind: 'file' as const },
      ];

      const result = flattenEntries(entries);
      expect(result).toHaveLength(2);
    });
  });
});
