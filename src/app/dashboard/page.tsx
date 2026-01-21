"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import WeeklyCalendar from "@/components/dashboard/WeeklyCalendar";
import TodaysTasks from "@/components/dashboard/TodaysTasks";
import ActivityLog from "@/components/dashboard/ActivityLog";
import TaskTable from "@/components/dashboard/TaskTable";
import PriorityEmails from "@/components/PriorityEmails";
import SentEmails from "@/components/SentEmails";

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [aiCostUsed, setAiCostUsed] = useState(2.34);
    const [visibleColumns, setVisibleColumns] = useState<string[]>(["calendar", "tasks"]);
    const userImage = session?.user?.image;

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/");
        }
    }, [status, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="animate-pulse text-indigo-400">Loading dashboard...</div>
            </div>
        );
    }

    if (!session) {
        return null;
    }

    const getCostColor = () => {
        if (aiCostUsed < 7) return "text-green-400";
        if (aiCostUsed < 9) return "text-yellow-400";
        return "text-red-400";
    };

    const toggleColumn = (id: string) => {
        if (visibleColumns.includes(id)) {
            // If already visible and there are more than 2, maybe allow hiding?
            // But user asked for 50/50 split, implying exactly two.
            // If it's already visible, do nothing or swap positions.
            return;
        }

        // Add the new one to the end and keep only last two
        setVisibleColumns(prev => [prev[1], id]);
    };

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col">
            {/* Top Navigation Bar */}
            <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 px-4 py-3 sticky top-0 z-50">
                <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <span className="text-lg">🤖</span>
                        </div>
                        <span className="font-semibold text-white">Virtual Assistant</span>
                    </div>

                    <div className="flex items-center gap-6">
                        {/* AI Budget Tracker */}
                        <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg">
                            <span className="text-xs text-slate-400">AI Budget:</span>
                            <span className={`font-mono font-medium ${getCostColor()}`}>
                                ${aiCostUsed.toFixed(2)}
                            </span>
                            <span className="text-xs text-slate-500">/ $10.00</span>
                        </div>

                        {/* Settings */}
                        <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>

                        {/* User Profile */}
                        <div className="flex items-center gap-2">
                            {userImage ? (
                                <Image
                                    src={userImage}
                                    alt={session.user?.name || "User"}
                                    width={32}
                                    height={32}
                                    className="rounded-full border border-slate-700"
                                />
                            ) : null}
                            <button
                                onClick={() => signOut({ callbackUrl: "/" })}
                                className="text-sm text-slate-400 hover:text-white transition-colors"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar Navigation */}
                <aside className="w-16 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-6 gap-6">
                    <button
                        onClick={() => toggleColumn("calendar")}
                        className={`p-3 rounded-xl transition-all ${visibleColumns.includes("calendar") ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
                        title="Calendar"
                    >
                        <span className="text-xl">📅</span>
                    </button>
                    <button
                        onClick={() => toggleColumn("tasks")}
                        className={`p-3 rounded-xl transition-all ${visibleColumns.includes("tasks") ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
                        title="Daily Tasks"
                    >
                        <span className="text-xl">📋</span>
                    </button>
                    <button
                        onClick={() => toggleColumn("activity")}
                        className={`p-3 rounded-xl transition-all ${visibleColumns.includes("activity") ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
                        title="Activity Log"
                    >
                        <span className="text-xl">📊</span>
                    </button>
                    <button
                        onClick={() => toggleColumn("emails")}
                        className={`p-3 rounded-xl transition-all ${visibleColumns.includes("emails") ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
                        title="Emails"
                    >
                        <span className="text-xl">📧</span>
                    </button>
                </aside>

                {/* Main Dashboard Area */}
                <main className="flex-1 p-4 overflow-hidden">
                    <div className="grid grid-cols-4 gap-4 h-full">
                        {visibleColumns.map((colId) => {
                            const isEmails = colId === "emails";
                            const hasEmails = visibleColumns.includes("emails");

                            // If emails is visible, it takes 3/4 (grid-cols-4 and col-span-3)
                            // The other column takes 1/4 (col-span-1)
                            // If emails is NOT visible, it's a 2/2 split (col-span-2)
                            const colSpan = hasEmails
                                ? (isEmails ? "col-span-3" : "col-span-1")
                                : "col-span-2";

                            return (
                                <div key={colId} className={`${colSpan} bg-slate-900/50 border border-slate-800 rounded-xl p-4 overflow-hidden flex flex-col transition-all duration-300`}>
                                    {colId === "calendar" && (
                                        <div className="flex-1 overflow-y-auto">
                                            <WeeklyCalendar />
                                        </div>
                                    )}
                                    {colId === "tasks" && (
                                        <div className="flex-1 overflow-y-auto">
                                            <TodaysTasks expanded={true} />
                                        </div>
                                    )}
                                    {colId === "activity" && (
                                        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                                            <div className="flex-1 overflow-y-auto min-h-0">
                                                <ActivityLog />
                                            </div>
                                            <div className="flex-1 overflow-y-auto min-h-0 border-t border-slate-800 pt-4">
                                                <TaskTable />
                                            </div>
                                        </div>
                                    )}
                                    {colId === "emails" && (
                                        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                                            <div className="flex-1 min-h-0">
                                                <PriorityEmails />
                                            </div>
                                            <div className="flex-1 min-h-0">
                                                <SentEmails />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </main>
            </div>
        </div>
    );
}
