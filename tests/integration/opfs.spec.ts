import { test, expect } from '@playwright/test';

test.describe('OPFS Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clean up any existing data
    await page.click('#cleanup');
    await page.waitForSelector('.success');
  });

  test('should setup test data', async ({ page }) => {
    await page.click('#setup');

    // Wait for setup to complete
    await expect(page.locator('text=Setup complete!')).toBeVisible();

    // Verify files were created
    await page.click('#list');
    const output = page.locator('#output');
    await expect(output).toContainText('images');
    await expect(output).toContainText('notes');
    await expect(output).toContainText('data');
  });

  test('should list directory contents', async ({ page }) => {
    // Setup first
    await page.click('#setup');
    await expect(page.locator('text=Setup complete!')).toBeVisible();

    // List contents
    await page.click('#list');

    const output = page.locator('#output');
    await expect(output).toContainText('a.png');
    await expect(output).toContainText('hello.txt');
    await expect(output).toContainText('sample.json');
  });

  test('should read and write text files', async ({ page }) => {
    // Test reading and writing via OPFS API
    const result = await page.evaluate(async () => {
      const root = await navigator.storage.getDirectory();

      // Write a file
      const testDir = await root.getDirectoryHandle('test', { create: true });
      const fileHandle = await testDir.getFileHandle('test.txt', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write('Hello, World!');
      await writable.close();

      // Read it back
      const file = await fileHandle.getFile();
      const content = await file.text();

      // Cleanup
      await root.removeEntry('test', { recursive: true });

      return content;
    });

    expect(result).toBe('Hello, World!');
  });

  test('should copy and move files', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const root = await navigator.storage.getDirectory();

      // Create source file
      const srcHandle = await root.getFileHandle('source.txt', { create: true });
      let writable = await srcHandle.createWritable();
      await writable.write('Original content');
      await writable.close();

      // Read source
      const srcFile = await srcHandle.getFile();
      const content = await srcFile.arrayBuffer();

      // Copy to destination
      const destHandle = await root.getFileHandle('copy.txt', { create: true });
      writable = await destHandle.createWritable();
      await writable.write(content);
      await writable.close();

      // Verify copy
      const destFile = await destHandle.getFile();
      const destContent = await destFile.text();

      // Cleanup
      await root.removeEntry('source.txt');
      await root.removeEntry('copy.txt');

      return destContent;
    });

    expect(result).toBe('Original content');
  });

  test('should delete files and directories', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const root = await navigator.storage.getDirectory();

      // Create directory with file
      const dir = await root.getDirectoryHandle('todelete', { create: true });
      const fileHandle = await dir.getFileHandle('file.txt', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write('Delete me');
      await writable.close();

      // Delete recursively
      await root.removeEntry('todelete', { recursive: true });

      // Verify deletion
      try {
        await root.getDirectoryHandle('todelete');
        return false; // Should not reach here
      } catch (e) {
        return true; // Directory was deleted
      }
    });

    expect(result).toBe(true);
  });

  test('should handle base64 read/write for binary files', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const root = await navigator.storage.getDirectory();

      // Create binary data (simple pattern)
      const originalData = new Uint8Array([0, 1, 2, 3, 255, 254, 253, 252]);

      // Write binary file
      const fileHandle = await root.getFileHandle('binary.bin', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(originalData);
      await writable.close();

      // Read back as ArrayBuffer
      const file = await fileHandle.getFile();
      const buffer = await file.arrayBuffer();
      const readData = new Uint8Array(buffer);

      // Convert to base64 (like our RPC does)
      let binary = '';
      for (let i = 0; i < readData.length; i++) {
        binary += String.fromCharCode(readData[i]);
      }
      const base64 = btoa(binary);

      // Convert back from base64
      const decoded = atob(base64);
      const decodedData = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        decodedData[i] = decoded.charCodeAt(i);
      }

      // Cleanup
      await root.removeEntry('binary.bin');

      // Verify data matches
      return {
        original: Array.from(originalData),
        decoded: Array.from(decodedData),
        base64,
      };
    });

    expect(result.decoded).toEqual(result.original);
  });

  test('should cleanup all test data', async ({ page }) => {
    // Setup some data first
    await page.click('#setup');
    await expect(page.locator('text=Setup complete!')).toBeVisible();

    // Cleanup
    await page.click('#cleanup');
    await expect(page.locator('text=Cleanup complete!')).toBeVisible();

    // Verify empty
    await page.click('#list');
    const output = page.locator('#output');
    await expect(output).toContainText('[]');
  });
});
