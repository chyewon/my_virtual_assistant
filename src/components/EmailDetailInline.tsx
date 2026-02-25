"use client";

import React, { useState } from 'react';
import { useToast } from './Toast';

interface Email {
    id: string;
    subject: string;
    from: string;
    to?: string;
    cc?: string;
    bcc?: string;
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
    onAIDraft?: (id: string, userPrompt?: string) => void;
    onSaveEdit?: (id: string, data: { subject: string; to: string; cc: string; bcc: string; body: string }) => void;
    onSend?: (id: string, data: { subject: string; to: string; cc: string; bcc: string; body: string }) => void;
    onDiscardDraft?: (id: string) => void;
    onArchive?: (id: string) => void;
    onMarkUnread?: (id: string) => void;
    onEditingChange?: (isEditing: boolean) => void;
    onPopOut?: (data: { subject: string; to: string; cc: string; bcc: string; body: string }) => void;
    isDraft?: boolean;
    startInEditMode?: boolean;
}

// SVG Icons for action buttons
const Icons = {
    Archive: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="21 8 21 21 3 21 3 8" />
            <rect x="1" y="3" width="22" height="5" />
            <line x1="10" y1="12" x2="14" y2="12" />
        </svg>
    ),
    Delete: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
    ),
    Tag: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
    ),
    Unread: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
        </svg>
    ),
    Star: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    ),
    StarFilled: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    ),
    Reply: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 17 4 12 9 7" />
            <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
        </svg>
    ),
    ReplyAll: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="7 17 2 12 7 7" />
            <polyline points="12 17 7 12 12 7" />
            <path d="M22 18v-2a4 4 0 0 0-4-4H7" />
        </svg>
    ),
    Forward: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 17 20 12 15 7" />
            <path d="M4 18v-2a4 4 0 0 1 4-4h12" />
        </svg>
    ),
    AI: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    ),
    Send: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
    ),
    Discard: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
    ),
    Save: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
        </svg>
    ),
    PopOut: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
    ),
};

export default function EmailDetailInline({ email, onClose, onDelete, onTag, onAIDraft, onSaveEdit, onSend, onDiscardDraft, onArchive, onMarkUnread, onEditingChange, onPopOut, isDraft, startInEditMode }: EmailDetailInlineProps) {
    const [isEditing, setIsEditingState] = useState(startInEditMode || false);
    const [editSubject, setEditSubject] = useState("");
    const [editTo, setEditTo] = useState("");
    const [editCc, setEditCc] = useState("");
    const [editBcc, setEditBcc] = useState("");
    const [editBody, setEditBody] = useState("");
    const [aiPrompt, setAiPrompt] = useState("");
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [isStarred, setIsStarred] = useState(false);
    const { showToast } = useToast();

    // Wrapper to notify parent of editing state changes
    const setIsEditing = (value: boolean) => {
        setIsEditingState(value);
        onEditingChange?.(value);
    };

    // Auto-populate edit fields when starting in edit mode
    React.useEffect(() => {
        if (startInEditMode && email) {
            const plainText = email.body?.replace(/<[^>]*>/g, '').trim() || '';
            setEditSubject(email.subject || "");
            setEditTo(email.to || "");
            setEditCc(email.cc || "");
            setEditBcc(email.bcc || "");
            setEditBody(plainText);
            setIsEditingState(true);
            onEditingChange?.(true);
        }
    }, [startInEditMode, email, onEditingChange]);

    const safeEmailBody = React.useMemo(() => {
        if (!email?.body) return "";
        try {
            const parsed = new DOMParser().parseFromString(email.body, "text/html");
            return parsed.body.textContent || "";
        } catch {
            return email.body.replace(/<[^>]*>/g, "");
        }
    }, [email?.body]);

    if (!email) return null;

    const formattedDate = new Date(email.date).toLocaleString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const handleStartEdit = () => {
        if (isDraft) {
            const plainText = email.body.replace(/<[^>]*>/g, '').trim();
            setEditSubject(email.subject || "");
            setEditTo(email.to || "");
            setEditCc(email.cc || "");
            setEditBcc(email.bcc || "");
            setEditBody(plainText);
            setIsEditing(true);
        }
    };

    const handleSaveEdit = () => {
        if (onSaveEdit) {
            onSaveEdit(email.id, {
                subject: editSubject,
                to: editTo,
                cc: editCc,
                bcc: editBcc,
                body: editBody,
            });
        }
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
    };

    const handleSend = async () => {
        if (!editTo.trim()) {
            showToast("Please enter a recipient email address", "warning");
            return;
        }
        if (onSend) {
            onSend(email.id, {
                subject: editSubject,
                to: editTo,
                cc: editCc,
                bcc: editBcc,
                body: editBody,
            });
        }
    };

    const handleDiscardDraft = () => {
        if (confirm("Are you sure you want to discard this draft?")) {
            onDiscardDraft?.(email.id);
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
                    to: editTo,
                    subject: editSubject,
                    existingBody: editBody,
                }),
            });
            const data = await response.json();
            if (data.success) {
                setEditSubject(data.subject || editSubject);
                setEditBody(data.finalDraft || "");
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

    const handleReply = () => {
        setEditSubject(`Re: ${email.subject.replace(/^Re: /, "")}`);
        setEditTo(email.from);
        setEditCc("");
        setEditBcc("");

        const originalDate = new Date(email.date).toLocaleString();
        const quote = `\n\n\nOn ${originalDate}, ${email.senderName || email.from} wrote:\n> ${email.snippet}\n`;
        setEditBody(quote);

        setIsEditing(true);
    };

    const handleReplyAll = () => {
        setEditSubject(`Re: ${email.subject.replace(/^Re: /, "")}`);
        setEditTo(email.from); // Ideally merging with 'to' minus self
        setEditCc(email.cc || "");
        setEditBcc("");

        const originalDate = new Date(email.date).toLocaleString();
        const quote = `\n\n\nOn ${originalDate}, ${email.senderName || email.from} wrote:\n> ${email.snippet}\n`;
        setEditBody(quote);

        setIsEditing(true);
    };

    const handleForward = () => {
        setEditSubject(`Fwd: ${email.subject.replace(/^Fwd: /, "")}`);
        setEditTo("");
        setEditCc("");
        setEditBcc("");

        const originalDate = new Date(email.date).toLocaleString();
        const header = `\n\n---------- Forwarded message ---------\nFrom: ${email.from}\nDate: ${originalDate}\nSubject: ${email.subject}\nTo: ${email.to || ""}\n\n`;
        setEditBody(header + (email.body.replace(/<[^>]*>/g, '').trim()));

        setIsEditing(true);
    };

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
                        <ActionButton
                            Icon={Icons.Archive}
                            label="Archive"
                            onClick={() => onArchive?.(email.id)}
                            color="text-white/60 hover:text-blue-400"
                        />
                        <ActionButton
                            Icon={Icons.Delete}
                            label="Delete"
                            onClick={() => onDelete(email.id)}
                            color="text-white/60 hover:text-red-400"
                        />
                        <ActionButton
                            Icon={Icons.Tag}
                            label="Add label"
                            onClick={() => onTag(email.id)}
                            color="text-white/60 hover:text-green-400"
                        />
                        <ActionButton
                            Icon={Icons.Unread}
                            label="Mark as unread"
                            onClick={() => onMarkUnread?.(email.id)}
                            color="text-white/60 hover:text-purple-400"
                        />
                        <ActionButton
                            Icon={isStarred ? Icons.StarFilled : Icons.Star}
                            label={isStarred ? "Unstar" : "Star"}
                            onClick={() => setIsStarred(!isStarred)}
                            color={isStarred ? "text-yellow-400" : "text-white/60 hover:text-yellow-400"}
                        />
                    </div>
                </div>
                {/* Pop-out button - shown when editing in inline view */}
                {isEditing && onPopOut && (
                    <button
                        onClick={() => onPopOut({
                            subject: editSubject,
                            to: editTo,
                            cc: editCc,
                            bcc: editBcc,
                            body: editBody,
                        })}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-indigo-400 group relative"
                        title="Pop out"
                    >
                        <Icons.PopOut />
                        {/* Tooltip */}
                        <span className="absolute top-full right-0 mt-2 px-2.5 py-1 bg-slate-800 text-[11px] font-medium text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-50 pointer-events-none shadow-lg border border-white/10 scale-90 group-hover:scale-100">
                            Pop out
                            <span className="absolute bottom-full right-2 mb-[-1px] border-4 border-transparent border-b-slate-800" />
                        </span>
                    </button>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="max-w-4xl mx-auto">
                    {/* Subject - Editable for drafts */}
                    {isEditing ? (
                        <input
                            type="text"
                            value={editSubject}
                            onChange={(e) => setEditSubject(e.target.value)}
                            placeholder="Subject"
                            className="w-full text-2xl font-bold text-white bg-transparent border-b border-white/20 focus:border-indigo-500 focus:outline-none pb-2 mb-6 placeholder-white/30"
                        />
                    ) : (
                        <h2 className="text-2xl font-bold text-white mb-6">
                            {email.subject || "(No Subject)"}
                        </h2>
                    )}

                    {/* Email Fields - Gmail style for drafts in edit mode */}
                    {isEditing ? (
                        <div className="space-y-3 mb-6 pb-6 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-white/50 w-12">To</span>
                                <input
                                    type="email"
                                    value={editTo}
                                    onChange={(e) => setEditTo(e.target.value)}
                                    placeholder="recipient@example.com"
                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-white/50 w-12">Cc</span>
                                <input
                                    type="email"
                                    value={editCc}
                                    onChange={(e) => setEditCc(e.target.value)}
                                    placeholder="cc@example.com"
                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-white/50 w-12">Bcc</span>
                                <input
                                    type="email"
                                    value={editBcc}
                                    onChange={(e) => setEditBcc(e.target.value)}
                                    placeholder="bcc@example.com"
                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    ) : (
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
                    )}

                    {isEditing ? (
                        <>
                            {/* Edit mode action buttons - matching compose page style */}
                            <div className="flex items-center gap-2 mb-4">
                                <button
                                    onClick={handleSend}
                                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors text-white shadow-lg shadow-indigo-500/20"
                                >
                                    <Icons.Send />
                                    Send
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors text-white/80 hover:text-white"
                                >
                                    <Icons.Save />
                                    Save Draft
                                </button>
                                <div className="flex-1" />
                                <button
                                    onClick={handleDiscardDraft}
                                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                >
                                    <Icons.Discard />
                                    Discard
                                </button>
                            </div>

                            {/* AI Prompt - separate section matching compose page */}
                            <div className="flex items-center gap-2 p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg mb-4">
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

                            {/* Email Body textarea */}
                            <textarea
                                value={editBody}
                                onChange={(e) => setEditBody(e.target.value)}
                                placeholder="Compose your email..."
                                className="w-full h-80 bg-white/[0.03] border border-white/10 rounded-xl p-6 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                autoFocus
                            />
                        </>
                    ) : (
                        <>
                            {/* View mode - Quick Actions Bar */}
                            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
                                <QuickActionButton Icon={Icons.Reply} label="Reply" onClick={handleReply} />
                                <QuickActionButton Icon={Icons.ReplyAll} label="Reply All" onClick={handleReplyAll} />
                                <QuickActionButton Icon={Icons.Forward} label="Forward" onClick={handleForward} />
                                <div className="w-px h-6 bg-white/10 mx-1" />
                                <QuickActionButton
                                    Icon={Icons.AI}
                                    label="AI Draft"
                                    onClick={() => onAIDraft?.(email.id)}
                                    highlight
                                />
                            </div>

                            {/* Email Body - View mode */}
                            <div
                                className={`bg-white/[0.03] border border-white/10 rounded-xl p-6 text-slate-100 leading-relaxed overflow-x-auto min-h-[300px] shadow-inner font-sans ${isDraft ? 'cursor-pointer hover:border-indigo-500/30' : ''}`}
                                onDoubleClick={handleStartEdit}
                                title={isDraft ? "Double-click to edit" : undefined}
                            >
                                {email.body ? (
                                    <pre className="email-body-content text-sm whitespace-pre-wrap break-words font-sans">
                                        {safeEmailBody}
                                    </pre>
                                ) : (
                                    <p className="italic text-white/30">{isDraft ? "Double-click to compose..." : "This message has no content."}</p>
                                )}
                            </div>
                        </>
                    )}
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

function ActionButton({ Icon, label, onClick, color = "text-white/60 hover:text-white" }: {
    Icon: React.FC;
    label: string;
    onClick?: () => void;
    color?: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`p-2 hover:bg-white/10 rounded-lg transition-colors group relative ${color}`}
        >
            <Icon />
            {/* Enhanced tooltip */}
            <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 bg-slate-800 text-[11px] font-medium text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-50 pointer-events-none shadow-lg border border-white/10 scale-90 group-hover:scale-100">
                {label}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-[-1px] border-4 border-transparent border-b-slate-800" />
            </span>
        </button>
    );
}

function QuickActionButton({ Icon, label, onClick, highlight, primary, danger, disabled }: {
    Icon: React.FC;
    label: string;
    onClick?: () => void;
    highlight?: boolean;
    primary?: boolean;
    danger?: boolean;
    disabled?: boolean;
}) {
    const baseClass = "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-medium group relative";

    let variantClass = "bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white";

    if (primary) {
        variantClass = "bg-indigo-500 hover:bg-indigo-600 border border-indigo-400/30 text-white shadow-lg shadow-indigo-500/20";
    } else if (highlight) {
        variantClass = "bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 border border-purple-500/30 text-purple-300 hover:text-purple-200";
    } else if (danger) {
        variantClass = "bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300";
    }

    if (disabled) {
        variantClass += " opacity-50 cursor-not-allowed";
    }

    return (
        <button
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            className={`${baseClass} ${variantClass}`}
        >
            <Icon />
            <span>{label}</span>
            {/* Enhanced tooltip */}
            <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 bg-slate-800 text-[11px] font-medium text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-50 pointer-events-none shadow-lg border border-white/10 scale-90 group-hover:scale-100">
                {label}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-[-1px] border-4 border-transparent border-b-slate-800" />
            </span>
        </button>
    );
}
