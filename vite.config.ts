import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || process.env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    // --- 新增：Build 設定，忽略 CDN 引入的套件 ---
    build: {
      rollupOptions: {
        external: [
          'react',
          'react-dom',
          'react-dom/client', // 這是 index.tsx 會用到的
          'firebase/app',
          'firebase/firestore',
          'recharts',
          '@google/genai'
        ],
        output: {
          globals: {
            'react': 'React',
            'react-dom': 'ReactDOM',
            'firebase/app': 'firebase',
            'firebase/firestore': 'firebaseFirestore'
          }
        }
      }
    }
  };
})
