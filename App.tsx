import React, { useState, useEffect, useMemo } from 'react';
import { Course, ViewState, User } from './types';
// 保留 User 相關的服務，但移除 Course 相關的 fetch/save
import { getCurrentUser, logout, getVisibleCourses, fetchUsers, saveUsers } from './services/dataService';
import { Dashboard } from './components/Dashboard';
import { CourseForm } from './components/CourseForm';
import { BatchImport } from './components/BatchImport';
import { Login } from './components/Login';
import { UserManagement } from './components/UserManagement';
import { ChangePassword } from './components/ChangePassword';

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

import { db, isFirebaseInitialized } from './services/firebase';

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [view, setView] = useState<ViewState>('dashboard');
    const [courses, setCourses] = useState<Course[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [isBatchImportOpen, setIsBatchImportOpen] = useState(false);

    // Selection State for Batch Delete
    const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());

    // Collapsed Months State
    const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set());

    // Export Filter State
    const getCurrentYear = () => new Date().getFullYear();
    const [exportYear, setExportYear] = useState<number | 'All'>('All');
    const [exportStartDate, setExportStartDate] = useState<string>('');
    const [exportEndDate, setExportEndDate] = useState<string>('');
    const [exportType, setExportType] = useState<string>('All');

    // Initial Load & Auth Check
    useEffect(() => {
        const user = getCurrentUser();
        if (user) {
            setCurrentUser(user);
        }
    }, []);

    // --- Firebase Real-time Listener (關鍵修改) ---
    useEffect(() => {
        // 取得全域資料庫物件
        if (!db) {
            console.error("App.tsx: Firebase db not initialized");
            return;
        }
        console.log("App.tsx: 開始監聽 Firebase 資料...");

        // 建立查詢：監聽 'courses' 集合，並依照開始日期排序
        const q = query(collection(db, "courses"), orderBy("startDate", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            console.log("App.tsx: 收到資料更新，筆數:", snapshot.docs.length);
            const loadedCourses: Course[] = snapshot.docs.map(doc => {
                // 將 Firestore 資料轉回 Course 型別
                return { id: doc.id, ...doc.data() } as Course;
            });
            setCourses(loadedCourses);
        }, (error) => {
            console.error("Firebase 讀取失敗:", error);
            alert("讀取資料失敗，請檢查網路連線或 Firebase 權限設定。");
        });

        // Component Unmount 時取消監聽
        return () => unsubscribe();
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

    // Filter courses for export and display
    const filteredCoursesForList = useMemo(() => {
        if (view !== 'list') return visibleCourses;

        return visibleCourses.filter(course => {
            // Year filter
            if (exportYear !== 'All') {
                const courseYear = parseInt(course.startDate.substring(0, 4));
                if (courseYear !== exportYear) return false;
            }

            // Date range filter
            if (exportStartDate && course.startDate < exportStartDate) return false;
            if (exportEndDate && course.startDate > exportEndDate) return false;

            // Training type filter
            if (exportType !== 'All') {
                if (exportType === 'Internal' && course.trainingType !== 'Internal') return false;
                if (exportType === 'External' && course.trainingType !== 'External') return false;
            }

            return true;
        });
    }, [visibleCourses, view, exportYear, exportStartDate, exportEndDate, exportType]);

    // Group Courses by Month for List View
    const groupedCourses = useMemo(() => {
        if (view !== 'list') return [];

        const groups: Record<string, Course[]> = {};

        filteredCoursesForList.forEach(course => {
            const monthKey = course.startDate.substring(0, 7); // "YYYY-MM"
            if (!groups[monthKey]) {
                groups[monthKey] = [];
            }
            groups[monthKey].push(course);
        });

        // Sort months descending (New -> Old)
        const sortedMonths = Object.keys(groups).sort((a, b) => b.localeCompare(a));

        return sortedMonths.map(month => ({
            month,
            // Sort courses within month by startDate ascending
            courses: groups[month].sort((a, b) => a.startDate.localeCompare(b.startDate))
        }));
    }, [filteredCoursesForList, view]);

    const handleLoginSuccess = (user: User) => {
        setCurrentUser(user);
        setView('dashboard');
    };

    const handleLogout = () => {
        logout();
        setCurrentUser(null);
    };

    const handleForcePasswordChange = async (newPassword: string) => {
        if (!currentUser) return;
        const allUsers = await fetchUsers();
        const updatedUsers = allUsers.map(u => {
            if (u.id === currentUser.id) {
                return { ...u, password: newPassword, mustChangePassword: false };
            }
            return u;
        });
        await saveUsers(updatedUsers);
        const updatedCurrentUser = { ...currentUser, password: newPassword, mustChangePassword: false };
        setCurrentUser(updatedCurrentUser);
        localStorage.setItem('hr_training_session', JSON.stringify(updatedCurrentUser));
        alert("密碼變更成功！");
    };

    // --- Firebase Operations ---

    const handleDeleteCourse = async (courseId: string) => {
        if (!window.confirm("確定要刪除此課程嗎？")) return;
        if (!db) {
            alert("資料庫未連線");
            return;
        }

        try {
            await deleteDoc(doc(db, "courses", courseId));
        } catch (error) {
            console.error("Delete error:", error);
            alert("刪除失敗: " + String(error));
        }
    };

    const handleSaveCourse = async (course: Course) => {
        if (!db) {
            alert("資料庫未連線");
            return;
        }
        try {
            await setDoc(doc(db, "courses", course.id), course);
        } catch (error) {
            console.error("Save error:", error);
            alert("儲存失敗: " + String(error));
        }
    };

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
            if (!db) {
                alert("資料庫未連線");
                return;
            }
            try {
                const batch = writeBatch(db);

                selectedCourseIds.forEach(id => {
                    const docRef = doc(db, "courses", id);
                    batch.delete(docRef);
                });

                await batch.commit();
                setSelectedCourseIds(new Set());
            } catch (error) {
                console.error("Batch delete failed:", error);
                alert("批次刪除失敗，請稍後再試。");
            }
        }
    };

    const deletableCoursesCount = visibleCourses.filter(c => canDeleteCourse(c)).length;
    const isAllSelected = deletableCoursesCount > 0 && selectedCourseIds.size === deletableCoursesCount;
    const isIndeterminate = selectedCourseIds.size > 0 && selectedCourseIds.size < deletableCoursesCount;

    const toggleMonth = (month: string) => {
        const newSet = new Set(collapsedMonths);
        if (newSet.has(month)) {
            newSet.delete(month);
        } else {
            newSet.add(month);
        }
        setCollapsedMonths(newSet);
    };

    // Handle Year Change for Export Filter
    const handleExportYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === 'All') {
            setExportYear('All');
            return;
        }

        const newYear = parseInt(value);
        setExportYear(newYear);

        // Update date range years while preserving month/day
        const updateYear = (dateStr: string) => {
            if (!dateStr) return '';
            const [y, m, d] = dateStr.split('-').map(Number);
            const date = new Date(newYear, m - 1, d);
            const yStr = date.getFullYear();
            const mStr = String(date.getMonth() + 1).padStart(2, '0');
            const dStr = String(date.getDate()).padStart(2, '0');
            return `${yStr}-${mStr}-${dStr}`;
        };

        if (exportStartDate) setExportStartDate(updateYear(exportStartDate));
        if (exportEndDate) setExportEndDate(updateYear(exportEndDate));
    };

    // Export to CSV
    const handleExport = () => {
        if (filteredCoursesForList.length === 0) {
            alert('沒有可匯出的資料');
            return;
        }

        // CSV Header (matching BatchImport format)
        const header = '課程名稱,公司別,部門/單位,課程目的,開始日期,結束日期,時間,時數,預計人數,講師,講師單位,費用,訓練類型(內訓/外訓),受訓名單';

        // Convert courses to CSV rows
        const rows = filteredCoursesForList.map(course => {
            const trainingType = course.trainingType === 'External' ? '外訓' : '內訓';
            const trainees = course.trainees || '';
            
            return [
                course.name || '',
                course.company || '',
                course.department || '',
                course.objective || '',
                course.startDate || '',
                course.endDate || '',
                course.time || '',
                course.duration?.toString() || '0',
                course.expectedAttendees?.toString() || '0',
                course.instructor || '',
                course.instructorOrg || '',
                course.cost?.toString() || '0',
                trainingType,
                trainees.replace(/,/g, '|') // Convert comma to pipe for CSV compatibility
            ].map(field => {
                // Escape fields containing comma, quote, or newline
                if (field.includes(',') || field.includes('"') || field.includes('\n')) {
                    return `"${field.replace(/"/g, '""')}"`;
                }
                return field;
            }).join(',');
        });

        const csvContent = [header, ...rows].join('\n');
        
        // Create BOM for Excel UTF-8 support
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        // Generate filename with date range
        const dateStr = exportStartDate && exportEndDate 
            ? `${exportStartDate}_${exportEndDate}`
            : exportStartDate 
            ? `${exportStartDate}_`
            : exportEndDate
            ? `_${exportEndDate}`
            : exportYear !== 'All'
            ? `${exportYear}年`
            : '全部年度';
        
        const typeStr = exportType !== 'All' ? (exportType === 'Internal' ? '_內訓' : '_外訓') : '';
        link.download = `教育訓練資料_${dateStr}${typeStr}.csv`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };


    const handleBatchImport = async (importedCourses: Course[]) => {
        if (!db) {
            alert("系統目前處於「離線模式」，無法連線至資料庫。\n\n請確認：\n1. .env.local 設定檔正確\n2. 伺服器已重新啟動 (請關閉所有終端機後重開)");
            return;
        }

        try {
            const batch = writeBatch(db);

            importedCourses.forEach(course => {
                const docRef = doc(db, "courses", course.id);
                batch.set(docRef, course);
            });

            await batch.commit();
            setIsBatchImportOpen(false);
            setView('list');
            alert(`成功匯入 ${importedCourses.length} 筆資料`);
        } catch (e) {
            console.error("Import failed:", e);
            alert("匯入失敗: " + String(e));
        }
    };

    if (!currentUser) {
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    if (currentUser.mustChangePassword) {
        return <ChangePassword onPasswordChange={handleForcePasswordChange} onLogout={handleLogout} />;
    }

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans text-slate-900">
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

            <main className="flex-1 h-screen overflow-y-auto">
                <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">
                    <h2 className="text-xl font-bold text-slate-800">
                        {view === 'dashboard' ? '年度教育訓練總覽' : view === 'list' ? '教育訓練課程清單' : '使用者權限管理'}
                    </h2>
                    <div className="flex gap-3 items-center">
                        {isFirebaseInitialized ? (
                            <div className="flex items-center gap-2 text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                                Firebase 即時同步中
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200" title="請檢查 .env 設定並重啟伺服器">
                                <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                                離線預覽模式 (資料將不會儲存)
                            </div>
                        )}

                        {view !== 'users' && (
                            <>
                                {selectedCourseIds.size > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleBatchDelete}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md shadow-red-500/20 transition-all active:scale-95 font-medium text-sm animate-fade-in"
                                    >
                                        刪除 ({selectedCourseIds.size})
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setIsBatchImportOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg shadow-md shadow-slate-500/20 transition-all active:scale-95 font-medium text-sm"
                                >
                                    整批匯入
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setEditingCourse(null); setIsFormOpen(true); }}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg shadow-md shadow-primary-500/20 transition-all active:scale-95 font-medium text-sm"
                                >
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
                            {/* Export Filter Section */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                <div className="flex flex-wrap gap-4 items-end mb-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">年度</label>
                                        <select
                                            value={exportYear}
                                            onChange={handleExportYearChange}
                                            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
                                        >
                                            <option value="All">全部年度</option>
                                            {Array.from({ length: 5 }, (_, i) => getCurrentYear() - 2 + i).map(year => (
                                                <option key={year} value={year}>{year}年</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">課程日期起</label>
                                        <input
                                            type="date"
                                            value={exportStartDate}
                                            onChange={(e) => setExportStartDate(e.target.value)}
                                            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
                                        />
                                    </div>

                                    <div className="flex items-center self-center pt-5 text-slate-400">~</div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">課程日期迄</label>
                                        <input
                                            type="date"
                                            value={exportEndDate}
                                            onChange={(e) => setExportEndDate(e.target.value)}
                                            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-500 mb-1">課程類型</label>
                                        <select
                                            value={exportType}
                                            onChange={(e) => setExportType(e.target.value)}
                                            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
                                        >
                                            <option value="All">全部類型</option>
                                            <option value="Internal">內訓</option>
                                            <option value="External">外訓</option>
                                        </select>
                                    </div>

                                    <div className="ml-auto flex items-center gap-3">
                                        <span className="text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded border border-slate-100">
                                            篩選後：{filteredCoursesForList.length} 筆資料
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleExport}
                                            disabled={filteredCoursesForList.length === 0}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-md transition-all font-medium text-sm ${
                                                filteredCoursesForList.length > 0
                                                    ? 'bg-green-600 hover:bg-green-700 text-white'
                                                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                            }`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="7 10 12 15 17 10" />
                                                <line x1="12" x2="12" y1="15" y2="3" />
                                            </svg>
                                            匯出資料
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {filteredCoursesForList.length === 0 ? (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-400">
                                    {visibleCourses.length === 0 ? (
                                        <>
                                            尚無可顯示的課程資料。
                                            {courses.length > 0 && <span className="block text-xs mt-1">（您沒有權限查看現有的課程）</span>}
                                        </>
                                    ) : (
                                        '沒有符合篩選條件的課程資料。'
                                    )}
                                </div>
                            ) : (
                                groupedCourses.map(group => (
                                    <div key={group.month} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                        <div
                                            className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                                            onClick={() => toggleMonth(group.month)}
                                        >
                                            <div className="flex items-center gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-600"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
                                                <h3 className="font-bold text-slate-700">{group.month} 月份課程</h3>
                                                <span className="text-xs text-slate-400 font-normal">({group.courses.length} 堂)</span>
                                            </div>
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="20"
                                                height="20"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className={`text-slate-400 transition-transform duration-200 ${collapsedMonths.has(group.month) ? '-rotate-90' : 'rotate-0'}`}
                                            >
                                                <polyline points="6 9 12 15 18 9" />
                                            </svg>
                                        </div>
                                        {/* Collapsible Content */}
                                        <div className={`overflow-x-auto transition-all duration-300 ${collapsedMonths.has(group.month) ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'}`}>
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
                    onCancel={() => setIsBatchImportOpen(false)}
                    currentUser={currentUser}
                />
            )}
        </div >
    );
};

export default App;