"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      router.push("/dashboard");
    }
  }, [session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-indigo-400">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Hero Section */}
      <div className="text-center max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/30">
            <span className="text-4xl">🤖</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent mb-4">
            Your AI Executive Assistant
          </h1>
          <p className="text-lg text-slate-400 max-w-md mx-auto">
            Plan your day with AI, stay accountable, and achieve more with a supportive tutor-like coach.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 text-left">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="text-2xl mb-2">📅</div>
            <h3 className="font-semibold text-white mb-1">Priority Planner</h3>
            <p className="text-sm text-slate-400">Daily 9AM planning session with your AI coach</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="text-2xl mb-2">🔔</div>
            <h3 className="font-semibold text-white mb-1">Accountability</h3>
            <p className="text-sm text-slate-400">Smart nudges before & after each task</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="text-2xl mb-2">📊</div>
            <h3 className="font-semibold text-white mb-1">Track Progress</h3>
            <p className="text-sm text-slate-400">Completion metrics and daily retros</p>
          </div>
        </div>

        {/* Login Button */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="inline-flex items-center gap-3 bg-white text-slate-900 font-semibold px-8 py-4 rounded-xl hover:bg-slate-100 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-100"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <p className="mt-6 text-sm text-slate-500">
          Requires access to Google Calendar for scheduling
        </p>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 text-sm text-slate-600">
        Powered by GPT-4o & Gemini
      </footer>
    </main>
  );
}
