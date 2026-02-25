"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { SearchInput } from "@/components/search/SearchInput";
import { useDebounce } from "@/hooks/useDebounce";

interface ActivityEntry {
    id: string;
    actor: "ai" | "user";
    action: string;
    timestamp: string;
    status: "success" | "warning" | "info";
    impactScore: number;
    importance?: "High" | "Medium" | "Low";
    category: "work" | "email" | "calendar" | "task";
    rawTitle?: string;
    actualTime?: string;
}

interface Stats {
    totalScore: number;
    emailCount: number;
    taskCount: number;
    calendarCount: number;
}

interface StreakInfo {
    current: number;
    lastSevenDays: number;
}

interface Streaks {
    task: StreakInfo;
    email: StreakInfo;
    active: StreakInfo;
}

interface DayStats {
    date: string;
    dayLabel: string;
    total: number;
    isToday: boolean;
}

const categoryIcons: Record<string, string> = {
    email: "✉️",
    task: "✓",
    calendar: "📅",
    work: "💼",
};

function formatTimestamp(date: Date): string {
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const hour12 = hours % 12 || 12;
    const minuteStr = minutes.toString().padStart(2, '0');
    return `${month} ${day}, ${hour12}:${minuteStr}${ampm}`;
}

function toDateTimeLocalValue(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function ActivityLog() {
    const [activities, setActivities] = useState<ActivityEntry[]>([]);
    const [stats, setStats] = useState<Stats>({ totalScore: 0, emailCount: 0, taskCount: 0, calendarCount: 0 });
    const [streaks, setStreaks] = useState<Streaks>({
        task: { current: 0, lastSevenDays: 0 },
        email: { current: 0, lastSevenDays: 0 },
        active: { current: 0, lastSevenDays: 0 }
    });
    const [averageDaily, setAverageDaily] = useState(0);
    const [weeklyStats, setWeeklyStats] = useState<DayStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [manualAccomplishments, setManualAccomplishments] = useState<ActivityEntry[]>([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const [editingTimestampId, setEditingTimestampId] = useState<string | null>(null);
    const debouncedSearch = useDebounce(searchQuery, 200);

    const filteredActivities = useMemo(() => {
        if (!debouncedSearch) return activities;
        const query = debouncedSearch.toLowerCase();
        return activities.filter(activity =>
            activity.action?.toLowerCase().includes(query) ||
            activity.rawTitle?.toLowerCase().includes(query)
        );
    }, [activities, debouncedSearch]);

    const fetchActivities = useCallback(async () => {
        try {
            const response = await fetch("/api/activity");
            if (!response.ok) throw new Error("Failed to fetch activity");
            const data = await response.json();
            setActivities(data.activities || []);
            setStats(data.stats || { totalScore: 0, emailCount: 0, taskCount: 0, calendarCount: 0 });
            setStreaks(data.streaks || {
                task: { current: 0, lastSevenDays: 0 },
                email: { current: 0, lastSevenDays: 0 },
                active: { current: 0, lastSevenDays: 0 }
            });
            setAverageDaily(data.averageDaily || 0);
            setWeeklyStats(data.weeklyStats || []);
        } catch (err) {
            console.error("Activity fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchActivities();
        const interval = setInterval(fetchActivities, 30000);
        return () => clearInterval(interval);
    }, [fetchActivities]);

    // Today's total count
    const todayCount = stats.taskCount + stats.emailCount + stats.calendarCount;

    // Combined accomplishments - all filtered activities plus manual ones
    const allAccomplishments = useMemo(() => {
        return [...filteredActivities, ...manualAccomplishments];
    }, [filteredActivities, manualAccomplishments]);

    // Drag and drop handlers for manual accomplishments
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        try {
            const data = e.dataTransfer.getData("application/json");
            if (data) {
                const item = JSON.parse(data);
                // Create a manual accomplishment entry
                const now = new Date();
                const manualEntry: ActivityEntry = {
                    id: `manual-${Date.now()}-${item.id || Math.random().toString(36).substr(2, 9)}`,
                    actor: "user",
                    action: item.title || item.action || item.summary || "Manual accomplishment",
                    timestamp: formatTimestamp(now),
                    actualTime: now.toISOString(),
                    status: "success",
                    impactScore: item.impactScore || 2,
                    importance: item.importance || "Medium",
                    category: "task",
                    rawTitle: item.title || item.rawTitle || item.summary,
                };
                setManualAccomplishments(prev => [...prev, manualEntry]);
            }
        } catch (err) {
            console.error("Failed to parse dropped item:", err);
        }
    }, []);

    // Delete manual accomplishment
    const deleteManualAccomplishment = useCallback((id: string) => {
        setManualAccomplishments(prev => prev.filter(a => a.id !== id));
    }, []);

    // Delete accomplishment
    const deleteAccomplishment = async (id: string) => {
        // Optimistic update - remove from UI
        setActivities(prev => prev.filter(a => a.id !== id));

        try {
            const response = await fetch(`/api/activity?id=${id}`, { method: "DELETE" });
            if (!response.ok) {
                // Revert on failure
                fetchActivities();
            }
        } catch (err) {
            console.error("Failed to delete accomplishment:", err);
            fetchActivities();
        }
    };

    // Return task to Priority Planner (uncomplete it)
    const returnToPriorityPlanner = async (id: string) => {
        // Optimistic update - remove from UI
        setActivities(prev => prev.filter(a => a.id !== id));

        try {
            const response = await fetch(`/api/activity?id=${id}`, { method: "DELETE" });
            if (!response.ok) {
                fetchActivities();
            }
        } catch (err) {
            console.error("Failed to return task:", err);
            fetchActivities();
        }
    };

    // Update timestamp for an accomplishment
    const updateTimestamp = useCallback((id: string, newDate: Date) => {
        const newTimestamp = formatTimestamp(newDate);
        if (id.startsWith("manual-")) {
            setManualAccomplishments(prev =>
                prev.map(a => a.id === id ? { ...a, timestamp: newTimestamp, actualTime: newDate.toISOString() } : a)
            );
        } else {
            setActivities(prev =>
                prev.map(a => a.id === id ? { ...a, timestamp: newTimestamp, actualTime: newDate.toISOString() } : a)
            );
        }
        setEditingTimestampId(null);
    }, []);

    // Render streak badge
    const renderStreakBadge = (icon: string, label: string, streak: StreakInfo) => {
        const hasStreak = streak.current > 0;
        return (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${
                hasStreak ? 'bg-slate-800/50' : 'bg-slate-800/20'
            }`}>
                <span className={hasStreak ? '' : 'opacity-40'}>{icon}</span>
                <span className={`text-xs font-medium ${hasStreak ? 'text-slate-200' : 'text-slate-500'}`}>
                    {streak.current > 0 ? `${streak.current}d` : '-'}
                </span>
                {streak.lastSevenDays > 0 && (
                    <span className="text-[9px] text-slate-500">
                        ({streak.lastSevenDays}/7)
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>🏆</span> Daily Achievements
                </h2>
                <div className="flex items-center gap-2">
                    <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search..."
                        className="w-24"
                    />
                    {loading && <span className="text-[10px] text-slate-500 animate-pulse">...</span>}
                </div>
            </div>

            {/* Today's Count - Hero Section */}
            <div className="mb-4 bg-gradient-to-br from-indigo-900/40 via-purple-900/30 to-slate-900/40 rounded-xl p-4 border border-indigo-500/20">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Today&apos;s Count</p>
                <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-black text-white">{todayCount}</span>
                    <span className="text-lg text-slate-400">things done</span>
                </div>

                {/* Progress bar with average comparison */}
                {averageDaily > 0 && (
                    <div className="mt-3">
                        <div className="h-1.5 bg-slate-800/60 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-700 ${
                                    todayCount >= averageDaily
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-400'
                                        : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                                }`}
                                style={{ width: `${Math.min(100, (todayCount / Math.max(averageDaily, 1)) * 100)}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1.5">
                            {todayCount >= averageDaily ? (
                                <span className="text-green-400">Above your {averageDaily} avg</span>
                            ) : (
                                <span>vs {averageDaily} avg</span>
                            )}
                        </p>
                    </div>
                )}
            </div>

            {/* Weekly Sparkline */}
            {weeklyStats.length > 0 && (
                <div className="mb-4 bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">This Week</p>
                        <span className="text-sm font-semibold text-slate-300">
                            {weeklyStats.reduce((sum, d) => sum + d.total, 0)}
                        </span>
                    </div>
                    {/* Date numbers */}
                    <div className="flex justify-between mb-1">
                        {weeklyStats.map((day, idx) => {
                            const dateNum = new Date(day.date).getDate();
                            return (
                                <span
                                    key={idx}
                                    className={`flex-1 text-center text-[10px] font-medium ${
                                        day.isToday ? 'text-indigo-400' : 'text-slate-500'
                                    }`}
                                >
                                    {dateNum}
                                </span>
                            );
                        })}
                    </div>
                    {/* Task counts */}
                    <div className="flex justify-between">
                        {weeklyStats.map((day, idx) => (
                            <span
                                key={idx}
                                className={`flex-1 text-center text-[10px] font-medium ${
                                    day.isToday
                                        ? 'text-indigo-400'
                                        : day.total > 0
                                        ? 'text-slate-300'
                                        : 'text-slate-600'
                                }`}
                                title={`${day.date}: ${day.total} items`}
                            >
                                {day.total}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Breakdown */}
            {todayCount > 0 && (
                <div className="mb-4">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Breakdown</p>
                    <div className="flex flex-wrap gap-3">
                        {stats.taskCount > 0 && (
                            <div className="flex items-center gap-1.5 text-sm">
                                <span className="text-green-400">●</span>
                                <span className="text-slate-300">{stats.taskCount} tasks</span>
                            </div>
                        )}
                        {stats.emailCount > 0 && (
                            <div className="flex items-center gap-1.5 text-sm">
                                <span className="text-blue-400">●</span>
                                <span className="text-slate-300">{stats.emailCount} emails</span>
                            </div>
                        )}
                        {stats.calendarCount > 0 && (
                            <div className="flex items-center gap-1.5 text-sm">
                                <span className="text-purple-400">●</span>
                                <span className="text-slate-300">{stats.calendarCount} events</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Streaks */}
            <div className="mb-4">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Streaks</p>
                <div className="flex flex-wrap gap-2">
                    {renderStreakBadge("🔥", "Tasks", streaks.task)}
                    {renderStreakBadge("✉️", "Emails", streaks.email)}
                    {renderStreakBadge("⚡", "Active", streaks.active)}
                </div>
            </div>


            {/* Accomplishments of the Day */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                    Accomplishments of the Day {allAccomplishments.length > 0 && `(${allAccomplishments.length})`}
                </p>
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex-1 space-y-1.5 overflow-y-auto pr-1 min-h-[60px] rounded-lg transition-all scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent ${
                        isDragOver
                            ? "bg-green-500/20 border-2 border-dashed border-green-500/50"
                            : allAccomplishments.length === 0
                            ? "border-2 border-dashed border-slate-700/50"
                            : ""
                    }`}
                >
                    {allAccomplishments.length === 0 && debouncedSearch ? (
                        <div className="flex items-center justify-center h-14 text-slate-500 text-xs">
                            No matches for &quot;{debouncedSearch}&quot;
                        </div>
                    ) : allAccomplishments.length === 0 ? (
                        <div className="flex items-center justify-center h-14 text-slate-500 text-xs">
                            {isDragOver ? "Drop to add accomplishment" : "Complete tasks to see them here"}
                        </div>
                    ) : (
                        allAccomplishments.map((item) => (
                            <div
                                key={item.id}
                                className={`flex items-center gap-2 p-2 rounded-lg group ${
                                    item.id.startsWith("manual-")
                                        ? "bg-amber-500/10 border border-amber-500/20"
                                        : item.category === "email"
                                        ? "bg-blue-500/10 border border-blue-500/20"
                                        : item.category === "calendar"
                                        ? "bg-purple-500/10 border border-purple-500/20"
                                        : "bg-green-500/10 border border-green-500/20"
                                }`}
                            >
                                <span className={`text-sm ${
                                    item.id.startsWith("manual-")
                                        ? "text-amber-400"
                                        : item.category === "email"
                                        ? "text-blue-400"
                                        : item.category === "calendar"
                                        ? "text-purple-400"
                                        : "text-green-400"
                                }`}>
                                    {item.id.startsWith("manual-") ? "★" : categoryIcons[item.category] || "✓"}
                                </span>
                                <span className="flex-1 text-xs text-slate-200 truncate">
                                    {item.rawTitle || item.action.replace(/^(Completed |Finished priority task: |Sent email to |Completed task: )"?|"$/g, "")}
                                </span>
                                {editingTimestampId === item.id ? (
                                    <input
                                        type="datetime-local"
                                        className="text-[9px] bg-slate-700 text-slate-200 rounded px-1 py-0.5 border border-slate-600 focus:border-indigo-500 focus:outline-none"
                                        defaultValue={toDateTimeLocalValue(item.actualTime ? new Date(item.actualTime) : new Date())}
                                        onBlur={(e) => {
                                            if (e.target.value) {
                                                updateTimestamp(item.id, new Date(e.target.value));
                                            } else {
                                                setEditingTimestampId(null);
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && e.currentTarget.value) {
                                                updateTimestamp(item.id, new Date(e.currentTarget.value));
                                            } else if (e.key === 'Escape') {
                                                setEditingTimestampId(null);
                                            }
                                        }}
                                        autoFocus
                                    />
                                ) : (
                                    <button
                                        onClick={() => setEditingTimestampId(item.id)}
                                        className="text-[9px] text-slate-500 font-mono hover:text-slate-300 transition-colors"
                                        title="Click to edit date/time"
                                    >
                                        {item.timestamp}
                                    </button>
                                )}
                                {item.id.startsWith("pri-") && (
                                    <button
                                        onClick={() => returnToPriorityPlanner(item.id)}
                                        className="text-amber-500 hover:text-amber-400 transition-all p-0.5"
                                        title="Return to Priority Planner"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                        </svg>
                                    </button>
                                )}
                                <button
                                    onClick={() => item.id.startsWith("manual-") ? deleteManualAccomplishment(item.id) : deleteAccomplishment(item.id)}
                                    className="text-slate-500 hover:text-red-400 transition-all p-0.5"
                                    title="Remove"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
