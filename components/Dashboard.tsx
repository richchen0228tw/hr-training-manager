import React, { useMemo, useState, useEffect } from 'react';
import { Course, DashboardStats } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardProps {
    courses: Course[];
}

const COLORS = ['#0ea5e9', '#22c55e', '#ef4444', '#f59e0b'];
const TYPE_COLORS = ['#6366f1', '#ec4899', '#94a3b8']; // Indigo (Internal), Pink (External), Slate (Unknown)

// Helper to get formatted date string YYYY-MM-DD
// Helper to get formatted date string YYYY-MM-DD in Local Time
const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const getCurrentMonthRange = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0); // Last day of current month
    return {
        year,
        start: formatDate(start),
        end: formatDate(end)
    };
};

// Shared icon component for consistency
const InfoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300 opacity-50 group-hover:opacity-100 transition-opacity">
        <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" />
    </svg>
);

export const Dashboard: React.FC<DashboardProps> = ({ courses }) => {
    const defaults = getCurrentMonthRange();
    const [selectedYear, setSelectedYear] = useState<number>(defaults.year);
    const [startDate, setStartDate] = useState<string>(defaults.start);
    const [endDate, setEndDate] = useState<string>(defaults.end);
    const [selectedType, setSelectedType] = useState<string>('All');

    // Handle Year Change: Update date range years while preserving month/day
    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newYear = parseInt(e.target.value);
        setSelectedYear(newYear);

        // Helper to safely update year of a YYYY-MM-DD string
        const updateYear = (dateStr: string) => {
            if (!dateStr) return '';
            const [y, m, d] = dateStr.split('-').map(Number);
            // Construct local date
            const date = new Date(newYear, m - 1, d); // Use newYear directly
            return formatDate(date);
        };

        if (startDate) setStartDate(updateYear(startDate));
        if (endDate) setEndDate(updateYear(endDate));
    };

    const filteredCourses = useMemo(() => {
        return courses.filter(course => {
            // 1. Date Range Filter
            const courseDate = course.startDate;
            if (startDate && courseDate < startDate) return false;
            if (endDate && courseDate > endDate) return false;

            // 2. Training Type Filter
            if (selectedType !== 'All') {
                if (selectedType === 'Internal' && course.trainingType !== 'Internal') return false;
                if (selectedType === 'External' && course.trainingType !== 'External') return false;
            }

            return true;
        });
    }, [courses, startDate, endDate, selectedType]);

    const trainingTypeData = useMemo(() => {
        let internal = 0;
        let external = 0;
        let unknown = 0;

        filteredCourses.forEach(c => {
            if (c.trainingType === 'Internal') internal++;
            else if (c.trainingType === 'External') external++;
            else unknown++;
        });

        const data = [
            { name: '內訓', value: internal },
            { name: '外訓', value: external },
        ];
        if (unknown > 0) data.push({ name: '未分類', value: unknown });

        return data.filter(d => d.value > 0);
    }, [filteredCourses]);

    const stats: DashboardStats = useMemo(() => {
        const totalCourses = filteredCourses.length;
        const completedCourses = filteredCourses.filter(c => c.status === 'Completed');
        const nonCancelledCourses = filteredCourses.filter(c => c.status !== 'Cancelled');

        // 預算計算
        const expectedTotalCost = filteredCourses.reduce((acc, curr) => acc + (curr.cost || 0), 0);
        const actualTotalCost = nonCancelledCourses.reduce((acc, curr) => acc + (curr.cost || 0), 0);

        // 時數計算
        const expectedTotalHours = filteredCourses.reduce((acc, curr) => acc + (curr.duration || 0), 0);
        const actualTotalHours = nonCancelledCourses.reduce((acc, curr) => acc + (curr.duration || 0), 0);

        // 滿意度
        const avgSat = completedCourses.length
            ? completedCourses.reduce((acc, curr) => acc + (curr.satisfaction || 0), 0) / completedCourses.length
            : 0;

        // 開課率：(總課程數 - 已取消) / 總課程數
        const openingRate = totalCourses
            ? Math.round((nonCancelledCourses.length / totalCourses) * 100)
            : 0;

        // 參訓率：總實際人數 / (未取消課程的)總預計人數
        // 分母不包含已取消課程的預計人數，以免拉低比率
        const expectedAttendeesInNonCancelled = nonCancelledCourses.reduce((acc, curr) => acc + (curr.expectedAttendees || 0), 0);
        const totalActualAttendees = filteredCourses.reduce((acc, curr) => acc + (curr.actualAttendees || 0), 0);
        const participationRate = expectedAttendeesInNonCancelled
            ? Math.round((totalActualAttendees / expectedAttendeesInNonCancelled) * 100)
            : 0;

        return {
            totalCourses,
            expectedTotalCost,
            actualTotalCost,
            expectedTotalHours,
            actualTotalHours,
            avgSatisfaction: parseFloat(avgSat.toFixed(1)),
            completionRate: totalCourses ? Math.round((completedCourses.length / totalCourses) * 100) : 0,
            openingRate,
            participationRate
        };
    }, [filteredCourses]);

    const monthlyData = useMemo(() => {
        const data: Record<string, { name: string; courses: number; cost: number }> = {};
        filteredCourses.forEach(course => {
            const month = course.startDate.substring(0, 7); // YYYY-MM
            if (!data[month]) {
                data[month] = { name: month, courses: 0, cost: 0 };
            }
            data[month].courses += 1;
            data[month].cost += course.cost;
        });
        return Object.values(data).sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredCourses]);

    const statusData = useMemo(() => {
        const counts = { Planned: 0, Completed: 0, Cancelled: 0 };
        filteredCourses.forEach(c => {
            if (counts[c.status] !== undefined) counts[c.status]++;
        });
        return [
            { name: '規劃中', value: counts.Planned },
            { name: '已完成', value: counts.Completed },
            { name: '已取消', value: counts.Cancelled },
        ].filter(item => item.value > 0);
    }, [filteredCourses]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">年度</label>
                    <select
                        value={selectedYear}
                        onChange={handleYearChange}
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
                    >
                        {Array.from({ length: 5 }, (_, i) => defaults.year - 2 + i).map(year => (
                            <option key={year} value={year}>{year}年</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">日期起</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
                    />
                </div>

                <div className="flex items-center self-center pt-5 text-slate-400">~</div>

                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">日期迄</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">訓練類型</label>
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
                    >
                        <option value="All">全部類型</option>
                        <option value="Internal">內訓</option>
                        <option value="External">外訓</option>
                    </select>
                </div>

                <div className="ml-auto flex items-center">
                    <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                        篩選後：{filteredCourses.length} 筆資料
                    </span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. 總課程數 */}
                <div
                    className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between cursor-help group relative"
                    title="所有狀態（規劃中、已完成、已取消）的課程總數"
                >
                    <div className="flex justify-between items-start">
                        <h3 className="text-sm font-medium text-slate-500">總課程數</h3>
                        <InfoIcon />
                    </div>
                    <p className="text-3xl font-bold text-slate-800 mt-2">{stats.totalCourses}</p>
                </div>

                {/* 2. 開課率 */}
                <div
                    className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between cursor-help group relative"
                    title="計算公式：(總課程數 - 已取消課程數) / 總課程數"
                >
                    <div className="flex justify-between items-start">
                        <h3 className="text-sm font-medium text-slate-500">開課率</h3>
                        <InfoIcon />
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                        <p className={`text-3xl font-bold ${stats.openingRate >= 80 ? 'text-green-600' : 'text-slate-800'}`}>
                            {stats.openingRate}%
                        </p>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">規劃課程實際執行比例</p>
                </div>

                {/* 3. 參訓率 */}
                <div
                    className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between cursor-help group relative"
                    title="計算公式：實際參訓總人數 / (預計參訓總人數 - 已取消課程預計人數)"
                >
                    <div className="flex justify-between items-start">
                        <h3 className="text-sm font-medium text-slate-500">參訓率</h3>
                        <InfoIcon />
                    </div>
                    <div className="flex items-baseline gap-2 mt-2">
                        <p className={`text-3xl font-bold ${stats.participationRate >= 80 ? 'text-green-600' : stats.participationRate < 60 ? 'text-amber-500' : 'text-slate-800'}`}>
                            {stats.participationRate}%
                        </p>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">實際出席 / 預計出席人數</p>
                </div>

                {/* 4. 預算消耗 */}
                <div
                    className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between cursor-help group relative"
                    title="實際消耗金額 (不含取消課程) / 年度總預算"
                >
                    <div className="flex justify-between items-start">
                        <h3 className="text-sm font-medium text-slate-500">預算執行</h3>
                        <InfoIcon />
                    </div>
                    <div className="mt-2">
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-primary-600">${stats.actualTotalCost.toLocaleString()}</span>
                            <span className="text-xs text-slate-400 font-medium">實際消耗</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 mb-1">
                            <div
                                className="bg-primary-500 h-1.5 rounded-full"
                                style={{ width: `${stats.expectedTotalCost ? Math.min((stats.actualTotalCost / stats.expectedTotalCost) * 100, 100) : 0}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between items-center text-xs text-slate-500">
                            <span>總預算: ${stats.expectedTotalCost.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* 5. 訓練時數 */}
                <div
                    className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between cursor-help group relative"
                    title="實際執行總時數 (不含取消課程) vs 原始規劃總時數"
                >
                    <div className="flex justify-between items-start">
                        <h3 className="text-sm font-medium text-slate-500">訓練總時數</h3>
                        <InfoIcon />
                    </div>
                    <div className="mt-2">
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-slate-800">{stats.actualTotalHours}</span>
                            <span className="text-sm text-slate-600">小時</span>
                            <span className="text-xs text-slate-400 font-medium ml-1">(實際)</span>
                        </div>
                        <div className="mt-1 text-sm text-slate-500 flex items-center gap-1">
                            <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">預計</span>
                            <span>{stats.expectedTotalHours} 小時</span>
                        </div>
                    </div>
                </div>

                {/* 6. 平均滿意度 */}
                <div
                    className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between cursor-help group relative"
                    title="已完成課程的學員滿意度平均值 (滿分 5 分)"
                >
                    <div className="flex justify-between items-start">
                        <h3 className="text-sm font-medium text-slate-500">平均滿意度</h3>
                        <InfoIcon />
                    </div>
                    <p className="text-3xl font-bold text-amber-500 mt-2">{stats.avgSatisfaction} <span className="text-sm font-normal text-slate-400">/ 5</span></p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">每月課程與費用分佈</h3>
                    <div className="h-72">
                        {monthlyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                                    <YAxis yAxisId="left" orientation="left" stroke="#0ea5e9" fontSize={12} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar yAxisId="left" dataKey="courses" name="課程數" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={30} />
                                    <Bar yAxisId="right" dataKey="cost" name="費用" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-300">
                                無資料
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    {/* 執行狀態 */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">執行狀態</h3>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={60}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-4 mt-2 flex-wrap">
                            {statusData.map((entry, index) => (
                                <div key={entry.name} className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                    <span className="text-xs text-slate-600">{entry.name} ({entry.value})</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 內外訓佔比 (New) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">內外訓佔比</h3>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={trainingTypeData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={60}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {trainingTypeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex justify-center gap-4 mt-2 flex-wrap">
                            {trainingTypeData.map((entry, index) => (
                                <div key={entry.name} className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLORS[index % TYPE_COLORS.length] }}></div>
                                    <span className="text-xs text-slate-600">{entry.name} ({entry.value})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};