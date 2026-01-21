"use client";

import { useEffect, useState } from "react";
import EmailCard from "./EmailCard";
import EmailDetailInline from "./EmailDetailInline";

interface SentEmail {
    id: string;
    subject: string;
    to: string;
    from: string;
    snippet: string;
    body: string;
    date: string;
}

export default function SentEmails() {
    const [emails, setEmails] = useState<SentEmail[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedEmail, setSelectedEmail] = useState<SentEmail | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isCollapsed, setIsCollapsed] = useState(false);

    const fetchSentEmails = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/email/sent");
            const data = await response.json();

            if (data.error) {
                setError(data.error);
            } else {
                setEmails(data.emails || []);
            }
        } catch (err) {
            setError("Failed to fetch sent emails");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSentEmails();
    }, []);

    const handleAction = async (action: string, messageIds: string[]) => {
        try {
            const response = await fetch("/api/email/actions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messageIds, action }),
            });
            const data = await response.json();
            if (data.success) {
                setEmails(prev => prev.filter(e => !messageIds.includes(e.id)));
                setSelectedIds(new Set());
                if (selectedEmail && messageIds.includes(selectedEmail.id)) {
                    setSelectedEmail(null);
                }
            }
        } catch (err) {
            console.error("Action failed:", err);
        }
    };

    const toggleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(emails.map(e => e.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const toggleSelect = (id: string, checked: boolean) => {
        const next = new Set(selectedIds);
        if (checked) next.add(id);
        else next.delete(id);
        setSelectedIds(next);
    };

    if (isLoading && emails.length === 0) {
        return <div className="p-4 text-xs text-white/40">Loading sent...</div>;
    }

    if (error && emails.length === 0) {
        return <div className="p-4 text-xs text-red-400/60">Error: {error}</div>;
    }

    return (
        <div className={`flex flex-col bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden relative transition-all duration-300 ${isCollapsed ? 'h-[52px]' : 'h-full'}`}>
            <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    {!isCollapsed && !selectedEmail && (
                        <input
                            type="checkbox"
                            checked={emails.length > 0 && selectedIds.size === emails.length}
                            onChange={(e) => toggleSelectAll(e.target.checked)}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer"
                        />
                    )}
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white/80">Sent Today</h3>
                        {!isCollapsed && !selectedEmail && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                                {emails.length} Items
                            </span>
                        )}
                    </div>
                </div>

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white"
                    title={isCollapsed ? "Expand" : "Collapse"}
                >
                    <span className={`text-xs transition-transform duration-200 block ${isCollapsed ? '-rotate-90' : ''}`}>
                        ▼
                    </span>
                </button>
            </div>

            {!isCollapsed && selectedIds.size > 0 && !selectedEmail && (
                <div className="absolute top-12 left-0 right-0 z-10 px-4 py-2 bg-indigo-600 flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-200">
                    <span className="text-xs font-bold text-white">{selectedIds.size} selected</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleAction("addLabel", Array.from(selectedIds))}
                            className="p-1 px-2 hover:bg-white/10 rounded text-xs text-white border border-white/20"
                        >
                            🏷️ Tag
                        </button>
                        <button
                            onClick={() => handleAction("delete", Array.from(selectedIds))}
                            className="p-1 px-2 hover:bg-white/10 rounded text-xs text-white border border-white/20"
                        >
                            🗑️ Delete
                        </button>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="text-xs text-white/60 hover:text-white ml-2"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {!isCollapsed && (
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {selectedEmail ? (
                        <EmailDetailInline
                            email={{ ...selectedEmail, from: 'me' }}
                            onClose={() => setSelectedEmail(null)}
                            onDelete={(id) => handleAction("delete", [id])}
                            onTag={(id) => handleAction("addLabel", [id])}
                        />
                    ) : emails.length === 0 ? (
                        <p className="p-4 text-xs text-white/40 italic">No sent emails found.</p>
                    ) : (
                        emails.map((email) => (
                            <EmailCard
                                key={email.id}
                                subject={email.subject}
                                recipient={email.to}
                                snippet={email.snippet}
                                date={email.date}
                                onDoubleClick={() => setSelectedEmail(email)}
                                isSelected={selectedIds.has(email.id)}
                                onSelect={(checked) => toggleSelect(email.id, checked)}
                                onDelete={() => handleAction("delete", [email.id])}
                                onTag={() => handleAction("addLabel", [email.id])}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
