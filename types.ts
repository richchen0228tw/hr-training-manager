
export interface Course {
  id: string;
  name: string; // 課程名稱
  company: string; // 公司別
  department: string; // 事業群/中心/獨立處室
  objective: string; // 課程目的
  startDate: string; // 課程起日 (YYYY-MM-DD)
  endDate: string; // 課程迄日 (YYYY-MM-DD)
  time: string; // 課程時間 (e.g., 09:00-12:00)
  duration: number; // 課程時數 (hours)
  expectedAttendees: number; // 預計人數
  actualAttendees: number; // 實際人數
  instructor: string; // 講師姓名
  instructorOrg: string; // 講師服務單位
  cost: number; // 課程費用
  satisfaction: number; // 課程滿意度 (1-5)
  status: 'Planned' | 'Completed' | 'Cancelled'; // 執行情形
  cancellationReason?: string; // 取消原因
  createdBy: 'HR' | 'User';
  trainingType?: 'Internal' | 'External'; // 訓練類型：內訓、外訓
  trainees?: string; // 受訓名單 (外訓用)
}

export interface DashboardStats {
  totalCourses: number;
  expectedTotalCost: number; // 年度總預算
  actualTotalCost: number;   // 實際預算消耗
  expectedTotalHours: number; // 預計訓練總時數
  actualTotalHours: number;   // 實際訓練總時數
  avgSatisfaction: number;
  completionRate: number;
  openingRate: number;       // 開課率
  participationRate: number; // 參訓率
}

// User & Permission Types
export type UserRole = 'SystemAdmin' | 'HR' | 'GeneralUser';

export interface CompanyPermission {
  company: string;
  viewAllDepartments: boolean; // True: Can view all data for this company
  allowedDepartments: string[]; // If viewAll is false, only these departments
}

export interface User {
  id: string;
  username: string;
  password?: string; // In real app, store hash. Here plain text for demo.
  name: string;
  role: UserRole;
  permissions: CompanyPermission[];
  mustChangePassword?: boolean; // Force user to change password on next login
}

export type ViewState = 'dashboard' | 'list' | 'import' | 'users';

export interface AppSettings {
  googleScriptUrl: string;
}

// Constants shared across components
export const COMPANY_OPTIONS = ['神通', '神資', '神耀', '新達', '肇源', '光通信'];

export const DEPARTMENT_MAPPING: Record<string, string[]> = {
  '神資': [
    '070-董事長室', 'P00-總經理室', 'PA0-財務處', 'PC0-稽核室', 
    'PG0-資訊服務研發處', '600-數位科技事業群', '700-行政支援中心', 
    'C00-應用系統事業群', 'G00-創新科技事業群', 'K00-智慧交通事業群'
  ],
  '神耀': [
    'Q0A-董事長室', 'Q00-總經理室', 'QF0-管理處', 'Q01-財會部', 
    'QA0-智能科技中心', 'QB0-智慧聯安事業群', 'QC0-AI創新應用研發中心'
  ],
  '新達': [
    'ZA0-董事長室', 'Z00-總經理室', 'Z10-統合通訊處', 
    'Z20-智能影音處', 'Z30-電力系統處', 'Z70-技術支援處'
  ],
  '神通': ['一般部門'],
  '肇源': ['一般部門'],
  '光通信': ['一般部門']
};
