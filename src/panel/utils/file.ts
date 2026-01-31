import { extname } from './path';

export type FileCategory =
  | 'image'
  | 'text'
  | 'code'
  | 'video'
  | 'audio'
  | 'document'
  | 'archive'
  | 'other';

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp']);
const TEXT_EXTENSIONS = new Set(['txt', 'md', 'markdown', 'text']);
const CODE_EXTENSIONS = new Set([
  'js',
  'ts',
  'jsx',
  'tsx',
  'json',
  'css',
  'scss',
  'sass',
  'less',
  'html',
  'htm',
  'xml',
  'yaml',
  'yml',
  'toml',
  'ini',
  'conf',
  'config',
  'sh',
  'bash',
  'zsh',
  'fish',
  'py',
  'rb',
  'php',
  'java',
  'c',
  'cpp',
  'h',
  'hpp',
  'cs',
  'go',
  'rs',
  'swift',
  'kt',
  'scala',
  'vue',
  'svelte',
]);
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a']);
const DOCUMENT_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx']);
const ARCHIVE_EXTENSIONS = new Set(['zip', 'tar', 'gz', 'rar', '7z', 'bz2']);

export function getFileCategory(filename: string): FileCategory {
  const ext = extname(filename).slice(1).toLowerCase();

  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (TEXT_EXTENSIONS.has(ext)) return 'text';
  if (CODE_EXTENSIONS.has(ext)) return 'code';
  if (VIDEO_EXTENSIONS.has(ext)) return 'video';
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio';
  if (DOCUMENT_EXTENSIONS.has(ext)) return 'document';
  if (ARCHIVE_EXTENSIONS.has(ext)) return 'archive';

  return 'other';
}

export function isTextFile(filename: string): boolean {
  const category = getFileCategory(filename);
  return category === 'text' || category === 'code';
}

export function isImageFile(filename: string): boolean {
  return getFileCategory(filename) === 'image';
}

export function isEditableImage(filename: string): boolean {
  const ext = extname(filename).slice(1).toLowerCase();
  return ['png', 'jpg', 'jpeg', 'webp'].includes(ext);
}

export function getLanguageFromFilename(filename: string): string {
  const ext = extname(filename).slice(1).toLowerCase();

  const langMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    json: 'json',
    css: 'css',
    scss: 'css',
    sass: 'css',
    less: 'css',
    html: 'html',
    htm: 'html',
    xml: 'xml',
    md: 'markdown',
    markdown: 'markdown',
    yaml: 'yaml',
    yml: 'yaml',
    py: 'python',
    rb: 'ruby',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    go: 'go',
    rs: 'rust',
    swift: 'swift',
    kt: 'kotlin',
    php: 'php',
    sh: 'shell',
    bash: 'shell',
    sql: 'sql',
  };

  return langMap[ext] || 'text';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  if (i === 0) return `${bytes} B`;

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  } else if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } else {
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
}

export function getKindLabel(filename: string, isDirectory: boolean): string {
  if (isDirectory) return 'Folder';

  const ext = extname(filename).slice(1).toLowerCase();
  if (!ext) return 'File';

  const kindMap: Record<string, string> = {
    png: 'PNG Image',
    jpg: 'JPEG Image',
    jpeg: 'JPEG Image',
    gif: 'GIF Image',
    webp: 'WebP Image',
    svg: 'SVG Image',
    ico: 'Icon',
    txt: 'Plain Text',
    md: 'Markdown',
    json: 'JSON',
    js: 'JavaScript',
    ts: 'TypeScript',
    jsx: 'JavaScript',
    tsx: 'TypeScript',
    css: 'CSS',
    html: 'HTML',
    xml: 'XML',
    pdf: 'PDF Document',
    zip: 'ZIP Archive',
    mp4: 'MP4 Video',
    mp3: 'MP3 Audio',
    wav: 'WAV Audio',
  };

  return kindMap[ext] || `${ext.toUpperCase()} File`;
}
