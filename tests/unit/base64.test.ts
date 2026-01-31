import { arrayBufferToBase64, base64ToArrayBuffer, base64ToUint8Array, uint8ArrayToBase64 } from '../../src/shared/utils/base64';

describe('base64 utils', () => {
  it('roundtrips Uint8Array via base64', () => {
    const original = new Uint8Array([0, 1, 2, 3, 127, 128, 254, 255]);
    const encoded = uint8ArrayToBase64(original);
    const decoded = base64ToUint8Array(encoded);

    expect(Array.from(decoded)).toEqual(Array.from(original));
  });

  it('roundtrips ArrayBuffer via base64', () => {
    const original = new Uint8Array(256);
    for (let i = 0; i < original.length; i++) {
      original[i] = i;
    }

    const encoded = arrayBufferToBase64(original.buffer);
    const decoded = new Uint8Array(base64ToArrayBuffer(encoded));

    expect(Array.from(decoded)).toEqual(Array.from(original));
  });
});
