
import React, { useState } from 'react';

interface ChangePasswordProps {
  onPasswordChange: (newPassword: string) => void;
  onLogout: () => void;
}

export const ChangePassword: React.FC<ChangePasswordProps> = ({ onPasswordChange, onLogout }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 4) {
      setError('密碼長度至少需 4 碼');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('兩次輸入的密碼不相符');
      return;
    }
    onPasswordChange(newPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
        <div className="text-center mb-8">
           <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 text-amber-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
           </div>
           <h2 className="text-2xl font-bold text-slate-800">請變更密碼</h2>
           <p className="text-slate-500 text-sm mt-2">為了您的帳戶安全，首次登入請設定新密碼。</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">新密碼</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-yellow-50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              placeholder="請輸入新密碼"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">確認新密碼</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-600 bg-yellow-50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              placeholder="請再次輸入新密碼"
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{error}</p>}

          <button
            type="submit"
            className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium shadow-md transition-all active:scale-95"
          >
            變更密碼並登入
          </button>
        </form>
        
        <button
            onClick={onLogout}
            className="w-full mt-4 py-2 text-slate-400 hover:text-slate-600 text-sm transition-colors"
        >
            取消並登出
        </button>
      </div>
    </div>
  );
};
