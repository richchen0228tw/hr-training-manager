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

// 檢查資料庫連線 (移到 render 之後檢查，避免執行順序問題)
// 我們主要依賴 App.tsx 裡的 useEffect 來讀取 db，這裡只是輔助檢查

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);