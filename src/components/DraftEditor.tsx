"use client";

import React, { useState } from 'react';

interface Draft {
    id: string;
    messageId?: string;
    subject: string;
    to: string;
    body: string;
    date: string;
}

interface DraftEditorProps {
    draft: Draft;
    onSave: (updatedDraft: { to: string; subject: string; body: string }) => Promise<void>;
    onClose: () => void;
    onDelete: () => void;
}

export default function DraftEditor({ draft, onSave, onClose, onDelete }: DraftEditorProps) {
    const [to, setTo] = useState(draft.to || "");
    const [subject, setSubject] = useState(draft.subject || "");
    const [body, setBody] = useState(draft.body || "");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave({ to, subject, body });
        } finally {
            setIsSaving(false);
        }
    };

    // Strip HTML tags for editing
    const cleanBody = body.replace(/<[^>]*>/g, '').trim();

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-900 overflow-hidden animate-in fade-in duration-300">
            {/* Header */}
            <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 rounded-lg transition-colors text-white/60 hover:text-white"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="text-sm font-medium">Back</span>
                    </button>
                    <span className="text-sm text-white/60">Editing Draft</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onDelete}
                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 transition-colors"
                    >
                        🗑️ Delete
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-xs font-bold text-white transition-colors disabled:opacity-50"
                    >
                        {isSaving ? "Saving..." : "💾 Save Draft"}
                    </button>
                </div>
            </div>

            {/* Editor Form */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="max-w-4xl mx-auto space-y-4">
                    {/* To Field */}
                    <div>
                        <label className="block text-xs font-medium text-white/50 mb-1.5">To</label>
                        <input
                            type="email"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            placeholder="recipient@example.com"
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                        />
                    </div>

                    {/* Subject Field */}
                    <div>
                        <label className="block text-xs font-medium text-white/50 mb-1.5">Subject</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Email subject"
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                        />
                    </div>

                    {/* Body Field */}
                    <div>
                        <label className="block text-xs font-medium text-white/50 mb-1.5">Message</label>
                        <textarea
                            value={cleanBody}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Write your message..."
                            rows={15}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all resize-none leading-relaxed"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
