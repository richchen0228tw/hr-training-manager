
import { Course, User, AppSettings } from "../types";

// Keys for LocalStorage
const STORAGE_KEY = 'hr_training_data';
const SETTINGS_KEY = 'hr_training_settings';
const USERS_KEY = 'hr_training_users';
const SESSION_KEY = 'hr_training_session';

// --- Mock Data ---

const MOCK_DATA: Course[] = [
  {
    id: '1',
    name: 'React 基礎與實戰',
    company: '神資',
    department: '600-數位科技事業群',
    objective: '提升前端開發能力',
    startDate: '2023-11-05',
    endDate: '2023-11-05',
    time: '09:00-17:00',
    duration: 7,
    expectedAttendees: 30,
    actualAttendees: 28,
    instructor: '張志明',
    instructorOrg: '前端技術學院',
    cost: 15000,
    satisfaction: 4.6,
    status: 'Completed',
    createdBy: 'HR',
    trainingType: 'Internal'
  },
  {
    id: '2',
    name: '溝通與領導力工作坊',
    company: '新達',
    department: 'Z10-統合通訊處',
    objective: '強化中階主管管理職能',
    startDate: '2023-11-15',
    endDate: '2023-11-16',
    time: '13:00-17:00',
    duration: 8,
    expectedAttendees: 15,
    actualAttendees: 0,
    instructor: '李春嬌',
    instructorOrg: '企管顧問公司',
    cost: 25000,
    satisfaction: 0,
    status: 'Planned',
    createdBy: 'HR',
    trainingType: 'External',
    trainees: '陳經理, 林副理, 王襄理'
  },
  {
    id: '3',
    name: 'AI 工具應用分享',
    company: '神耀',
    department: 'QA0-智能科技中心',
    objective: '學習使用 Generative AI 提升工作效率',
    startDate: '2023-12-01',
    endDate: '2023-12-01',
    time: '12:00-13:30',
    duration: 1.5,
    expectedAttendees: 50,
    actualAttendees: 0,
    instructor: '王小明',
    instructorOrg: '內部講師',
    cost: 0,
    satisfaction: 0,
    status: 'Planned',
    createdBy: 'User',
    trainingType: 'Internal'
  }
];

const INITIAL_USERS: User[] = [
  {
    id: 'admin',
    username: 'admin',
    password: '123',
    name: '系統管理員',
    role: 'SystemAdmin',
    permissions: [], // Admin sees all regardless
    mustChangePassword: false
  },
  {
    id: 'hr_user',
    username: 'hr',
    password: '123',
    name: '人資主管',
    role: 'HR',
    permissions: [
      { company: '神資', viewAllDepartments: true, allowedDepartments: [] },
      { company: '新達', viewAllDepartments: true, allowedDepartments: [] }
    ],
    mustChangePassword: true // Demo: HR needs to change password
  },
  {
    id: 'dept_manager',
    username: 'user',
    password: '123',
    name: '部門主管',
    role: 'GeneralUser',
    permissions: [
      { company: '神資', viewAllDepartments: false, allowedDepartments: ['600-數位科技事業群'] }
    ],
    mustChangePassword: true // Demo: User needs to change password
  }
];

export { type AppSettings };

export const getSettings = (): AppSettings => {
  const saved = localStorage.getItem(SETTINGS_KEY);
  const defaultUrl = 'https://script.google.com/macros/s/AKfycbwvTVvUr_2Sjyh8qNbpd80vThaZx6Z_UrB5HhyH3E0JTBTR6IdtMWNeZSLfTMUe0NKPIg/exec';

  if (saved) {
    const settings = JSON.parse(saved);
    // Use default if empty
    return { ...settings, googleScriptUrl: settings.googleScriptUrl || defaultUrl };
  }
  return { googleScriptUrl: defaultUrl };
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

// --- Connection Test ---
export const validateConnection = async (url: string): Promise<{ success: boolean; message: string }> => {
  const targetUrl = url.trim();
  if (!targetUrl) return { success: false, message: "網址為空" };
  // Check if URL contains /exec (query params might follow)
  if (!targetUrl.includes('/exec')) {
    if (targetUrl.includes('docs.google.com/spreadsheets')) {
      return { success: false, message: "這是試算表網址，請使用 Apps Script 發布後的 Web App 網址 (以 /exec 結尾)" };
    }
    return { success: false, message: "網址格式錯誤 (需以 /exec 結尾)" };
  }

  try {
    // Attempt 1: Standard GET with 'omit' credentials
    // This expects the server to return valid JSON and correctly handle redirects.
    // If GAS is set to "Anyone", this usually works fine.
    const response = await fetch(targetUrl, {
      method: 'GET',
      credentials: 'omit'
    });

    if (!response.ok) {
      return { success: false, message: `HTTP 錯誤: ${response.status}` };
    }

    const text = await response.text();

    // Check if the response is actually an HTML login page (Permission Error)
    if (text.includes("<!DOCTYPE html") || text.includes("Google Accounts")) {
      return { success: false, message: "權限錯誤：請確認部署設為「任何人 (Anyone)」" };
    }

    try {
      JSON.parse(text); // Should be valid JSON array
      return { success: true, message: "連線成功！" };
    } catch {
      return { success: false, message: "回傳格式錯誤 (非 JSON)" };
    }
  } catch (e) {
    console.warn("Standard fetch failed, attempting no-cors probe...", e);

    // Attempt 2: CORS Probe (Fall back to no-cors)
    // If the browser blocked the request due to CORS (usually because GAS redirected to a login page),
    // we try 'no-cors' mode. If this request does not throw, it means the server is reachable
    // but the response is opaque. This strongly indicates a Permission issue (Anyone vs Me).
    try {
      await fetch(targetUrl, {
        method: 'GET',
        mode: 'no-cors',
        credentials: 'omit'
      });
      // If we get here, the server exists, but we were blocked from reading.
      return { success: false, message: "連線被拒 (CORS)：請確認 GAS 部署權限為「任何人 (Anyone)」" };
    } catch (probeError) {
      // If even no-cors fails, the URL is wrong or network is down.
      return { success: false, message: "無法連線 (網址錯誤或網路中斷)" };
    }
  }
};

// --- Course Operations ---

const DIRTY_KEY = 'hr_training_dirty';

export const fetchCourses = async (): Promise<Course[]> => {
  const settings = getSettings();
  const url = settings.googleScriptUrl?.trim();
  const isDirty = localStorage.getItem(DIRTY_KEY) === 'true';

  // If dirty, skip server fetch to prefer local changes
  if (isDirty) {
    console.warn("Local data is dirty (unsynced). Skipping server fetch.");
  } else if (url) {
    // If Google Script URL is provided AND not dirty, try to fetch from it
    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'omit'
      });

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data)) {
          // Update local storage cache
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
          return data;
        }
      }
    } catch (e) {
      console.error("Failed to fetch from Google Sheet, falling back to local.", e);
    }
  }

  // Fallback to LocalStorage
  const localData = localStorage.getItem(STORAGE_KEY);
  if (localData) {
    return JSON.parse(localData);
  }

  // Initial Mock Data
  localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_DATA));
  return MOCK_DATA;
};

export const saveCourses = async (courses: Course[]): Promise<void> => {
  const settings = getSettings();
  const url = settings.googleScriptUrl?.trim();

  // Mark as dirty before attempting save
  localStorage.setItem(DIRTY_KEY, 'true');

  // Save to LocalStorage first (optimistic UI)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));

  if (url) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        // mode: 'no-cors', // REMOVED: no-cors hides errors. We WANT to know if it failed.
        credentials: 'omit',
        headers: {
          // Using text/plain prevents preflight OPTIONS request issues in some scenarios
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(courses)
      });

      if (!response.ok) {
        throw new Error(`Cloud sync failed with status: ${response.status}`);
      }

      // Sync success, clear dirty flag
      localStorage.setItem(DIRTY_KEY, 'false');
    } catch (e) {
      console.warn("Failed to save to Google Sheet (Cloud Sync skipped). Local data is saved.", e);
      // Do not throw. We want the UI to consider this a success (Local Save).
      // Dirty flag remains true so we can try syncing later if needed.
    }
  } else {
    // No URL configured, assuming local-only mode is "clean" enough or technically "dirty" but valid?
    // Let's treat no-URL strictly as local-mode (clean).
    localStorage.setItem(DIRTY_KEY, 'false');
  }
};

// --- User & Auth Operations ---

export const fetchUsers = (): User[] => {
  const localUsers = localStorage.getItem(USERS_KEY);
  if (localUsers) {
    return JSON.parse(localUsers);
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(INITIAL_USERS));
  return INITIAL_USERS;
};

export const saveUsers = (users: User[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const login = (username: string, password: string): User | null => {
  const users = fetchUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  }
  return null;
};

export const logout = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const getCurrentUser = (): User | null => {
  const session = localStorage.getItem(SESSION_KEY);
  return session ? JSON.parse(session) : null;
};

// --- CORE: Data Visibility Logic ---

export const getVisibleCourses = (allCourses: Course[], user: User): Course[] => {
  if (user.role === 'SystemAdmin') {
    return allCourses;
  }

  return allCourses.filter(course => {
    // Check if user has permission for this course's company
    const permission = user.permissions.find(p => p.company === course.company);

    if (!permission) return false;

    // Level 1: Company Admin (Can see all departments in this company)
    if (permission.viewAllDepartments) return true;

    // Level 2: Department restricted
    if (permission.allowedDepartments.includes(course.department)) return true;

    return false;
  });
};
