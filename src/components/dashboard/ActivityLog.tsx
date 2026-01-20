"use client";

interface ActivityEntry {
    id: string;
    actor: "ai" | "user";
    action: string;
    timestamp: string;
    status: "success" | "warning" | "info";
}

const mockActivities: ActivityEntry[] = [
    { id: "1", actor: "ai", action: "Created task details for 3 events", timestamp: "9:15 AM", status: "success" },
    { id: "2", actor: "user", action: 'Completed "Team Sync"', timestamp: "10:05 AM", status: "success" },
    { id: "3", actor: "ai", action: "Sent 10-min reminder for Deep Work", timestamp: "9:50 AM", status: "info" },
    { id: "4", actor: "user", action: "Started planning session", timestamp: "9:00 AM", status: "info" },
    { id: "5", actor: "ai", action: "Good morning! Let's plan your day 📅", timestamp: "9:00 AM", status: "info" },
];

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
    const completedToday = 2;
    const totalToday = 5;
    const completedWeek = 15;
    const totalWeek = 28;

    const completionPercent = Math.round((completedToday / totalToday) * 100);

    return (
        <div className="h-full flex flex-col">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>📊</span> Activity Log
            </h2>

            {/* Activity Feed */}
            <div className="flex-1 space-y-3 overflow-y-auto mb-4">
                {mockActivities.map((activity) => {
                    const actor = actorConfig[activity.actor];
                    const statusColor = statusConfig[activity.status];

                    return (
                        <div
                            key={activity.id}
                            className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg"
                        >
                            <span className="text-lg">{actor.emoji}</span>
                            <div className="flex-1 min-w-0">
                                <p className={`text-sm ${statusColor}`}>
                                    <span className="font-medium">{actor.label}:</span> {activity.action}
                                </p>
                                <span className="text-xs text-slate-500">{activity.timestamp}</span>
                            </div>
                            {activity.status === "success" && (
                                <span className="text-green-400 text-sm">✓</span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Completion Metrics */}
            <div className="border-t border-slate-800 pt-4 space-y-4">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
                    Completion Rate
                </h3>

                {/* Today */}
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-300">Today</span>
                        <span className="text-white font-medium">
                            {completedToday}/{totalToday} ({completionPercent}%)
                        </span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                            style={{ width: `${completionPercent}%` }}
                        />
                    </div>
                </div>

                {/* This Week */}
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-300">This Week</span>
                        <span className="text-white font-medium">
                            {completedWeek}/{totalWeek} ({Math.round((completedWeek / totalWeek) * 100)}%)
                        </span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                            style={{ width: `${(completedWeek / totalWeek) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                        <span className="text-2xl font-bold text-indigo-400">🔥 3</span>
                        <p className="text-xs text-slate-400 mt-1">Day Streak</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                        <span className="text-2xl font-bold text-green-400">85%</span>
                        <p className="text-xs text-slate-400 mt-1">Weekly Avg</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
