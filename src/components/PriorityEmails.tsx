"use client";

import { useEffect, useState, useMemo } from "react";
import EmailCard from "./EmailCard";
import EmailDetailInline from "./EmailDetailInline";
import { useToast } from "./Toast";
import { SearchInput } from "./search/SearchInput";
import { useDebounce } from "@/hooks/useDebounce";

interface Email {
    id: string;
    subject: string;
    senderName: string;
    from: string;
    to?: string;
    cc?: string;
    bcc?: string;
    snippet: string;
    body: string;
    date: string;
    isPersonal?: boolean;
}

// SVG Icons for email categories - using filled shapes for better visibility
const CategoryIcons = {
    Primary: () => (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="7" r="4"/>
            <path d="M12 14c-4.42 0-8 2.69-8 6v1h16v-1c0-3.31-3.58-6-8-6z"/>
        </svg>
    ),
    Promotions: () => (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/>
        </svg>
    ),
    Social: () => (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
        </svg>
    ),
    Updates: () => (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
        </svg>
    ),
    All: () => (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
        </svg>
    ),
};

export default function PriorityEmails() {
    const [emails, setEmails] = useState<Email[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [activeCategory, setActiveCategory] = useState<string>("all");
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isAIDrafting, setIsAIDrafting] = useState<string | null>(null);
    const [isEmailEditing, setIsEmailEditing] = useState(false);
    const [isComposing, setIsComposing] = useState(false);
    const [composeEmail, setComposeEmail] = useState<Email | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 200);
    const { showToast, showConfirm } = useToast();

    const filteredEmails = useMemo(() => {
        if (!debouncedSearch) return emails;
        const query = debouncedSearch.toLowerCase();
        return emails.filter(email =>
            email.subject?.toLowerCase().includes(query) ||
            email.senderName?.toLowerCase().includes(query) ||
            email.from?.toLowerCase().includes(query) ||
            email.snippet?.toLowerCase().includes(query)
        );
    }, [emails, debouncedSearch]);

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
        setIsComposing(false);
        setComposeEmail(null);
        setIsCollapsed(false);
    };

    const handleCompose = () => {
        // Create a new empty email for composing
        const newEmail: Email = {
            id: "new-compose-" + Date.now(),
            subject: "",
            senderName: "me",
            from: "me",
            to: "",
            snippet: "",
            body: "",
            date: new Date().toISOString(),
        };
        setComposeEmail(newEmail);
        setIsComposing(true);
        setSelectedEmail(null);
        setIsEmailEditing(true);
        setIsCollapsed(false);
    };

    const handleSaveCompose = async (emailId: string, data: { subject: string; to: string; cc: string; bcc: string; body: string }) => {
        try {
            const response = await fetch("/api/email/drafts/update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: data.to,
                    cc: data.cc,
                    bcc: data.bcc,
                    subject: data.subject,
                    body: data.body,
                }),
            });
            const result = await response.json();
            if (result.success) {
                showToast("Draft saved", "success");
                setIsComposing(false);
                setComposeEmail(null);
                setIsEmailEditing(false);
            } else {
                showToast(result.error || "Failed to save draft", "error");
            }
        } catch (err) {
            console.error("Save draft failed:", err);
            showToast("Failed to save draft", "error");
        }
    };

    const handleSendCompose = async (emailId: string, data: { subject: string; to: string; cc: string; bcc: string; body: string }) => {
        try {
            const response = await fetch("/api/email/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: data.to,
                    cc: data.cc,
                    bcc: data.bcc,
                    subject: data.subject,
                    body: data.body,
                }),
            });
            const result = await response.json();
            if (result.success) {
                showToast("Email sent", "success");
                setIsComposing(false);
                setComposeEmail(null);
                setIsEmailEditing(false);
            } else {
                showToast(result.error || "Failed to send email", "error");
            }
        } catch (err) {
            console.error("Send failed:", err);
            showToast("Failed to send email", "error");
        }
    };

    const handleDiscardCompose = () => {
        setIsComposing(false);
        setComposeEmail(null);
        setIsEmailEditing(false);
    };

    const handlePopOutCompose = (data?: { subject: string; to: string; cc: string; bcc: string; body: string }) => {
        let composeUrl = "/compose";
        if (data) {
            try {
                const draftKey = `compose-draft-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
                localStorage.setItem(draftKey, JSON.stringify(data));
                composeUrl = `/compose?draftKey=${encodeURIComponent(draftKey)}`;
            } catch {
                const params = new URLSearchParams();
                if (data.subject) params.set("subject", data.subject);
                if (data.to) params.set("to", data.to);
                if (data.cc) params.set("cc", data.cc);
                if (data.bcc) params.set("bcc", data.bcc);
                composeUrl = `/compose?${params.toString()}`;
            }
        }

        // Open in new popup window
        const width = 700;
        const height = 600;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        window.open(
            composeUrl,
            "compose",
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );

        // Close the inline compose
        setIsComposing(false);
        setComposeEmail(null);
        setIsEmailEditing(false);
    };

    const handleAIDraft = async (email: Email, userPrompt?: string) => {
        setIsAIDrafting(email.id);
        try {
            const response = await fetch("/api/email/ai-draft", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    emailId: email.id,
                    subject: email.subject,
                    from: email.from,
                    body: email.body,
                    userPrompt: userPrompt,
                }),
            });
            const data = await response.json();
            if (data.success) {
                showToast("AI Draft created and saved to Drafts", "success");
            } else {
                showToast(data.error || "Failed to create AI draft", "error");
            }
        } catch (err) {
            console.error("AI Draft failed:", err);
            showToast("Failed to create AI draft", "error");
        } finally {
            setIsAIDrafting(null);
        }
    };

    const categories = [
        { id: "primary", Icon: CategoryIcons.Primary, label: "Primary", color: "bg-blue-500" },
        { id: "promotions", Icon: CategoryIcons.Promotions, label: "Promotions", color: "bg-green-500" },
        { id: "social", Icon: CategoryIcons.Social, label: "Social", color: "bg-pink-500" },
        { id: "updates", Icon: CategoryIcons.Updates, label: "Updates", color: "bg-yellow-500" },
        { id: "all", Icon: CategoryIcons.All, label: "All", color: "bg-purple-500" },
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
                                    className={`p-1 rounded-lg transition-all group relative hover:bg-white/10 ${activeCategory === cat.id
                                        ? 'bg-white/10 shadow-lg shadow-indigo-500/10 ring-2 ring-white/30'
                                        : ''
                                        }`}
                                    title={cat.label}
                                >
                                    <span className={`w-6 h-6 rounded-full ${cat.color} flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-110`}>
                                        <cat.Icon />
                                    </span>
                                    {/* Enhanced tooltip tag - positioned below to avoid clipping */}
                                    <span className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2.5 py-1 ${cat.color} text-[11px] font-medium text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap z-50 pointer-events-none shadow-lg scale-90 group-hover:scale-100`}>
                                        {cat.label}
                                        {/* Arrow pointing up */}
                                        <span className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-[-1px] border-4 border-transparent ${
                                            cat.id === 'primary' ? 'border-b-blue-500' :
                                            cat.id === 'promotions' ? 'border-b-green-500' :
                                            cat.id === 'social' ? 'border-b-pink-500' :
                                            cat.id === 'updates' ? 'border-b-yellow-500' :
                                            'border-b-purple-500'
                                        }`} />
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {!isCollapsed && !selectedEmail && !isComposing && (
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search emails..."
                            className="w-32"
                        />
                    )}
                    <button
                        onClick={handleCompose}
                        className="p-1.5 hover:bg-indigo-500/20 rounded-lg transition-colors text-indigo-400 hover:text-indigo-300"
                        title="Compose New Email"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                    </button>
                    <button
                        onClick={() => fetchPriorityEmails(activeCategory)}
                        className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-white"
                        title="Refresh"
                    >
                        <span className="text-xs">🔄</span>
                    </button>
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
            </div>

            {!isCollapsed && (
                <div className={`flex-1 overflow-y-auto custom-scrollbar transition-all duration-300 ${(selectedEmail || isComposing) ? (isEmailEditing ? 'max-h-[700px]' : 'max-h-[600px]') : 'max-h-[480px]'}`}>
                    {/* Selection action bar - sticky inside scroll container */}
                    {selectedIds.size > 0 && !selectedEmail && !isComposing && (
                        <div className="sticky top-0 z-10 px-4 py-2 bg-indigo-600 flex items-center justify-between shadow-lg">
                            <span className="text-xs font-bold text-white">{selectedIds.size} selected</span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleAction("addLabel", Array.from(selectedIds))}
                                    className="p-1 px-2 hover:bg-white/10 rounded text-xs text-white border border-white/20"
                                >
                                    🏷️ Tag
                                </button>
                                <button
                                    onClick={() => {
                                        const count = selectedIds.size;
                                        showConfirm({
                                            title: 'Delete Emails',
                                            message: `Are you sure you want to delete ${count} email${count > 1 ? 's' : ''}? This action cannot be undone.`,
                                            confirmText: `Delete ${count} Email${count > 1 ? 's' : ''}`,
                                            cancelText: 'Cancel',
                                            variant: 'danger',
                                            onConfirm: () => handleAction("delete", Array.from(selectedIds)),
                                        });
                                    }}
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
                    {isComposing && composeEmail ? (
                        <EmailDetailInline
                            email={composeEmail}
                            onClose={() => {
                                setIsComposing(false);
                                setComposeEmail(null);
                                setIsEmailEditing(false);
                            }}
                            onDelete={handleDiscardCompose}
                            onTag={() => {}}
                            isDraft={true}
                            onSaveEdit={handleSaveCompose}
                            onSend={handleSendCompose}
                            onDiscardDraft={handleDiscardCompose}
                            startInEditMode={true}
                            onEditingChange={setIsEmailEditing}
                            onPopOut={handlePopOutCompose}
                        />
                    ) : selectedEmail ? (
                        <EmailDetailInline
                            email={selectedEmail}
                            onClose={() => {
                                setSelectedEmail(null);
                                setIsEmailEditing(false);
                            }}
                            onDelete={(id) => handleAction("delete", [id])}
                            onTag={(id) => handleAction("addLabel", [id])}
                            onAIDraft={(id) => {
                                const email = emails.find(e => e.id === id);
                                if (email) handleAIDraft(email);
                            }}
                            onEditingChange={setIsEmailEditing}
                        />
                    ) : filteredEmails.length === 0 ? (
                        debouncedSearch ? (
                            <p className="p-4 text-xs text-slate-500 italic">No matches for &quot;{debouncedSearch}&quot;</p>
                        ) : (
                            <p className="p-4 text-xs text-white/40 italic">Your inbox is clean!</p>
                        )
                    ) : (
                        filteredEmails.map((email) => (
                            <EmailCard
                                key={email.id}
                                id={email.id}
                                subject={email.subject}
                                sender={email.senderName || email.from}
                                snippet={isAIDrafting === email.id ? "✨ Generating AI draft..." : email.snippet}
                                date={email.date}
                                isPersonal={email.isPersonal}
                                onDoubleClick={() => setSelectedEmail(email)}
                                isSelected={selectedIds.has(email.id)}
                                onSelect={(checked) => toggleSelect(email.id, checked)}
                                onDelete={() => handleAction("delete", [email.id])}
                                onTag={() => handleAction("addLabel", [email.id])}
                                onAIDraft={() => handleAIDraft(email)}
                            />
                        ))
                    )}
                </div>
            )}

        </div>
    );
}
