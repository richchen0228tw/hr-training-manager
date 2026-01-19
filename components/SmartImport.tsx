
import React, { useState } from 'react';
import { parseTrainingDataWithGemini } from '../services/geminiService';
import { Course } from '../types';

interface SmartImportProps {
  onImport: (courses: Course[]) => void;
  onCancel: () => void;
}

export const SmartImport: React.FC<SmartImportProps> = ({ onImport, onCancel }) => {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleParse = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setError('');
    
    try {
      // Cast the partial courses to full courses (ids are added in service)
      const parsedCourses = await parseTrainingDataWithGemini(inputText);
      if (parsedCourses.length === 0) {
        setError('無法辨識課程資料，請嘗試提供更詳細的描述。');
      } else {
        // We know gemini service adds the ID and other defaults, so casting is safe enough for this demo
        onImport(parsedCourses as Course[]);
      }
    } catch (err) {
        console.error(err);
      setError('AI 解析失敗，請檢查 API Key 或稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
            <div className="flex items-center gap-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                <h2 className="text-xl font-bold">AI 智慧匯入</h2>
            </div>
          <p className="text-indigo-100 text-sm">
            貼上 Email、會議記錄或隨意筆記，AI 將自動幫您整理成結構化的課程資料表。
          </p>
        </div>

        <div className="p-6">
          <textarea
            className="w-full h-48 p-4 rounded-xl border border-slate-600 bg-yellow-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all text-sm"
            placeholder="例如：&#10;下個月要舉辦兩場訓練：&#10;1. React 進階實戰，11/20 早上九點到下午五點，講師是王大明，預計30人，費用2萬元。&#10;2. 職場溝通術，11/25 下午場，張經理主講，不用費用。"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />

          {error && (
            <div className="mt-3 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                {error}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onCancel}
              className="px-5 py-2 rounded-lg text-slate-500 hover:bg-slate-100 font-medium transition-colors"
              disabled={loading}
            >
              取消
            </button>
            <button
              onClick={handleParse}
              disabled={loading || !inputText.trim()}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  AI 分析中...
                </>
              ) : (
                <>
                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
                  開始匯入
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
