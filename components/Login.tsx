
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

  // Forgot Password States
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = login(username, password);
    if (user) {
      onLoginSuccess(user);
    } else {
      setError('帳號或密碼錯誤');
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setIsResetting(true);
    setForgotMessage('');

    setTimeout(() => {
      const allUsers = fetchUsers();
      const targetUser = allUsers.find(u => u.username === forgotUsername);

      if (targetUser) {
        // Mock Reset Password Logic
        const updatedUsers = allUsers.map(u => {
          if (u.id === targetUser.id) {
            return { ...u, password: '123', mustChangePassword: true };
          }
          return u;
        });
        saveUsers(updatedUsers);
        setForgotMessage(`✅ 已發送重置信件！\n為了方便測試，密碼已重置為「123」。\n請使用新密碼登入並修改。`);
      } else {
        setForgotMessage('❌ 找不到此帳號，請確認輸入是否正確。');
      }
      setIsResetting(false);
    }, 1000);
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
              required
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
              required
            />
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => { setShowForgot(true); setForgotMessage(''); setForgotUsername(''); }}
              className="text-xs text-primary-600 hover:text-primary-800 hover:underline"
            >
              忘記密碼？
            </button>
          </div>

          {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{error}</p>}

          <button
            type="submit"
            className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium shadow-md transition-all active:scale-95"
          >
            登入
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

            {!forgotMessage.includes('✅') ? (
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
                />
                <button
                  type="submit"
                  disabled={isResetting}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isResetting ? '處理中...' : '重置密碼'}
                </button>
              </form>
            ) : (
              <div className="bg-green-50 text-green-700 p-4 rounded-lg text-sm whitespace-pre-line text-center mb-4 border border-green-100">
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
            >
              {forgotMessage.includes('✅') ? '返回登入' : '取消'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
