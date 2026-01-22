
import React, { useState, useEffect } from 'react';
import { User, UserRole, CompanyPermission, COMPANY_OPTIONS, DEPARTMENT_MAPPING } from '../types';
import { fetchUsers, saveUsers } from '../services/dataService';

export const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        const loadUsers = async () => {
            const data = await fetchUsers();
            setUsers(data);
        };
        loadUsers();
    }, []);

    const handleEdit = (user: User) => {
        // When editing, default 'mustChangePassword' to what it currently is
        setCurrentUser({ ...user });
        setIsEditing(true);
    };

    const handleCreate = () => {
        const newUser: User = {
            id: crypto.randomUUID(),
            username: '',
            password: '',
            name: '',
            role: 'GeneralUser',
            permissions: [],
            email: '', // Initialize email
            mustChangePassword: true // Default to true for new users
        };
        setCurrentUser(newUser);
        setIsEditing(true);
    };

    const handleSave = () => {
        if (!currentUser) return;

        // Basic validation
        if (!currentUser.username || !currentUser.password || !currentUser.name) {
            alert("請填寫所有必填欄位");
            return;
        }

        let updatedUsers = [...users];
        const existingIndex = users.findIndex(u => u.id === currentUser.id);

        if (existingIndex >= 0) {
            updatedUsers[existingIndex] = currentUser;
        } else {
            updatedUsers.push(currentUser);
        }

        setUsers(updatedUsers);
        saveUsers(updatedUsers);
        setIsEditing(false);
        setCurrentUser(null);
    };

    const handleDelete = (id: string) => {
        console.log("Delete user clicked:", id);
        if (id === 'admin') {
            alert("無法刪除預設管理員");
            return;
        }
        if (window.confirm("確定刪除此使用者？")) {
            console.log("User delete confirmed");
            const newUsers = users.filter(u => u.id !== id);
            setUsers(newUsers);
            saveUsers(newUsers);
            console.log("User delete saved");
        }
    };

    // --- Permission Handlers ---

    const addPermission = () => {
        if (!currentUser) return;
        const newPerm: CompanyPermission = {
            company: COMPANY_OPTIONS[0],
            viewAllDepartments: false,
            allowedDepartments: []
        };
        setCurrentUser({
            ...currentUser,
            permissions: [...currentUser.permissions, newPerm]
        });
    };

    const removePermission = (index: number) => {
        if (!currentUser) return;
        const newPerms = [...currentUser.permissions];
        newPerms.splice(index, 1);
        setCurrentUser({ ...currentUser, permissions: newPerms });
    };

    const updatePermission = (index: number, field: keyof CompanyPermission, value: any) => {
        if (!currentUser) return;
        const newPerms = [...currentUser.permissions];
        newPerms[index] = { ...newPerms[index], [field]: value };

        // Reset departments if viewAll is toggled to true
        if (field === 'viewAllDepartments' && value === true) {
            newPerms[index].allowedDepartments = [];
        }
        // Reset departments if company changes
        if (field === 'company') {
            newPerms[index].allowedDepartments = [];
        }

        setCurrentUser({ ...currentUser, permissions: newPerms });
    };

    const toggleDepartment = (permIndex: number, dept: string) => {
        if (!currentUser) return;
        const newPerms = [...currentUser.permissions];
        const currentDepts = newPerms[permIndex].allowedDepartments;

        if (currentDepts.includes(dept)) {
            newPerms[permIndex].allowedDepartments = currentDepts.filter(d => d !== dept);
        } else {
            newPerms[permIndex].allowedDepartments = [...currentDepts, dept];
        }
        setCurrentUser({ ...currentUser, permissions: newPerms });
    };

    if (isEditing && currentUser) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">{currentUser.id === 'admin' ? '編輯使用者 (admin)' : '使用者設定'}</h3>
                    <button type="button" onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">帳號</label>
                        <input
                            type="text"
                            value={currentUser.username}
                            onChange={e => setCurrentUser({ ...currentUser, username: e.target.value })}
                            disabled={currentUser.id === 'admin'}
                            className="w-full p-2 border border-slate-600 rounded-lg bg-yellow-50 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">密碼</label>
                        <input
                            type="text"
                            value={currentUser.password || ''}
                            onChange={e => setCurrentUser({ ...currentUser, password: e.target.value })}
                            className="w-full p-2 border border-slate-600 rounded-lg bg-yellow-50 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">姓名</label>
                        <input
                            type="text"
                            value={currentUser.name}
                            onChange={e => setCurrentUser({ ...currentUser, name: e.target.value })}
                            className="w-full p-2 border border-slate-600 rounded-lg bg-yellow-50 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={currentUser.email || ''}
                            onChange={e => setCurrentUser({ ...currentUser, email: e.target.value })}
                            className="w-full p-2 border border-slate-600 rounded-lg bg-yellow-50 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                            placeholder="user@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">系統角色</label>
                        <select
                            value={currentUser.role}
                            onChange={e => setCurrentUser({ ...currentUser, role: e.target.value as UserRole })}
                            disabled={currentUser.id === 'admin'}
                            className="w-full p-2 border border-slate-600 rounded-lg bg-yellow-50 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none"
                        >
                            <option value="GeneralUser">一般使用者 (GeneralUser)</option>
                            <option value="HR">人資 (HR)</option>
                            <option value="SystemAdmin">系統管理員 (SystemAdmin)</option>
                        </select>
                        <p className="text-xs text-slate-400 mt-1">
                            SystemAdmin: 可看到所有資料並管理使用者。<br />
                            HR / GeneralUser: 僅能看到下方設定的公司/單位資料。
                        </p>
                    </div>
                    <div className="md:col-span-2">
                        <label className="flex items-center gap-2 cursor-pointer p-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-white transition-colors">
                            <input
                                type="checkbox"
                                checked={currentUser.mustChangePassword || false}
                                onChange={e => setCurrentUser({ ...currentUser, mustChangePassword: e.target.checked })}
                                className="rounded text-primary-600 w-4 h-4"
                            />
                            <div>
                                <span className="text-sm font-bold text-slate-800">強制下次登入變更密碼</span>
                                <p className="text-xs text-slate-500">若勾選，使用者下次登入時會被要求設定新密碼。</p>
                            </div>
                        </label>
                    </div>
                </div>

                {currentUser.role !== 'SystemAdmin' && (
                    <div className="border-t border-slate-100 pt-6">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-slate-700">資料存取權限 (Data Access)</h4>
                            <button type="button" onClick={addPermission} className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="8" x2="16" y1="12" y2="12" /></svg>
                                新增公司權限
                            </button>
                        </div>

                        <div className="space-y-4">
                            {currentUser.permissions.length === 0 && <p className="text-slate-400 text-sm italic">尚未設定權限，此使用者將無法查看任何資料。</p>}

                            {currentUser.permissions.map((perm, idx) => (
                                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-4 relative">
                                    <button type="button" onClick={() => removePermission(idx)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" /></svg>
                                    </button>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">公司</label>
                                            <select
                                                value={perm.company}
                                                onChange={(e) => updatePermission(idx, 'company', e.target.value)}
                                                className="w-full p-2 rounded border border-slate-600 bg-yellow-50 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                            >
                                                {COMPANY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>

                                        <div className="flex items-center mt-6">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={perm.viewAllDepartments}
                                                    onChange={(e) => updatePermission(idx, 'viewAllDepartments', e.target.checked)}
                                                    className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4"
                                                />
                                                <span className="text-sm font-medium text-slate-700">設為該公司管理員 (可看全部門)</span>
                                            </label>
                                        </div>
                                    </div>

                                    {!perm.viewAllDepartments && (
                                        <div className="mt-4 border-t border-slate-200 pt-3">
                                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">可檢視部門 (複選)</p>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                {(DEPARTMENT_MAPPING[perm.company] || []).map(dept => (
                                                    <label key={dept} className="flex items-start gap-2 cursor-pointer p-1 hover:bg-slate-100 rounded">
                                                        <input
                                                            type="checkbox"
                                                            checked={perm.allowedDepartments.includes(dept)}
                                                            onChange={() => toggleDepartment(idx, dept)}
                                                            className="mt-1 rounded text-primary-600 h-3.5 w-3.5"
                                                        />
                                                        <span className="text-xs text-slate-600 leading-tight">{dept}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 mt-8">
                    <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">取消</button>
                    <button type="button" onClick={handleSave} className="px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 shadow-md transition-colors">儲存設定</button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800">使用者列表</h3>
                    <button type="button" onClick={handleCreate} className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19" /><line x1="5" x2="19" y1="12" y2="12" /></svg>
                        新增使用者
                    </button>
                </div>

                <table className="w-full text-left">
                    <thead className="bg-white text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                        <tr>
                            <th className="p-4">帳號/姓名</th>
                            <th className="p-4">角色</th>
                            <th className="p-4">權限範圍</th>
                            <th className="p-4 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-slate-50">
                                <td className="p-4">
                                    <div className="font-bold text-slate-800">{user.username}</div>
                                    <div className="text-slate-500">{user.name}</div>
                                    <div className="text-slate-400 text-xs">{user.email || ''}</div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${user.role === 'SystemAdmin' ? 'bg-purple-50 text-purple-700' :
                                        user.role === 'HR' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-4">
                                    {user.role === 'SystemAdmin' ? (
                                        <span className="text-slate-400 italic">全部權限</span>
                                    ) : (
                                        <div className="space-y-1">
                                            {user.permissions.length === 0 ? <span className="text-red-400">無權限</span> :
                                                user.permissions.map((p, i) => (
                                                    <div key={i} className="flex items-center gap-2">
                                                        <span className="font-medium text-slate-700">{p.company}:</span>
                                                        {p.viewAllDepartments ? (
                                                            <span className="text-green-600 text-xs border border-green-200 bg-green-50 px-1 rounded">全公司</span>
                                                        ) : (
                                                            <span className="text-slate-500 text-xs truncate max-w-[200px]" title={p.allowedDepartments.join(', ')}>
                                                                {p.allowedDepartments.length} 個單位
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </td>
                                <td className="p-4 text-right">
                                    <button type="button" onClick={() => handleEdit(user)} className="text-primary-600 hover:text-primary-800 mr-3">編輯</button>
                                    {user.id !== 'admin' && (
                                        <button type="button" onClick={() => handleDelete(user.id)} className="text-red-400 hover:text-red-600">刪除</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
