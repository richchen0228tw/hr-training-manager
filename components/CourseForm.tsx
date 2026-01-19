
import React, { useState, useEffect, useMemo } from 'react';
import { Course, COMPANY_OPTIONS, DEPARTMENT_MAPPING, User } from '../types';

interface CourseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (course: Course) => void;
  initialData?: Course | null;
  currentUser: User;
}

const emptyCourse: Course = {
  id: '',
  name: '',
  company: '',
  department: '',
  objective: '',
  startDate: '',
  endDate: '',
  time: '',
  duration: 0,
  expectedAttendees: 0,
  actualAttendees: 0,
  instructor: '',
  instructorOrg: '',
  cost: 0,
  satisfaction: 0,
  status: 'Planned',
  cancellationReason: '',
  createdBy: 'HR',
  trainingType: 'Internal',
  trainees: ''
};

export const CourseForm: React.FC<CourseFormProps> = ({ isOpen, onClose, onSubmit, initialData, currentUser }) => {
  const [formData, setFormData] = useState<Course>(emptyCourse);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);

  // 1. Calculate valid companies based on user permissions
  const validCompanies = useMemo(() => {
    if (currentUser.role === 'SystemAdmin') {
      return COMPANY_OPTIONS;
    }
    // Filter global options to keep order, but restrict to user permissions
    return COMPANY_OPTIONS.filter(opt => 
      currentUser.permissions.some(p => p.company === opt)
    );
  }, [currentUser]);

  // Helper to get allowed departments for a specific company based on user role
  const getAllowedDepartments = (companyName: string): string[] => {
    const allDepts = DEPARTMENT_MAPPING[companyName] || [];
    
    if (currentUser.role === 'SystemAdmin') {
      return allDepts;
    }

    const permission = currentUser.permissions.find(p => p.company === companyName);
    if (!permission) return [];

    if (permission.viewAllDepartments) {
      return allDepts;
    }
    
    return permission.allowedDepartments;
  };

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
            ...emptyCourse,
            ...initialData,
            cancellationReason: initialData.cancellationReason || '',
            trainingType: initialData.trainingType || 'Internal',
            trainees: initialData.trainees || ''
        });
        // Load allowed departments for the existing company
        if (initialData.company) {
             setAvailableDepartments(getAllowedDepartments(initialData.company));
        }
      } else {
        // Creating new course: Set createdBy based on current user role
        // If GeneralUser -> 'User', else (HR/Admin) -> 'HR'
        setFormData({ 
            ...emptyCourse, 
            id: crypto.randomUUID(),
            createdBy: currentUser.role === 'GeneralUser' ? 'User' : 'HR'
        });
        setAvailableDepartments([]);
      }
    }
  }, [isOpen, initialData, currentUser]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'company') {
        // Use the permission-aware helper instead of raw DEPARTMENT_MAPPING
        const newDepts = getAllowedDepartments(value);
        setAvailableDepartments(newDepts);
        setFormData(prev => ({
            ...prev,
            company: value,
            department: '' // Reset department when company changes
        }));
    } else {
        setFormData(prev => ({
          ...prev,
          [name]: type === 'number' ? parseFloat(value) : value
        }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  if (!isOpen) return null;

  // Updated input class with light yellow background and DARK BORDER (slate-600)
  const inputClass = "w-full rounded-lg border-slate-600 border p-2 bg-yellow-50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-slate-800">
            {initialData ? '編輯課程' : '新增課程'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-l-4 border-primary-500 pl-2">基本資訊</h3>
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">課程名稱</label>
            <input
              required
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={inputClass}
              placeholder="例如：2024 年度資訊安全教育訓練"
            />
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">訓練類型</label>
             <select
                name="trainingType"
                value={formData.trainingType}
                onChange={handleChange}
                className={inputClass}
             >
                 <option value="Internal">內訓 (Internal)</option>
                 <option value="External">外訓 (External)</option>
             </select>
          </div>

          {/* Conditional Trainees Input */}
          {formData.trainingType === 'External' && (
             <div className="col-span-1 md:col-span-2 animate-fade-in">
                <label className="block text-sm font-medium text-primary-700 mb-1">受訓名單 (外訓必填)</label>
                <textarea
                  name="trainees"
                  value={formData.trainees || ''}
                  onChange={handleChange}
                  rows={2}
                  className={`${inputClass} border-primary-300 bg-primary-50 focus:ring-primary-500`}
                  placeholder="請輸入參加人員姓名，多人請用逗號分隔..."
                />
             </div>
          )}

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">公司別</label>
             <select
                required
                name="company"
                value={formData.company}
                onChange={handleChange}
                className={inputClass}
             >
                 <option value="" disabled>請選擇公司</option>
                 {validCompanies.map(opt => (
                     <option key={opt} value={opt}>{opt}</option>
                 ))}
             </select>
             {validCompanies.length === 0 && (
               <p className="text-xs text-red-500 mt-1">您目前沒有任何公司的建立權限</p>
             )}
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">事業群/中心/獨立處室</label>
             <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className={inputClass}
                disabled={!formData.company || availableDepartments.length === 0}
             >
                 <option value="">
                    {availableDepartments.length > 0 ? '請選擇部門' : (formData.company ? '無可選部門權限' : '請先選擇公司')}
                 </option>
                 {availableDepartments.map(opt => (
                     <option key={opt} value={opt}>{opt}</option>
                 ))}
             </select>
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">課程目的</label>
            <textarea
              name="objective"
              value={formData.objective}
              onChange={handleChange}
              rows={3}
              className={inputClass}
              placeholder="說明本課程的主要學習目標..."
            />
          </div>

          {/* Schedule */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-l-4 border-primary-500 pl-2 mt-4">時間與講師</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">開始日期</label>
            <input
              required
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">結束日期</label>
            <input
              required
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

           <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">課程時間</label>
            <input
              type="text"
              name="time"
              value={formData.time}
              onChange={handleChange}
              placeholder="09:00 - 17:00"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">時數 (Hours)</label>
            <input
              type="number"
              name="duration"
              min="0"
              step="0.5"
              value={formData.duration}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

           <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">講師姓名</label>
            <input
              type="text"
              name="instructor"
              value={formData.instructor}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

           <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">講師服務單位</label>
            <input
              type="text"
              name="instructorOrg"
              value={formData.instructorOrg}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          {/* Metrics */}
           <div className="col-span-1 md:col-span-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-l-4 border-primary-500 pl-2 mt-4">執行成效與費用</h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">預計人數</label>
            <input
              type="number"
              name="expectedAttendees"
              min="0"
              value={formData.expectedAttendees}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

           <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">實際人數</label>
            <input
              type="number"
              name="actualAttendees"
              min="0"
              value={formData.actualAttendees}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">課程費用</label>
            <input
              type="number"
              name="cost"
              min="0"
              value={formData.cost}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

           <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">滿意度 (1-5)</label>
            <input
              type="number"
              name="satisfaction"
              min="0"
              max="5"
              step="0.1"
              value={formData.satisfaction}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">執行狀態</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className={inputClass}
            >
                <option value="Planned">規劃中</option>
                <option value="Completed">已完成</option>
                <option value="Cancelled">已取消</option>
            </select>
          </div>
          
           <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">建立者</label>
            <select
              name="createdBy"
              value={formData.createdBy}
              onChange={handleChange}
              className={inputClass}
              // If GeneralUser, prevent changing this field to HR manually
              disabled={currentUser.role === 'GeneralUser'}
            >
                <option value="HR">HR</option>
                <option value="User">員工 (User)</option>
            </select>
          </div>

          {formData.status === 'Cancelled' && (
            <div className="col-span-1 md:col-span-2 animate-fade-in">
              <label className="block text-sm font-medium text-red-600 mb-1">取消原因 (必填)</label>
              <input
                required
                type="text"
                name="cancellationReason"
                value={formData.cancellationReason || ''}
                onChange={handleChange}
                placeholder="請輸入取消原因..."
                className={`${inputClass} border-red-500 bg-red-50 focus:ring-red-500`}
              />
            </div>
          )}

          <div className="col-span-1 md:col-span-2 flex justify-end gap-3 mt-6 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium shadow-md shadow-primary-500/20 transition-all transform active:scale-95"
            >
              {initialData ? '儲存變更' : '建立課程'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
