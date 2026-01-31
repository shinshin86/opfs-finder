const CHUNK_SIZE = 0x8000;

export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return uint8ArrayToBase64(new Uint8Array(buffer));
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const bytes = base64ToUint8Array(base64);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return buffer as ArrayBuffer;
}

export function base64ToBlob(base64: string, mimeType = 'application/octet-stream'): Blob {
  const buffer = base64ToArrayBuffer(base64);
  return new Blob([buffer], { type: mimeType });
}

export function createObjectUrlFromBase64(base64: string, mimeType?: string): string {
  return URL.createObjectURL(base64ToBlob(base64, mimeType));
}
