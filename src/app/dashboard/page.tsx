"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import WeeklyCalendar from "@/components/dashboard/WeeklyCalendar";
import TodaysTasks from "@/components/dashboard/TodaysTasks";
import ActivityLog from "@/components/dashboard/ActivityLog";

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [aiCostUsed, setAiCostUsed] = useState(2.34);
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
                                    alt={session.user.name || "User"}
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

            {/* Main 3-Column Dashboard - 2:1:1 ratio */}
            <main className="flex-1 p-4 max-w-screen-2xl mx-auto w-full">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-5rem)]">
                    {/* LEFT COLUMN - Weekly Calendar (50%) */}
                    <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-4 overflow-y-auto">
                        <WeeklyCalendar />
                    </div>

                    {/* MIDDLE COLUMN - Today's To-Do (25%) */}
                    <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 rounded-xl p-4 overflow-y-auto">
                        <TodaysTasks />
                    </div>

                    {/* RIGHT COLUMN - Activity Log (25%) */}
                    <div className="lg:col-span-1 bg-slate-900/50 border border-slate-800 rounded-xl p-4 overflow-y-auto">
                        <ActivityLog />
                    </div>
                </div>
            </main>
        </div>
    );
}
