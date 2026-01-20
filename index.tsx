import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// --- 關鍵修改：擴充 TypeScript 對 Window 的定義 ---
// 這樣做之後，整個專案的任何檔案都可以直接使用 window.db 而不會報錯
declare global {
  interface Window {
    db: any; // 這裡對應到我们在 HTML 裡初始化的 Firebase Firestore 實例
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// 簡單檢查一下資料庫是否有連上 (會在 Console 印出結果)
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
