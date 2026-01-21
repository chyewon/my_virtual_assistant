"use client";

import { useState, useEffect, useCallback } from "react";

interface ActivityEntry {
    id: string;
    actor: "ai" | "user";
    action: string;
    timestamp: string;
    status: "success" | "warning" | "info";
}

const actorConfig = {
    ai: { emoji: "🤖", label: "AI" },
    user: { emoji: "👤", label: "You" },
};

const statusConfig = {
    success: "text-green-400",
    warning: "text-yellow-400",
    info: "text-slate-400",
};

export default function ActivityLog() {
    const [activities, setActivities] = useState<ActivityEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchActivities = useCallback(async () => {
        try {
            const response = await fetch("/api/activity");
            if (!response.ok) throw new Error("Failed to fetch activity");
            const data = await response.json();
            setActivities(data.activities || []);
        } catch (err) {
            console.error("Activity fetch error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchActivities();
        const interval = setInterval(fetchActivities, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [fetchActivities]);

    // Simple placeholder metrics - in a real app these would come from an API too
    const completedToday = activities.filter(a => a.status === "success").length;
    const totalToday = Math.max(completedToday, 5); // Just a placeholder
    const completionPercent = Math.round((completedToday / totalToday) * 100);

    return (
        <div className="h-full flex flex-col">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2"><span>📊</span> Activity Log</span>
                {loading && <span className="text-[10px] text-slate-500 animate-pulse">Syncing...</span>}
            </h2>

            {/* Activity Feed */}
            <div className="flex-1 space-y-3 overflow-y-auto mb-4 scrollbar-hide">
                {activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-slate-500 gap-2">
                        <span className="text-2xl opacity-20">🍃</span>
                        <p className="text-xs">No recent activity yet today</p>
                    </div>
                ) : (
                    activities.map((activity) => {
                        const actor = actorConfig[activity.actor] || actorConfig.user;
                        const statusColor = statusConfig[activity.status] || statusConfig.info;

                        return (
                            <div
                                key={activity.id}
                                className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-800/50 hover:bg-slate-800/50 transition-colors group"
                            >
                                <span className="text-lg group-hover:scale-110 transition-transform">{actor.emoji}</span>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm ${statusColor}`}>
                                        <span className="font-semibold text-slate-300">{actor.label}:</span> {activity.action}
                                    </p>
                                    <span className="text-[10px] text-slate-500 font-mono">{activity.timestamp}</span>
                                </div>
                                {activity.status === "success" && (
                                    <span className="text-green-500 text-sm font-bold shadow-green-500/20 drop-shadow-sm">✓</span>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Completion Metrics */}
            <div className="border-t border-slate-800/80 pt-4 space-y-4 bg-slate-900/40 p-3 rounded-xl">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Live Performance
                </h3>

                {/* Today */}
                <div>
                    <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-400 font-medium">Daily Completion</span>
                        <span className="text-indigo-400 font-bold">
                            {completedToday} {completedToday === 1 ? 'task' : 'tasks'}
                        </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-1000 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                            style={{ width: `${Math.min(100, (completedToday / totalToday) * 100)}%` }}
                        />
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-slate-950/50 border border-slate-800/50 rounded-lg p-3 text-center transition-all hover:border-indigo-500/30 group">
                        <span className="text-xl font-black text-indigo-400 group-hover:drop-shadow-[0_0_5px_rgba(129,140,248,0.5)] transition-all">
                            {activities.length}
                        </span>
                        <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 tracking-tighter">Total Events</p>
                    </div>
                    <div className="bg-slate-950/50 border border-slate-800/50 rounded-lg p-3 text-center transition-all hover:border-green-500/30 group">
                        <span className="text-xl font-black text-green-400 group-hover:drop-shadow-[0_0_5px_rgba(74,222,128,0.5)] transition-all">
                            {Math.round(completionPercent)}%
                        </span>
                        <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 tracking-tighter">Efficiency</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
