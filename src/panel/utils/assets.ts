export function getAssetUrl(path: string): string {
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    return chrome.runtime.getURL(normalized);
  }
  return `/${normalized}`;
}
