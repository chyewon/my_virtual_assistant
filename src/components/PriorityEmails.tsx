"use client";

import { useEffect, useState } from "react";
import EmailCard from "./EmailCard";
import EmailDetailModal from "./EmailDetailModal";
import EmailDetailInline from "./EmailDetailInline";

interface Email {
    id: string;
    subject: string;
    senderName: string;
    from: string;
    snippet: string;
    body: string;
    date: string;
    isPersonal?: boolean;
}

export default function PriorityEmails() {
    const [emails, setEmails] = useState<Email[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [activeCategory, setActiveCategory] = useState<string>("all");
    const [isCollapsed, setIsCollapsed] = useState(false);

    const fetchPriorityEmails = async (category = "all") => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/email/priority?category=${category}`);
            const data = await response.json();

            if (data.error) {
                setError(data.error);
            } else {
                setEmails(data.emails || []);
            }
        } catch (err) {
            setError("Failed to fetch emails");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPriorityEmails(activeCategory);
    }, [activeCategory]);

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

    const handleCategoryClick = (catId: string) => {
        setActiveCategory(catId);
        setSelectedIds(new Set());
        setSelectedEmail(null);
        setIsCollapsed(false);
    };

    const categories = [
        { id: "primary", icon: "👤", label: "Primary" },
        { id: "promotions", icon: "📢", label: "Promotions" },
        { id: "social", icon: "👥", label: "Social" },
        { id: "updates", icon: "🔔", label: "Updates" },
        { id: "all", icon: "🔄", label: "Return to All" },
    ];

    if (isLoading && emails.length === 0) {
        return <div className="p-4 text-xs text-white/40">Loading inbox...</div>;
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
                        <h3 className="text-sm font-semibold text-white/80">Inbox</h3>

                        {!isCollapsed && !selectedEmail && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {emails.length} Items
                            </span>
                        )}

                        <div className="flex items-center gap-1 ml-2">
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => handleCategoryClick(cat.id)}
                                    className={`p-1.5 rounded-lg transition-all text-sm group relative hover:bg-white/10 ${activeCategory === cat.id
                                        ? 'bg-indigo-500/20 shadow-lg shadow-indigo-500/10 border border-indigo-500/30'
                                        : 'border border-transparent'
                                        }`}
                                    title={cat.label}
                                >
                                    <span>{cat.icon}</span>
                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 border border-white/10 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                                        {cat.label}
                                    </span>
                                </button>
                            ))}
                        </div>
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
                            email={selectedEmail}
                            onClose={() => setSelectedEmail(null)}
                            onDelete={(id) => handleAction("delete", [id])}
                            onTag={(id) => handleAction("addLabel", [id])}
                        />
                    ) : emails.length === 0 ? (
                        <p className="p-4 text-xs text-white/40 italic">Your inbox is clean!</p>
                    ) : (
                        emails.map((email) => (
                            <EmailCard
                                key={email.id}
                                subject={email.subject}
                                sender={email.senderName || email.from}
                                snippet={email.snippet}
                                date={email.date}
                                isPersonal={email.isPersonal}
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
