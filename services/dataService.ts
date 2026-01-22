import { Course, User, AppSettings } from "../types";
import {
  collection,
  getDocs,
  doc,
  setDoc,
} from 'firebase/firestore';

import { db } from './firebase';

// --- Firebase Helper ---
// 安全地取得 window.db
const getDB = () => {
  return db || (typeof window !== 'undefined' && (window as any).db) || null;
};

// --- User Management (Firebase Version) ---

// 1. 讀取使用者 (改為從雲端讀取)
export const fetchUsers = async (): Promise<User[]> => {
  const db = getDB();
  if (!db) {
    console.warn("Firebase 尚未連線，使用預設管理員帳號");
    // 回傳預設管理員，避免系統卡死
    return [{
      id: 'admin',
      username: 'admin',
      password: '123',
      name: '系統管理員',
      role: 'SystemAdmin',
      email: 'admin@example.com',
      permissions: [],
      mustChangePassword: false
    }];
  }

  try {
    const snapshot = await getDocs(collection(db, "users"));
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => doc.data() as User);
  } catch (e) {
    console.error("讀取使用者失敗:", e);
    return [];
  }
};

// 2. 儲存使用者 (寫入雲端)
export const saveUsers = async (users: User[]) => {
  const db = getDB();
  if (!db) return;

  try {
    // 將所有使用者寫入 Firebase
    for (const user of users) {
      await setDoc(doc(db, "users", user.id), user);
    }
    console.log(`成功同步 ${users.length} 筆使用者資料至 Firebase`);
  } catch (e) {
    console.error("儲存使用者失敗:", e);
  }
};

// 3. 登入邏輯 (改為 Async，等待雲端資料)
export const login = async (username: string, password: string): Promise<User | null> => {
  // 從雲端抓最新的使用者列表
  const users = await fetchUsers();
  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    // 登入成功，將 Session 存在本地 (維持登入狀態)
    localStorage.setItem('hr_training_session', JSON.stringify(user));
    return user;
  }
  return null;
};

// --- 其他輔助函式 (維持不變) ---

export const logout = () => {
  localStorage.removeItem('hr_training_session');
};

export const getCurrentUser = (): User | null => {
  const session = localStorage.getItem('hr_training_session');
  return session ? JSON.parse(session) : null;
};

// --- Settings (維持 LocalStorage 即可) ---
export const getSettings = (): AppSettings => {
  const saved = localStorage.getItem('hr_training_settings');
  return saved ? JSON.parse(saved) : { googleScriptUrl: '' };
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem('hr_training_settings', JSON.stringify(settings));
};

// --- 權限邏輯 (維持不變) ---
export const getVisibleCourses = (allCourses: Course[], user: User): Course[] => {
  if (user.role === 'SystemAdmin') return allCourses;
  return allCourses.filter(course => {
    const permission = user.permissions.find(p => p.company === course.company);
    if (!permission) return false;
    if (permission.viewAllDepartments) return true;
    if (permission.allowedDepartments.includes(course.department)) return true;
    return false;
  });
};

// --- 舊的函式 (為了相容性保留，但不再使用) ---
export const validateConnection = async (url: string) => ({ success: true, message: "Firebase Mode" });
export const fetchCourses = async (): Promise<Course[]> => [];
export const saveCourses = async (courses: Course[]): Promise<void> => { };