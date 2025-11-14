
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import os from 'node:os';

export default defineConfig({
  cacheDir: path.join(os.tmpdir(), 'vite-misan-cache'),
  plugins: [react()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      'figma:asset/62f6ba08acc1edb7f3b514d09860553db6f03b48.png': path.resolve(__dirname, './src/assets/62f6ba08acc1edb7f3b514d09860553db6f03b48.png'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    modulePreload: {
      polyfill: false,
    },
    chunkSizeWarningLimit: 900,
  },
  server: {
    port: 3000,
    open: true,
    watch: {
      ignored: ['**/legacy/**'],
    },
  },
});
