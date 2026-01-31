import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: '',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyDirFirst: true,
    rollupOptions: {
      input: {
        panel: resolve(__dirname, 'src/panel/index.html'),
        devtools: resolve(__dirname, 'src/devtools/index.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
    sourcemap: process.env.NODE_ENV === 'development',
  },
  publicDir: 'public',
});
