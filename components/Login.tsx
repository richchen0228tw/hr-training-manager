import React, { useState } from 'react';
import { login, fetchUsers, saveUsers } from '../services/dataService';
import { User } from '../types';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // 新增 Loading 狀態

  // Forgot Password States
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // --- 修改 1: 登入邏輯改成 Async/Await ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 等待雲端驗證
      const user = await login(username, password);

      if (user) {
        onLoginSuccess(user);
      } else {
        setError('帳號或密碼錯誤');
      }
    } catch (err) {
      console.error("Login error:", err);
      setError('登入時發生錯誤，請檢查網路連線');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Helper: Generate Random Password ---
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  // --- Helper: Mask Email ---
  const maskEmail = (email: string) => {
    const parts = email.split('@');
    if (parts.length < 2) return email;
    const name = parts[0];
    const visible = name.length > 2 ? name.substring(0, 2) : name.substring(0, 1);
    return `${visible}***@${parts[1]}`;
  };

  // --- 修改 2: 忘記密碼邏輯改成 EmailJS ---
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);
    setForgotMessage('');

    // Check for EmailJS keys
    const serviceID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    try {
      // 從雲端抓取最新使用者列表
      const allUsers = await fetchUsers();
      const targetUser = allUsers.find(u => u.username === forgotUsername);

      if (targetUser) {
        if (!targetUser.email) {
          setForgotMessage('❌ 此帳號尚未設定 Email，無法重置密碼，請聯繫管理員。');
          setIsResetting(false);
          return;
        }

        const tempPassword = generateTempPassword();

        // 更新使用者資料 (先寫入資料庫，確保密碼已變更)
        const updatedUsers = allUsers.map(u => {
          if (u.id === targetUser.id) {
            return { ...u, password: tempPassword, mustChangePassword: true };
          }
          return u;
        });
        await saveUsers(updatedUsers);

        // 發送郵件
        if (serviceID && templateID && publicKey) {
          // Import dynamically to avoid issues if not installed yet (though we just installed it)
          const emailjs = await import('@emailjs/browser');

          await emailjs.send(
            serviceID,
            templateID,
            {
              to_name: targetUser.name,
              to_email: targetUser.email,
              temp_password: tempPassword,
            },
            publicKey
          );
          setForgotMessage(`✅ 已發送重置信件至 ${maskEmail(targetUser.email)}！\n請收取信件以取得臨時密碼。\n(登入後請立即修改密碼)`);
        } else {
          // Fallback for development/simulation
          console.warn("EmailJS keys missing in .env.local. Falling back to console log simulation.");
          console.log(`[Email Simulation] To: ${targetUser.email}, Password: ${tempPassword}`);
          setForgotMessage(`⚠️ 系統尚未設定郵件服務 (EmailJS)。\n臨時密碼已顯示於 Console (F12) 用於測試：\n${tempPassword}`);
        }

      } else {
        setForgotMessage('❌ 找不到此帳號，請確認輸入是否正確。');
      }
    } catch (err) {
      console.error("Reset password error:", err);
      setForgotMessage('❌ 重置失敗，請稍後再試。');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 text-primary-600 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">登入系統</h2>
          <p className="text-slate-500 text-sm mt-2">HR 教育訓練管理平台</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">帳號</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-yellow-50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              placeholder="請輸入帳號"
              autoComplete="username"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-yellow-50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              placeholder="請輸入密碼"
              autoComplete="current-password"
              required
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => { setShowForgot(true); setForgotMessage(''); setForgotUsername(''); }}
              className="text-xs text-primary-600 hover:text-primary-800 hover:underline"
              disabled={isLoading}
            >
              忘記密碼？
            </button>
          </div>

          {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 disabled:cursor-not-allowed text-white rounded-lg font-medium shadow-md transition-all active:scale-95 flex justify-center items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                登入中...
              </>
            ) : '登入'}
          </button>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-fade-in">
            <div className="flex justify-center mb-4 text-amber-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" /></svg>
            </div>
            <h3 className="text-lg font-bold text-center text-slate-800 mb-2">忘記密碼</h3>

            {/* Show Form only if no success (✅) AND no warning (⚠️) */}
            {!forgotMessage.includes('✅') && !forgotMessage.includes('⚠️') ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-sm text-slate-600 text-center mb-4">
                  請輸入您的帳號，系統將寄送重置密碼信件給您。
                </p>
                <input
                  type="text"
                  value={forgotUsername}
                  onChange={(e) => setForgotUsername(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 outline-none"
                  placeholder="請輸入帳號"
                  required
                  disabled={isResetting}
                />
                <button
                  type="submit"
                  disabled={isResetting}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isResetting ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      處理中...
                    </>
                  ) : '重置密碼'}
                </button>
              </form>
            ) : (
              <div className={`p-4 rounded-lg text-sm whitespace-pre-line text-center mb-4 border ${forgotMessage.includes('⚠️') ? 'bg-yellow-50 text-yellow-800 border-yellow-200' : 'bg-green-50 text-green-700 border-green-100'}`}>
                {forgotMessage}
              </div>
            )}

            {forgotMessage.includes('❌') && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center mb-4">
                {forgotMessage}
              </div>
            )}

            <button
              onClick={() => setShowForgot(false)}
              className="w-full py-2 mt-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
              disabled={isResetting}
            >
              {(forgotMessage.includes('✅') || forgotMessage.includes('⚠️')) ? '返回登入' : '取消'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};