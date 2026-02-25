"use client";

import { useEffect, useState, useMemo } from "react";
import EmailCard from "./EmailCard";
import EmailDetailInline from "./EmailDetailInline";
import { useToast } from "./Toast";
import { SearchInput } from "./search/SearchInput";
import { useDebounce } from "@/hooks/useDebounce";

interface Draft {
    id: string;
    messageId: string;
    subject: string;
    to: string;
    snippet: string;
    body: string;
    date: string;
}

export default function DraftEmails() {
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isEmailEditing, setIsEmailEditing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 200);
    const { showToast, showConfirm } = useToast();

    const filteredDrafts = useMemo(() => {
        if (!debouncedSearch) return drafts;
        const query = debouncedSearch.toLowerCase();
        return drafts.filter(draft =>
            draft.subject?.toLowerCase().includes(query) ||
            draft.to?.toLowerCase().includes(query) ||
            draft.snippet?.toLowerCase().includes(query) ||
            draft.body?.toLowerCase().includes(query)
        );
    }, [drafts, debouncedSearch]);

    const fetchDrafts = async () => {
        setIsLoading(true);
        try {
            const response = await fetch("/api/email/drafts");
            const data = await response.json();

            if (data.error) {
                setError(data.error);
            } else {
                setDrafts(data.drafts || []);
            }
        } catch (err) {
            setError("Failed to fetch drafts");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDrafts();
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
                setDrafts(prev => prev.filter(d => !messageIds.includes(d.messageId)));
                setSelectedIds(new Set());
                if (selectedDraft && messageIds.includes(selectedDraft.messageId)) {
                    setSelectedDraft(null);
                }
            }
        } catch (err) {
            console.error("Action failed:", err);
        }
    };

    const toggleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(drafts.map(d => d.messageId)));
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

    const handleSaveDraft = async (draftId: string, data: { subject: string; to: string; cc: string; bcc: string; body: string }) => {
        const draft = drafts.find(d => d.id === draftId || d.messageId === draftId);
        const isNewDraft = draftId.startsWith("new-draft-");

        try {
            const response = await fetch("/api/email/drafts/update", {
                method: isNewDraft ? "POST" : "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    draftId: isNewDraft ? undefined : (draft?.id || draftId),
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
                setSelectedDraft(null);
                setIsEmailEditing(false);
                fetchDrafts();
            } else {
                showToast(result.error || "Failed to save draft", "error");
            }
        } catch (err) {
            console.error("Save draft failed:", err);
            showToast("Failed to save draft", "error");
        }
    };

    const handleSendDraft = async (draftId: string, data: { subject: string; to: string; cc: string; bcc: string; body: string }) => {
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
                // Delete the draft after sending
                await handleAction("delete", [draftId]);
                showToast("Email sent", "success");
                setSelectedDraft(null);
                setIsEmailEditing(false);
                fetchDrafts();
            } else {
                showToast(result.error || "Failed to send email", "error");
            }
        } catch (err) {
            console.error("Send failed:", err);
            showToast("Failed to send email", "error");
        }
    };

    const handleDiscardDraft = async (draftId: string) => {
        await handleAction("delete", [draftId]);
        setSelectedDraft(null);
        setIsEmailEditing(false);
    };

    if (isLoading && drafts.length === 0) {
        return <div className="p-4 text-xs text-white/40">Loading drafts...</div>;
    }

    if (error && drafts.length === 0) {
        return <div className="p-4 text-xs text-red-400/60">Error: {error}</div>;
    }

    return (
        <div className={`flex flex-col bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden relative transition-all duration-300 ${isCollapsed ? 'h-[52px]' : 'h-full'}`}>
            <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                <div className="flex items-center gap-3">
                    {!isCollapsed && !selectedDraft && (
                        <input
                            type="checkbox"
                            checked={drafts.length > 0 && selectedIds.size === drafts.length}
                            onChange={(e) => toggleSelectAll(e.target.checked)}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer"
                        />
                    )}
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white/80">📝 Drafts</h3>
                        {!isCollapsed && !selectedDraft && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                                {drafts.length} Items
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {!isCollapsed && !selectedDraft && (
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search drafts..."
                            className="w-32"
                        />
                    )}
                    <button
                        onClick={() => fetchDrafts()}
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
                <div className={`flex-1 overflow-y-auto custom-scrollbar transition-all duration-300 ${selectedDraft ? (isEmailEditing ? 'max-h-[700px]' : 'max-h-[600px]') : 'max-h-[480px]'}`}>
                    {/* Selection action bar - now inside scroll container, pushes content down */}
                    {selectedIds.size > 0 && !selectedDraft && (
                        <div className="sticky top-0 z-10 px-4 py-2 bg-indigo-600 flex items-center justify-between shadow-lg">
                            <span className="text-xs font-bold text-white">{selectedIds.size} selected</span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const count = selectedIds.size;
                                        showConfirm({
                                            title: 'Delete Drafts',
                                            message: `Are you sure you want to delete ${count} draft${count > 1 ? 's' : ''}? This action cannot be undone.`,
                                            confirmText: `Delete ${count} Draft${count > 1 ? 's' : ''}`,
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
                    {selectedDraft ? (
                        <EmailDetailInline
                            email={{ ...selectedDraft, from: 'me', id: selectedDraft.messageId }}
                            onClose={() => {
                                setSelectedDraft(null);
                                setIsEmailEditing(false);
                            }}
                            onDelete={(id) => handleAction("delete", [id])}
                            onTag={(id) => handleAction("addLabel", [id])}
                            isDraft={true}
                            onSaveEdit={handleSaveDraft}
                            onSend={handleSendDraft}
                            onDiscardDraft={handleDiscardDraft}
                            startInEditMode={true}
                            onEditingChange={setIsEmailEditing}
                        />
                    ) : filteredDrafts.length === 0 ? (
                        debouncedSearch ? (
                            <p className="p-4 text-xs text-slate-500 italic">No matches for &quot;{debouncedSearch}&quot;</p>
                        ) : (
                            <p className="p-4 text-xs text-white/40 italic">No drafts found.</p>
                        )
                    ) : (
                        filteredDrafts.map((draft) => (
                            <EmailCard
                                key={draft.id}
                                id={draft.id}
                                subject={draft.subject}
                                recipient={draft.to || "(No recipient)"}
                                snippet={draft.snippet}
                                date={draft.date}
                                onDoubleClick={() => setSelectedDraft(draft)}
                                isSelected={selectedIds.has(draft.messageId)}
                                onSelect={(checked) => toggleSelect(draft.messageId, checked)}
                                onDelete={() => handleAction("delete", [draft.messageId])}
                                onTag={() => handleAction("addLabel", [draft.messageId])}
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
