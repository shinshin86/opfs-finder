import { describe, it, expect } from 'vitest';
import {
  getFileCategory,
  isTextFile,
  isImageFile,
  isEditableImage,
  getLanguageFromFilename,
  formatFileSize,
  formatDate,
  getKindLabel,
} from '../../src/panel/utils/file';

describe('file utilities', () => {
  describe('getFileCategory', () => {
    it('should categorize images', () => {
      expect(getFileCategory('photo.png')).toBe('image');
      expect(getFileCategory('photo.jpg')).toBe('image');
      expect(getFileCategory('photo.gif')).toBe('image');
      expect(getFileCategory('photo.webp')).toBe('image');
    });

    it('should categorize text files', () => {
      expect(getFileCategory('readme.txt')).toBe('text');
      expect(getFileCategory('notes.md')).toBe('text');
    });

    it('should categorize code files', () => {
      expect(getFileCategory('app.js')).toBe('code');
      expect(getFileCategory('app.ts')).toBe('code');
      expect(getFileCategory('style.css')).toBe('code');
      expect(getFileCategory('data.json')).toBe('code');
    });

    it('should categorize video files', () => {
      expect(getFileCategory('movie.mp4')).toBe('video');
      expect(getFileCategory('clip.webm')).toBe('video');
    });

    it('should categorize audio files', () => {
      expect(getFileCategory('song.mp3')).toBe('audio');
      expect(getFileCategory('sound.wav')).toBe('audio');
    });

    it('should categorize archives', () => {
      expect(getFileCategory('archive.zip')).toBe('archive');
      expect(getFileCategory('backup.tar')).toBe('archive');
    });

    it('should return other for unknown types', () => {
      expect(getFileCategory('file.xyz')).toBe('other');
      expect(getFileCategory('noextension')).toBe('other');
    });
  });

  describe('isTextFile', () => {
    it('should return true for text files', () => {
      expect(isTextFile('readme.txt')).toBe(true);
      expect(isTextFile('notes.md')).toBe(true);
      expect(isTextFile('app.js')).toBe(true);
      expect(isTextFile('config.json')).toBe(true);
    });

    it('should return false for non-text files', () => {
      expect(isTextFile('image.png')).toBe(false);
      expect(isTextFile('video.mp4')).toBe(false);
    });
  });

  describe('isImageFile', () => {
    it('should return true for image files', () => {
      expect(isImageFile('photo.png')).toBe(true);
      expect(isImageFile('photo.jpg')).toBe(true);
      expect(isImageFile('photo.gif')).toBe(true);
    });

    it('should return false for non-image files', () => {
      expect(isImageFile('document.txt')).toBe(false);
      expect(isImageFile('video.mp4')).toBe(false);
    });
  });

  describe('isEditableImage', () => {
    it('should return true for editable images', () => {
      expect(isEditableImage('photo.png')).toBe(true);
      expect(isEditableImage('photo.jpg')).toBe(true);
      expect(isEditableImage('photo.jpeg')).toBe(true);
      expect(isEditableImage('photo.webp')).toBe(true);
    });

    it('should return false for non-editable images', () => {
      expect(isEditableImage('photo.gif')).toBe(false);
      expect(isEditableImage('icon.svg')).toBe(false);
    });
  });

  describe('getLanguageFromFilename', () => {
    it('should return correct language for extensions', () => {
      expect(getLanguageFromFilename('app.js')).toBe('javascript');
      expect(getLanguageFromFilename('app.ts')).toBe('typescript');
      expect(getLanguageFromFilename('data.json')).toBe('json');
      expect(getLanguageFromFilename('style.css')).toBe('css');
      expect(getLanguageFromFilename('index.html')).toBe('html');
      expect(getLanguageFromFilename('notes.md')).toBe('markdown');
    });

    it('should return text for unknown extensions', () => {
      expect(getLanguageFromFilename('file.xyz')).toBe('text');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(512)).toBe('512 B');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
      expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.0 GB');
    });
  });

  describe('formatDate', () => {
    it('should format recent dates', () => {
      const now = Date.now();
      const result = formatDate(now);
      // Should be a time string for today
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('should format yesterday', () => {
      const yesterday = Date.now() - 24 * 60 * 60 * 1000;
      expect(formatDate(yesterday)).toBe('Yesterday');
    });
  });

  describe('getKindLabel', () => {
    it('should return Folder for directories', () => {
      expect(getKindLabel('anything', true)).toBe('Folder');
    });

    it('should return kind for known extensions', () => {
      expect(getKindLabel('image.png', false)).toBe('PNG Image');
      expect(getKindLabel('doc.txt', false)).toBe('Plain Text');
      expect(getKindLabel('app.js', false)).toBe('JavaScript');
    });

    it('should return generic label for unknown extensions', () => {
      expect(getKindLabel('file.xyz', false)).toBe('XYZ File');
    });

    it('should return File for no extension', () => {
      expect(getKindLabel('noextension', false)).toBe('File');
    });
  });
});
