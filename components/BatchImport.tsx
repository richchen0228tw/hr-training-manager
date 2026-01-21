
import React, { useState, useRef } from 'react';
import { Course, User } from '../types';

interface BatchImportProps {
  onImport: (courses: Course[]) => Promise<any>;
  onCancel: () => void;
  currentUser: User;
}

interface FailedItem {
  row: number;
  name: string;
  reason: string;
  raw: string;
}

// Helper to provide a template
const CSV_HEADER = "課程名稱,公司別,部門/單位,課程目的,開始日期,結束日期,時間,時數,預計人數,講師,講師單位,費用,訓練類型(內訓/外訓),受訓名單";
const SAMPLE_DATA = "Excel進階實戰,神資,600-數位科技事業群,提升資料處理效率,2024-01-15,2024-01-15,09:00-17:00,7,30,陳大文,數據中心,12000,內訓,\n溝通技巧,新達,Z10-統合通訊處,強化跨部門溝通,2024-01-20,2024-01-20,13:30-16:30,3,20,林小美,HR,5000,外訓,王小明|李大偉";

export const BatchImport: React.FC<BatchImportProps> = ({ onImport, onCancel, currentUser }) => {
  const [inputText, setInputText] = useState('');
  const [previewData, setPreviewData] = useState<Course[]>([]);
  const [failedItems, setFailedItems] = useState<FailedItem[]>([]);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'input' | 'preview' | 'result'>('input');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setInputText(text);
      }
    };
    reader.onerror = () => {
      setError('讀取檔案失敗');
    };
    reader.readAsText(file);
  };

  const handleParse = () => {
    if (!inputText.trim()) {
      setError('請輸入資料或上傳檔案');
      return;
    }

    try {
      const rows = inputText.trim().split('\n');
      const parsedCourses: Course[] = [];
      const failures: FailedItem[] = [];

      const startIndex = rows[0].includes('課程名稱') ? 1 : 0;
      const createdByValue = currentUser.role === 'GeneralUser' ? 'User' : 'HR';

      const checkPermission = (company: string, dept: string) => {
        if (currentUser.role === 'SystemAdmin') return { valid: true };

        const perm = currentUser.permissions.find(p => p.company === company);
        if (!perm) return { valid: false, error: `無權限存取公司: ${company}` };

        if (perm.viewAllDepartments) return { valid: true };

        if (perm.allowedDepartments.includes(dept)) return { valid: true };
        return { valid: false, error: `${company} 無權限存取部門: ${dept}` };
      };

      for (let i = startIndex; i < rows.length; i++) {
        const row = rows[i].trim();
        if (!row) continue;

        const cols = row.replace(/，/g, ',').split(',').map(c => c.trim());

        if (cols.length < 3) {
          failures.push({
            row: i + 1,
            name: cols[0] || '未知',
            reason: '格式錯誤 (欄位不足)',
            raw: row
          });
          continue;
        }

        const name = cols[0] || '未命名課程';
        const company = cols[1] || '';
        const department = cols[2] || '';

        // Validate Permission
        const validation = checkPermission(company, department);
        if (!validation.valid) {
          failures.push({
            row: i + 1,
            name: name,
            reason: validation.error || '權限不足',
            raw: row
          });
          continue;
        }

        const trainingTypeStr = cols[12] || '內訓';
        const isExternal = trainingTypeStr.includes('外訓') || trainingTypeStr.toLowerCase().includes('external');

        const course: Course = {
          id: crypto.randomUUID(),
          name: name,
          company: company,
          department: department,
          objective: cols[3] || '',
          startDate: cols[4] || new Date().toISOString().split('T')[0],
          endDate: cols[5] || cols[4] || new Date().toISOString().split('T')[0],
          time: cols[6] || '',
          duration: parseFloat(cols[7]) || 0,
          expectedAttendees: parseInt(cols[8]) || 0,
          instructor: cols[9] || '',
          instructorOrg: cols[10] || '',
          cost: parseInt(cols[11]) || 0,
          trainingType: isExternal ? 'External' : 'Internal',
          trainees: cols[13] ? cols[13].replace(/\|/g, ',') : '',
          actualAttendees: 0,
          satisfaction: 0,
          status: 'Planned',
          createdBy: createdByValue
        };
        parsedCourses.push(course);
      }

      if (parsedCourses.length === 0 && failures.length === 0) {
        setError('無法解析任何有效資料，請檢查格式。');
        return;
      }

      setPreviewData(parsedCourses);
      setFailedItems(failures);
      setStep('preview');
      setError('');
    } catch (e) {
      setError('解析格式發生錯誤。');
    }
  };

  const handleConfirmImport = async () => {
    try {
      setIsImporting(true);
      await onImport(previewData);
      setStep('result');
    } catch (e) {
      alert("匯入發生錯誤");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">整批匯入課程 (CSV)</h2>
          {step !== 'result' && (
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'input' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-800">
                <p className="font-bold mb-2">💡 使用說明：</p>
                <p>請將課程資料整理為以下順序，複製並貼上到下方框框中（使用逗號分隔），或直接上傳 CSV 檔案：</p>
                <code className="block bg-white p-2 mt-2 rounded border border-blue-200 text-xs overflow-x-auto whitespace-nowrap">
                  {CSV_HEADER}
                </code>
              </div>

              <div>
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors group">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <div className="flex items-center gap-2 text-slate-500 group-hover:text-primary-600">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>
                      <p className="text-sm font-semibold">點擊上傳 CSV 檔案</p>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">支援 .csv 格式</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                  />
                </label>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium">或直接編輯下方內容</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div className="relative">
                <textarea
                  className="w-full h-48 p-4 rounded-xl border border-slate-600 bg-yellow-50 focus:bg-white focus:border-primary-500 focus:ring-2 focus:ring-primary-500 outline-none font-mono text-sm leading-relaxed transition-colors"
                  placeholder={`範例格式：\n${SAMPLE_DATA}`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setInputText(SAMPLE_DATA)}
                  className="text-sm text-slate-500 hover:text-primary-600 underline"
                >
                  帶入範例資料
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
                  {error}
                </div>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-1 bg-green-50 border border-green-100 p-4 rounded-lg">
                  <h3 className="text-green-800 font-bold text-lg">{previewData.length}</h3>
                  <p className="text-green-600 text-sm">解析成功 (將被匯入)</p>
                </div>
                <div className={`flex-1 border p-4 rounded-lg ${failedItems.length > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                  <h3 className={`${failedItems.length > 0 ? 'text-red-800' : 'text-slate-400'} font-bold text-lg`}>{failedItems.length}</h3>
                  <p className={`${failedItems.length > 0 ? 'text-red-600' : 'text-slate-400'} text-sm`}>解析失敗 (將被略過)</p>
                </div>
              </div>

              {failedItems.length > 0 && (
                <div className="border border-red-200 rounded-lg overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 border-b border-red-100 text-sm font-bold text-red-700">
                    失敗項目清單
                  </div>
                  <div className="max-h-32 overflow-y-auto bg-white">
                    <table className="w-full text-left text-xs">
                      <thead className="text-slate-500 sticky top-0 bg-slate-50">
                        <tr>
                          <th className="p-2 w-16">行號</th>
                          <th className="p-2">課程名稱</th>
                          <th className="p-2 text-red-600">失敗原因</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {failedItems.map((fail, idx) => (
                          <tr key={idx} className="hover:bg-red-50/50">
                            <td className="p-2 text-slate-500">#{fail.row}</td>
                            <td className="p-2 font-medium text-slate-700">{fail.name}</td>
                            <td className="p-2 text-red-600">{fail.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {previewData.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 text-sm font-bold text-slate-700">
                    欲匯入課程預覽
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 shadow-sm">
                        <tr>
                          <th className="p-3">課程名稱</th>
                          <th className="p-3">類型</th>
                          <th className="p-3">公司</th>
                          <th className="p-3">日期</th>
                          <th className="p-3 text-right">費用</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {previewData.map((course, idx) => (
                          <tr key={idx}>
                            <td className="p-3">{course.name}</td>
                            <td className="p-3">{course.trainingType === 'External' ? '外訓' : '內訓'}</td>
                            <td className="p-3">{course.company}</td>
                            <td className="p-3">{course.startDate}</td>
                            <td className="p-3 text-right">{course.cost}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-lg">
                  沒有可匯入的有效資料
                </div>
              )}
            </div>
          )}

          {step === 'result' && (
            <div className="space-y-6">
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800">匯入作業完成</h2>
                <p className="text-slate-500 mt-2">請確認以下匯入結果</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-center">
                  <div className="text-3xl font-bold text-green-600">{previewData.length}</div>
                  <div className="text-sm text-green-800 font-medium mt-1">成功匯入</div>
                </div>
                <div className={`bg-red-50 border border-red-200 p-4 rounded-xl text-center ${failedItems.length === 0 ? 'opacity-50 grayscale' : ''}`}>
                  <div className="text-3xl font-bold text-red-600">{failedItems.length}</div>
                  <div className="text-sm text-red-800 font-medium mt-1">匯入失敗 / 格式錯誤</div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Success List */}
                {previewData.length > 0 && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-green-50 px-4 py-2 border-b border-green-100 text-sm font-bold text-green-800 flex justify-between items-center">
                      <span>成功匯入項目</span>
                      <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-green-200 text-green-600">{previewData.length}</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 sticky top-0">
                          <tr>
                            <th className="p-2">課程名稱</th>
                            <th className="p-2">公司</th>
                            <th className="p-2">日期</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {previewData.map((c, i) => (
                            <tr key={i}>
                              <td className="p-2 font-medium text-slate-700">{c.name}</td>
                              <td className="p-2 text-slate-500">{c.company}</td>
                              <td className="p-2 text-slate-500">{c.startDate}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Failure List */}
                {failedItems.length > 0 && (
                  <div className="border border-red-200 rounded-lg overflow-hidden">
                    <div className="bg-red-50 px-4 py-2 border-b border-red-100 text-sm font-bold text-red-800 flex justify-between items-center">
                      <span>失敗 / 格式錯誤項目</span>
                      <span className="text-xs bg-white px-2 py-0.5 rounded-full border border-red-200 text-red-600">{failedItems.length}</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 sticky top-0">
                          <tr>
                            <th className="p-2 w-16">行號</th>
                            <th className="p-2">課程名稱</th>
                            <th className="p-2 text-red-600">失敗原因</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {failedItems.map((fail, idx) => (
                            <tr key={idx} className="bg-red-50/10 hover:bg-red-50/30">
                              <td className="p-2 text-slate-500">#{fail.row}</td>
                              <td className="p-2 font-medium text-slate-700">{fail.name}</td>
                              <td className="p-2 text-red-600 font-medium">{fail.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          {step === 'input' && (
            <>
              <button onClick={onCancel} className="px-5 py-2 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors">取消</button>
              <button onClick={handleParse} className="px-5 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 shadow-md transition-colors">
                解析資料
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button onClick={() => setStep('input')} className="px-5 py-2 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors">上一步</button>
              <button
                onClick={handleConfirmImport}
                disabled={previewData.length === 0 || isImporting}
                className={`px-5 py-2 rounded-lg text-white shadow-md transition-all flex items-center gap-2 ${previewData.length > 0
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-slate-400 cursor-not-allowed'
                  }`}
              >
                {isImporting ? (
                  '匯入中...'
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                    確認匯入
                  </>
                )}
              </button>
            </>
          )}

          {step === 'result' && (
            <button onClick={onCancel} className="px-5 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 shadow-md transition-colors font-medium">
              匯入完成
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
