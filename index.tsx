import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 注意：這裡絕對不能有 import './index.css'; 

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
  // 這裡改用 console.log 避免紅字嚇人，因為有時候 React 載入比較快是正常的
  console.log("ℹ️ index.tsx: 等待 Firebase 連線中...");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);