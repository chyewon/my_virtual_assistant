"use client";

import React from 'react';

interface Email {
    id: string;
    subject: string;
    from: string;
    to?: string;
    senderName?: string;
    snippet: string;
    body: string;
    date: string;
}

interface EmailDetailInlineProps {
    email: Email | null;
    onClose: () => void;
    onDelete: (id: string) => void;
    onTag: (id: string) => void;
}

export default function EmailDetailInline({ email, onClose, onDelete, onTag }: EmailDetailInlineProps) {
    if (!email) return null;

    const formattedDate = new Date(email.date).toLocaleString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-900 overflow-hidden animate-in fade-in duration-300">
            {/* Action Bar */}
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
                    <div className="w-px h-6 bg-white/10 mx-2" />
                    <div className="flex items-center gap-1">
                        <ActionButton icon="📥" label="Archive" />
                        <ActionButton icon="🗑️" label="Delete" onClick={() => onDelete(email.id)} />
                        <ActionButton icon="🏷️" label="Tag" onClick={() => onTag(email.id)} />
                        <ActionButton icon="✉️" label="Unread" />
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold text-white mb-6">
                        {email.subject}
                    </h2>

                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white shadow-lg shadow-indigo-500/30">
                                {email.senderName?.[0] || email.from[0]}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-white">{email.senderName || email.from}</span>
                                    <span className="text-xs text-white/40">&lt;{email.from}&gt;</span>
                                </div>
                                <div className="text-xs text-white/40">
                                    to {email.to || 'me'}
                                </div>
                            </div>
                        </div>
                        <div className="text-xs text-white/40 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                            {formattedDate}
                        </div>
                    </div>

                    {/* Email Body */}
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 text-slate-100 leading-relaxed overflow-x-auto min-h-[300px] shadow-inner font-sans">
                        {email.body ? (
                            <div
                                className="email-body-content text-sm"
                                dangerouslySetInnerHTML={{ __html: email.body }}
                            />
                        ) : (
                            <p className="italic text-white/30">This message has no content.</p>
                        )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-8 flex gap-3 pb-8">
                        <SecondaryButton icon="↩️" label="Reply" />
                        <SecondaryButton icon="➡️" label="Forward" />
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .email-body-content a { color: #818cf8; text-decoration: underline; font-weight: 500; }
                .email-body-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 1rem 0; }
                .email-body-content { color: rgba(255, 255, 255, 0.9); }
                .email-body-content blockquote { border-left: 3px solid rgba(129, 140, 248, 0.5); padding-left: 1rem; margin: 1rem 0; color: rgba(255, 255, 255, 0.6); font-style: italic; }
                .email-body-content p { margin-bottom: 1rem; }
                .email-body-content ul, .email-body-content ol { margin-bottom: 1rem; padding-left: 1.25rem; }
            `}</style>
        </div>
    );
}

function ActionButton({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors group relative"
            title={label}
        >
            <span className="text-lg">{icon}</span>
        </button>
    );
}

function SecondaryButton({ icon, label }: { icon: string; label: string }) {
    return (
        <button className="px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all flex items-center gap-2 text-xs font-semibold text-white/90 hover:text-white">
            <span className="text-base">{icon}</span>
            {label}
        </button>
    );
}
