import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  envDir: '../../', // Look for .env files in the project root
  build: {
    outDir: '../../dist',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/renderer')
    }
  },
  server: { port: 5173 }
});
