import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// --- 擴充 TypeScript 對 Window 的定義 ---
declare global {
  interface Window {
    db: any; // 對應 HTML 裡的 Firebase 實例
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// 檢查資料庫連線
if (window.db) {
  console.log("✅ index.tsx: React 已偵測到 Firebase 資料庫連線");
} else {
  console.warn("⚠️ index.tsx: 尚未偵測到 window.db，請確認 index.html 的 Firebase 設定正確");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);