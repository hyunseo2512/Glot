import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import monacoEditorPlugin from 'vite-plugin-monaco-editor';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    monacoEditorPlugin({
      languageWorkers: ['editorWorkerService', 'typescript', 'json', 'html', 'css'],
    }),
  ],
  base: './',
  root: './src/renderer',
  publicDir: '../../public',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'monaco-editor': ['monaco-editor'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['monaco-editor'],
  },
  server: {
    port: 3001,
    strictPort: true, // 포트가 사용 중이면 에러, 다른 포트 사용 안함
    fs: {
      // monaco-editor의 node_modules 접근 허용 (root가 src/renderer이므로 ../..로 프로젝트 루트 접근)
      allow: ['../..'],
    },
  },
});
