import React, { useState, useEffect, useMemo } from 'react';
import { Course, ViewState, User } from './types';
// 保留 User 相關的服務，但移除 Course 相關的 fetch/save
import { getSettings, getCurrentUser, logout, getVisibleCourses, fetchUsers, saveUsers, fetchCourses, saveCourses } from './services/dataService';
import { Dashboard } from './components/Dashboard';
import { CourseForm } from './components/CourseForm';
import { BatchImport } from './components/BatchImport';
import { Login } from './components/Login';
import { UserManagement } from './components/UserManagement';
import { ChangePassword } from './components/ChangePassword';
// Import initialized Firestore instance
import { db, isFirebaseInitialized } from './services/firebase';

// Firebase Imports
import {
    collection,
    onSnapshot,
    doc,
    setDoc,
    deleteDoc,
    writeBatch,
    query,
    orderBy
} from 'firebase/firestore';

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [view, setView] = useState<ViewState>('dashboard');
    const [courses, setCourses] = useState<Course[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);

    // 雖然移除了 Google Sheet 設定，保留此變數以免 UI 報錯，但不再使用
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Selection State for Batch Delete
    const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());

    // Initial Load & Auth Check
    useEffect(() => {
        const user = getCurrentUser();
        if (user) {
            setCurrentUser(user);
        }
    }, []);

    // --- Firebase Real-time Listener (關鍵修改) ---
    // --- Firebase Real-time Listener (With Local Fallback) ---
    useEffect(() => {
        if (isFirebaseInitialized) {
            // 取得全域資料庫物件
            // 建立查詢：監聽 'courses' 集合，並依照開始日期排序
            const q = query(collection(db, "courses"), orderBy("startDate", "asc"));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const loadedCourses: Course[] = snapshot.docs.map(doc => {
                    return { id: doc.id, ...doc.data() } as Course;
                });
                setCourses(loadedCourses);
            }, (error) => {
                console.error("Firebase 讀取失敗:", error);
                // Fallback probably not needed here if successful init, but safe to ignore
            });
            return () => unsubscribe();
        } else {
            // Local Mode: Load from LocalStorage
            console.warn("Firebase not initialized. Running in Local Mode.");
            fetchCourses().then(data => {
                // Ensure data is sorted by startDate locally
                const sorted = [...data].sort((a, b) => a.startDate.localeCompare(b.startDate));
                setCourses(sorted);
            });
        }
    }, []);

    // Clear selection when view changes
    useEffect(() => {
        setSelectedCourseIds(new Set());
    }, [view]);

    // Filter courses based on logged-in user permissions
    const visibleCourses = useMemo(() => {
        if (!currentUser) return [];
        return getVisibleCourses(courses, currentUser);
    }, [courses, currentUser]);

    // Group Courses by Month for List View
    const groupedCourses = useMemo(() => {
        if (view !== 'list') return [];

        const groups: Record<string, Course[]> = {};

        visibleCourses.forEach(course => {
            const monthKey = course.startDate.substring(0, 7); // "YYYY-MM"
            if (!groups[monthKey]) {
                groups[monthKey] = [];
            }
            groups[monthKey].push(course);
        });

        // Sort months ascending
        const sortedMonths = Object.keys(groups).sort();

        return sortedMonths.map(month => ({
            month,
            // Sort courses within month by startDate ascending
            courses: groups[month].sort((a, b) => a.startDate.localeCompare(b.startDate))
        }));
    }, [visibleCourses, view]);

    const handleLoginSuccess = (user: User) => {
        setCurrentUser(user);
        setView('dashboard');
    };

    const handleLogout = () => {
        logout();
        setCurrentUser(null);
    };

    const handleForcePasswordChange = (newPassword: string) => {
        if (!currentUser) return;
        const allUsers = fetchUsers();
        const updatedUsers = allUsers.map(u => {
            if (u.id === currentUser.id) {
                return { ...u, password: newPassword, mustChangePassword: false };
            }
            return u;
        });
        saveUsers(updatedUsers);
        const updatedCurrentUser = { ...currentUser, password: newPassword, mustChangePassword: false };
        setCurrentUser(updatedCurrentUser);
        localStorage.setItem('hr_training_session', JSON.stringify(updatedCurrentUser));
        alert("密碼變更成功！");
    };

    // --- Firebase Operations (取代原本的 performSave) ---

    const handleDeleteCourse = async (courseId: string) => {
        if (!window.confirm("確定要刪除此課程嗎？")) return;

        try {
            if (isFirebaseInitialized) {
                await deleteDoc(doc(db, "courses", courseId));
            } else {
                // Local Mode
                const newCourses = courses.filter(c => c.id !== courseId);
                await saveCourses(newCourses);
                setCourses(newCourses);
            }
        } catch (error) {
            console.error("Delete error:", error);
            alert("刪除失敗: " + String(error));
        }
    };

    const handleSaveCourse = async (course: Course) => {
        try {
            if (isFirebaseInitialized) {
                await setDoc(doc(db, "courses", course.id), course);
            } else {
                // Local Mode
                const existingIndex = courses.findIndex(c => c.id === course.id);
                let newCourses = [...courses];
                if (existingIndex >= 0) {
                    newCourses[existingIndex] = course;
                } else {
                    newCourses.push(course);
                }
                // Sort by date
                newCourses.sort((a, b) => a.startDate.localeCompare(b.startDate));
                await saveCourses(newCourses);
                setCourses(newCourses);
            }
        } catch (error) {
            console.error("Save error:", error);
            alert("儲存失敗: " + String(error));
        }
    };

    // --- Batch Delete Logic (Firebase Version) ---

    const canDeleteCourse = (course: Course) => {
        if (!currentUser) return false;
        return !(currentUser.role === 'GeneralUser' && course.createdBy === 'HR');
    };

    const handleToggleSelect = (id: string) => {
        const newSet = new Set(selectedCourseIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedCourseIds(newSet);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const deletableIds = visibleCourses
                .filter(c => canDeleteCourse(c))
                .map(c => c.id);
            setSelectedCourseIds(new Set(deletableIds));
        } else {
            setSelectedCourseIds(new Set());
        }
    };

    const handleBatchDelete = async () => {
        if (selectedCourseIds.size === 0) return;

        if (window.confirm(`確定要刪除選取的 ${selectedCourseIds.size} 筆課程嗎？此動作無法復原。`)) {
            try {
                if (isFirebaseInitialized) {
                    const batch = writeBatch(db);
                    selectedCourseIds.forEach(id => {
                        const docRef = doc(db, "courses", id);
                        batch.delete(docRef);
                    });
                    await batch.commit();
                } else {
                    // Local Mode
                    const newCourses = courses.filter(c => !selectedCourseIds.has(c.id));
                    await saveCourses(newCourses);
                    setCourses(newCourses);
                }
                setSelectedCourseIds(new Set());
            } catch (error) {
                console.error("Batch delete failed:", error);
                alert("批次刪除失敗，請稍後再試。");
            }
        }
    };

    // Determine "Select All" checkbox state
    const deletableCoursesCount = visibleCourses.filter(c => canDeleteCourse(c)).length;
    const isAllSelected = deletableCoursesCount > 0 && selectedCourseIds.size === deletableCoursesCount;
    const isIndeterminate = selectedCourseIds.size > 0 && selectedCourseIds.size < deletableCoursesCount;


    const handleBatchImport = async (importedCourses: Course[]) => {
        try {
            if (isFirebaseInitialized) {
                const batch = writeBatch(db);
                importedCourses.forEach(course => {
                    const docRef = doc(db, "courses", course.id);
                    batch.set(docRef, course);
                });
                await batch.commit();
            } else {
                // Local Mode
                const newCourses = [...courses, ...importedCourses];
                newCourses.sort((a, b) => a.startDate.localeCompare(b.startDate));
                await saveCourses(newCourses);
                setCourses(newCourses);
            }
            return true;
        } catch (e) {
            console.error("Import failed:", e);
            throw e;
        }
    };

    // 1. If not logged in, show Login
    if (!currentUser) {
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    // 2. If logged in but password change required, show ChangePassword
    if (currentUser.mustChangePassword) {
        return <ChangePassword onPasswordChange={handleForcePasswordChange} onLogout={handleLogout} />;
    }

    // 3. Normal App Interface
    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans text-slate-900">

            {/* Sidebar Navigation */}
            <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col shrink-0">
                <div className="p-6 border-b border-slate-800 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-500"><path d="M22 10v6M2 10v6" /><path d="M20 2a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" /><path d="M12 4v16" /></svg>
                    <h1 className="text-lg font-bold tracking-tight">HR 培訓管理</h1>
                </div>

                <div className="px-6 py-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-xs font-bold">
                            {currentUser.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium truncate">{currentUser.name}</p>
                            <p className="text-xs text-slate-400 truncate">{currentUser.role}</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <button
                        onClick={() => setView('dashboard')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'dashboard' ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
                        儀表板
                    </button>

                    <button
                        onClick={() => setView('list')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'list' ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></svg>
                        課程列表
                    </button>

                    {/* User Management - Only for SystemAdmin */}
                    {currentUser.role === 'SystemAdmin' && (
                        <button
                            onClick={() => setView('users')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'users' ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                            使用者管理
                        </button>
                    )}
                </nav>

                <div className="p-4 border-t border-slate-800 space-y-2">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:text-red-300 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
                        登出
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 h-screen overflow-y-auto">
                <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">
                    <h2 className="text-xl font-bold text-slate-800">
                        {view === 'dashboard' ? '年度教育訓練總覽' : view === 'list' ? '教育訓練課程清單' : '使用者權限管理'}
                    </h2>
                    <div className="flex gap-3 items-center">

                        {/* Firebase Status Indicator */}
                        <div className={`flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full border ${isFirebaseInitialized
                            ? 'text-amber-600 bg-amber-50 border-amber-100'
                            : 'text-slate-600 bg-slate-100 border-slate-200'
                            }`}>
                            <div className={`w-2 h-2 rounded-full ${isFirebaseInitialized ? 'bg-amber-500 animate-pulse' : 'bg-slate-500'}`}></div>
                            {isFirebaseInitialized ? 'Firebase 即時同步中' : '本機模式 (資料僅存於瀏覽器)'}
                        </div>

                        {/* Show Add/Import for all users (Admin/HR/GeneralUser), provided they have permission to access the list view */}
                        {view !== 'users' && (
                            <>
                                {/* Batch Delete Button - Visible when items selected */}
                                {selectedCourseIds.size > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleBatchDelete}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md shadow-red-500/20 transition-all active:scale-95 font-medium text-sm animate-fade-in"
                                    >
                                        <svg className="pointer-events-none" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                                        刪除 ({selectedCourseIds.size})
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setIsBatchImportOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg shadow-md shadow-slate-500/20 transition-all active:scale-95 font-medium text-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M3 15h6" /><path d="M6 12v6" /></svg>
                                    整批匯入
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setEditingCourse(null); setIsFormOpen(true); }}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-md shadow-primary-500/20 transition-all active:scale-95 font-medium text-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                                    新增
                                </button>
                            </>
                        )}
                    </div>
                </header>

                <div className="p-8">
                    {view === 'users' && currentUser.role === 'SystemAdmin' && <UserManagement />}

                    {view === 'dashboard' && (
                        <Dashboard courses={visibleCourses} />
                    )}

                    {view === 'list' && (
                        <div className="space-y-8 animate-fade-in">
                            {visibleCourses.length === 0 ? (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-400">
                                    尚無可顯示的課程資料。
                                    {courses.length > 0 && <span className="block text-xs mt-1">（您沒有權限查看現有的課程）</span>}
                                </div>
                            ) : (
                                groupedCourses.map(group => (
                                    <div key={group.month} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-600"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
                                            <h3 className="font-bold text-slate-700">{group.month} 月份課程</h3>
                                            <span className="text-xs text-slate-400 font-normal">({group.courses.length} 堂)</span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-white text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                                                        <th className="p-4 w-10 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isAllSelected}
                                                                ref={input => { if (input) input.indeterminate = isIndeterminate; }}
                                                                onChange={handleSelectAll}
                                                                className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                                                title="全選 (僅限有權限刪除的項目)"
                                                            />
                                                        </th>
                                                        <th className="p-4 font-semibold min-w-[200px]">課程名稱</th>
                                                        <th className="p-4 font-semibold w-24">類型</th>
                                                        <th className="p-4 font-semibold">單位</th>
                                                        <th className="p-4 font-semibold min-w-[140px]">日期/時間</th>
                                                        <th className="p-4 font-semibold">講師</th>
                                                        <th className="p-4 font-semibold text-center">人數 (預/實)</th>
                                                        <th className="p-4 font-semibold text-right">費用</th>
                                                        <th className="p-4 font-semibold text-center">滿意度</th>
                                                        <th className="p-4 font-semibold text-center">狀態</th>
                                                        <th className="p-4 font-semibold text-right">操作</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 text-sm">
                                                    {group.courses.map(course => {
                                                        const canDelete = canDeleteCourse(course);

                                                        return (
                                                            <tr
                                                                key={course.id}
                                                                onClick={() => canDelete && handleToggleSelect(course.id)}
                                                                className={`transition-colors border-b border-slate-50 last:border-0 ${canDelete ? 'cursor-pointer' : ''
                                                                    } ${selectedCourseIds.has(course.id) ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'
                                                                    }`}
                                                            >
                                                                <td className="p-4 text-center">
                                                                    {canDelete && (
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={selectedCourseIds.has(course.id)}
                                                                            onChange={() => handleToggleSelect(course.id)}
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
                                                                        />
                                                                    )}
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className="font-semibold text-slate-800">{course.name}</div>
                                                                    <div className="text-xs text-slate-500 mt-1 truncate max-w-[200px]">{course.objective}</div>
                                                                    {course.trainingType === 'External' && course.trainees && (
                                                                        <div className="mt-2 flex flex-wrap gap-1">
                                                                            <span className="text-[10px] text-slate-400 mr-1">受訓人員:</span>
                                                                            {course.trainees.split(/[,|，、\n]/).filter(t => t.trim()).map((t, i) => (
                                                                                <span key={i} className="inline-block px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px]">
                                                                                    {t.trim()}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="p-4">
                                                                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${course.trainingType === 'External'
                                                                        ? 'bg-purple-50 text-purple-700 border border-purple-100'
                                                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                                        }`}>
                                                                        {course.trainingType === 'External' ? '外訓' : '內訓'}
                                                                    </span>
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className="text-slate-800 font-medium">{course.company || '-'}</div>
                                                                    <div className="text-xs text-slate-500 mt-1">{course.department}</div>
                                                                </td>
                                                                <td className="p-4 text-slate-600">
                                                                    <div>{course.startDate} {course.startDate !== course.endDate && `~ ${course.endDate.substring(5)}`}</div>
                                                                    <div className="text-xs text-slate-400 mt-1">{course.time} ({course.duration}h)</div>
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className="text-slate-700">{course.instructor}</div>
                                                                    <div className="text-xs text-slate-400">{course.instructorOrg}</div>
                                                                </td>
                                                                <td className="p-4 text-center">
                                                                    <span className="text-slate-400">{course.expectedAttendees}</span>
                                                                    <span className="mx-1 text-slate-300">/</span>
                                                                    <span className={`font-medium ${course.actualAttendees > 0 ? 'text-primary-600' : 'text-slate-400'}`}>{course.actualAttendees}</span>
                                                                </td>
                                                                <td className="p-4 text-right text-slate-700 font-mono">
                                                                    ${course.cost.toLocaleString()}
                                                                </td>
                                                                <td className="p-4 text-center">
                                                                    {course.satisfaction > 0 ? (
                                                                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 text-amber-600 font-bold">
                                                                            {course.satisfaction}
                                                                        </div>
                                                                    ) : <span className="text-slate-300">-</span>}
                                                                </td>
                                                                <td className="p-4 text-center vertical-top">
                                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${course.status === 'Completed' ? 'bg-green-50 text-green-600 border-green-100' :
                                                                        course.status === 'Cancelled' ? 'bg-red-50 text-red-600 border-red-100' :
                                                                            'bg-blue-50 text-blue-600 border-blue-100'
                                                                        }`}>
                                                                        {course.status === 'Completed' ? '已完成' : course.status === 'Cancelled' ? '已取消' : '規劃中'}
                                                                    </span>
                                                                    {course.status === 'Cancelled' && course.cancellationReason && (
                                                                        <div className="text-xs text-red-500 mt-2 max-w-[120px] mx-auto break-words bg-red-50 p-1 rounded border border-red-100" title={course.cancellationReason}>
                                                                            {course.cancellationReason}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="p-4 text-right">
                                                                    <div className="flex justify-end gap-2">
                                                                        {canDelete && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleDeleteCourse(course.id);
                                                                                }}
                                                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                                title="刪除"
                                                                            >
                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                                                                            </button>
                                                                        )}
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setEditingCourse(course);
                                                                                setIsFormOpen(true);
                                                                            }}
                                                                            className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                                            title="編輯"
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </main >

            <CourseForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleSaveCourse}
                initialData={editingCourse}
                currentUser={currentUser}
            />

            {isBatchImportOpen && (
                <BatchImport
                    onImport={handleBatchImport}
                    onCancel={() => { setIsBatchImportOpen(false); setView('list'); }}
                    currentUser={currentUser}
                />
            )}
        </div >
    );
};

export default App;