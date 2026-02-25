"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/Toast";

// SVG Icons
const Icons = {
    Send: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
    ),
    Save: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
        </svg>
    ),
    Discard: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
    ),
    AI: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    ),
};

function ComposeForm() {
    const searchParams = useSearchParams();
    const { showToast } = useToast();

    const [subject, setSubject] = useState("");
    const [to, setTo] = useState("");
    const [cc, setCc] = useState("");
    const [bcc, setBcc] = useState("");
    const [body, setBody] = useState("");
    const [aiPrompt, setAiPrompt] = useState("");
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // Load initial values from URL params
    useEffect(() => {
        const draftKey = searchParams.get("draftKey");
        if (draftKey) {
            try {
                const savedDraft = localStorage.getItem(draftKey);
                if (savedDraft) {
                    const parsed = JSON.parse(savedDraft) as {
                        subject?: string;
                        to?: string;
                        cc?: string;
                        bcc?: string;
                        body?: string;
                    };
                    setSubject(parsed.subject || "");
                    setTo(parsed.to || "");
                    setCc(parsed.cc || "");
                    setBcc(parsed.bcc || "");
                    setBody(parsed.body || "");
                    localStorage.removeItem(draftKey);
                    return;
                }
            } catch {
                // Fall back to query params if localStorage is unavailable.
            }
        }

        setSubject(searchParams.get("subject") || "");
        setTo(searchParams.get("to") || "");
        setCc(searchParams.get("cc") || "");
        setBcc(searchParams.get("bcc") || "");
        setBody("");
    }, [searchParams]);

    const handleSend = async () => {
        if (!to.trim()) {
            showToast("Please enter a recipient email address", "warning");
            return;
        }
        setIsSending(true);
        try {
            const response = await fetch("/api/email/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to, cc, bcc, subject, body }),
            });
            const result = await response.json();
            if (result.success) {
                showToast("Email sent", "success");
                setTimeout(() => window.close(), 1500);
            } else {
                showToast(result.error || "Failed to send email", "error");
            }
        } catch (err) {
            console.error("Send failed:", err);
            showToast("Failed to send email", "error");
        } finally {
            setIsSending(false);
        }
    };

    const handleSaveDraft = async () => {
        try {
            const response = await fetch("/api/email/drafts/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to, cc, bcc, subject, body }),
            });
            const result = await response.json();
            if (result.success) {
                showToast("Draft saved", "success");
                setTimeout(() => window.close(), 1500);
            } else {
                showToast(result.error || "Failed to save draft", "error");
            }
        } catch (err) {
            console.error("Save draft failed:", err);
            showToast("Failed to save draft", "error");
        }
    };

    const handleDiscard = () => {
        if (confirm("Are you sure you want to discard this draft?")) {
            window.close();
        }
    };

    const handleGenerateAIDraft = async () => {
        if (!aiPrompt.trim()) {
            showToast("Please enter a prompt for the AI", "warning");
            return;
        }
        setIsGeneratingAI(true);
        try {
            const response = await fetch("/api/email/ai-draft/compose", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: aiPrompt,
                    to,
                    subject,
                    existingBody: body,
                }),
            });
            const data = await response.json();
            if (data.success) {
                setSubject(data.subject || subject);
                setBody(data.finalDraft || "");
                setAiPrompt("");
                showToast("AI draft generated", "success");
            } else {
                showToast(data.error || "Failed to generate AI draft", "error");
            }
        } catch (err) {
            console.error("AI Draft failed:", err);
            showToast("Failed to generate AI draft", "error");
        } finally {
            setIsGeneratingAI(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                <h1 className="text-lg font-semibold">New Message</h1>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSend}
                        disabled={isSending}
                        className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                        <Icons.Send />
                        {isSending ? "Sending..." : "Send"}
                    </button>
                    <button
                        onClick={handleSaveDraft}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                        <Icons.Save />
                        Save Draft
                    </button>
                    <button
                        onClick={handleDiscard}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                    >
                        <Icons.Discard />
                        Discard
                    </button>
                </div>
            </div>

            {/* Form */}
            <div className="flex-1 p-6 overflow-y-auto">
                <div className="max-w-3xl mx-auto space-y-4">
                    {/* To */}
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-white/50 w-12">To</span>
                        <input
                            type="email"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            placeholder="recipient@example.com"
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Cc */}
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-white/50 w-12">Cc</span>
                        <input
                            type="email"
                            value={cc}
                            onChange={(e) => setCc(e.target.value)}
                            placeholder="cc@example.com"
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Bcc */}
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-white/50 w-12">Bcc</span>
                        <input
                            type="email"
                            value={bcc}
                            onChange={(e) => setBcc(e.target.value)}
                            placeholder="bcc@example.com"
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Subject */}
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-white/50 w-12">Subject</span>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Email subject"
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    {/* AI Prompt */}
                    <div className="flex items-center gap-2 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg">
                        <span className="text-purple-400">✨</span>
                        <input
                            type="text"
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="Describe what you want AI to write... (e.g., 'a professional follow-up email')"
                            className="flex-1 bg-transparent border-none text-sm text-white placeholder-white/40 focus:outline-none"
                            onKeyDown={(e) => e.key === 'Enter' && handleGenerateAIDraft()}
                            disabled={isGeneratingAI}
                        />
                        <button
                            onClick={handleGenerateAIDraft}
                            disabled={isGeneratingAI || !aiPrompt.trim()}
                            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2"
                        >
                            <Icons.AI />
                            {isGeneratingAI ? "Generating..." : "Generate"}
                        </button>
                    </div>

                    {/* Body */}
                    <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Compose your email..."
                        className="w-full h-80 bg-white/[0.03] border border-white/10 rounded-xl p-6 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        autoFocus
                    />
                </div>
            </div>
        </div>
    );
}

export default function ComposePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
                <div className="text-white/60">Loading...</div>
            </div>
        }>
            <ComposeForm />
        </Suspense>
    );
}
