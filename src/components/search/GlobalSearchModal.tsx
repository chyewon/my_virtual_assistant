"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";

// Inline SVG Icons
const SearchIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
    </svg>
);

const XIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const MailIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
    </svg>
);

const CalendarIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
);

const CheckSquareIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
);

const ActivityIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
);

interface SearchResult {
    id: string;
    type: "email" | "calendar" | "task" | "activity";
    title: string;
    subtitle?: string;
    timestamp?: string;
}

interface GlobalSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const debouncedQuery = useDebounce(query, 200);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setQuery("");
            setResults([]);
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Search when query changes
    useEffect(() => {
        if (!debouncedQuery) {
            setResults([]);
            return;
        }

        const fetchResults = async () => {
            setLoading(true);
            try {
                const searchResults: SearchResult[] = [];
                const queryLower = debouncedQuery.toLowerCase();

                // Fetch emails
                const emailRes = await fetch(`/api/email/priority?category=all`);
                if (emailRes.ok) {
                    const emailData = await emailRes.json();
                    const emails = emailData.emails || [];
                    emails.forEach((email: any) => {
                        if (
                            email.subject?.toLowerCase().includes(queryLower) ||
                            email.senderName?.toLowerCase().includes(queryLower) ||
                            email.snippet?.toLowerCase().includes(queryLower)
                        ) {
                            searchResults.push({
                                id: `email-${email.id}`,
                                type: "email",
                                title: email.subject || "(No subject)",
                                subtitle: email.senderName || email.from,
                                timestamp: email.date,
                            });
                        }
                    });
                }

                // Fetch calendar events
                const now = new Date();
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay() + 1);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 14);

                const calRes = await fetch(
                    `/api/calendar/events?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`
                );
                if (calRes.ok) {
                    const calData = await calRes.json();
                    const events = calData.events || [];
                    events.forEach((event: any) => {
                        if (
                            event.title?.toLowerCase().includes(queryLower) ||
                            event.description?.toLowerCase().includes(queryLower) ||
                            event.location?.toLowerCase().includes(queryLower)
                        ) {
                            searchResults.push({
                                id: `calendar-${event.id}`,
                                type: "calendar",
                                title: event.title,
                                subtitle: event.location,
                                timestamp: event.startTime,
                            });
                        }
                    });
                }

                // Fetch priority tasks
                const taskRes = await fetch(`/api/priority-tasks`);
                if (taskRes.ok) {
                    const taskData = await taskRes.json();
                    const tasks = taskData.tasks || [];
                    tasks.forEach((task: any) => {
                        if (task.task?.toLowerCase().includes(queryLower)) {
                            searchResults.push({
                                id: `task-${task.id}`,
                                type: "task",
                                title: task.task,
                                subtitle: task.importance,
                                timestamp: task.dueDate,
                            });
                        }
                    });
                }

                // Fetch activity log
                const activityRes = await fetch(`/api/activity`);
                if (activityRes.ok) {
                    const activityData = await activityRes.json();
                    const activities = activityData.activities || [];
                    activities.forEach((activity: any) => {
                        if (activity.action?.toLowerCase().includes(queryLower)) {
                            searchResults.push({
                                id: `activity-${activity.id}`,
                                type: "activity",
                                title: activity.action,
                                subtitle: `+${activity.impactScore} points`,
                                timestamp: activity.timestamp,
                            });
                        }
                    });
                }

                setResults(searchResults);
                setSelectedIndex(0);
            } catch (err) {
                console.error("Search error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [debouncedQuery]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case "Escape":
                    onClose();
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setSelectedIndex((prev) => Math.max(prev - 1, 0));
                    break;
                case "Enter":
                    if (results[selectedIndex]) {
                        handleSelect(results[selectedIndex]);
                    }
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, results, selectedIndex, onClose]);

    // Scroll selected item into view
    useEffect(() => {
        if (resultsRef.current && results.length > 0) {
            const selectedEl = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`);
            selectedEl?.scrollIntoView({ block: "nearest" });
        }
    }, [selectedIndex, results.length]);

    const handleSelect = (result: SearchResult) => {
        // Close modal - could add navigation logic here
        onClose();
    };

    const getIcon = (type: SearchResult["type"]) => {
        switch (type) {
            case "email":
                return <MailIcon />;
            case "calendar":
                return <CalendarIcon />;
            case "task":
                return <CheckSquareIcon />;
            case "activity":
                return <ActivityIcon />;
        }
    };

    const getTypeColor = (type: SearchResult["type"]) => {
        switch (type) {
            case "email":
                return "text-blue-400 bg-blue-500/10";
            case "calendar":
                return "text-green-400 bg-green-500/10";
            case "task":
                return "text-yellow-400 bg-yellow-500/10";
            case "activity":
                return "text-purple-400 bg-purple-500/10";
        }
    };

    const groupedResults = useMemo(() => {
        const groups: Record<string, SearchResult[]> = {
            email: [],
            calendar: [],
            task: [],
            activity: [],
        };
        results.forEach((r) => groups[r.type].push(r));
        return groups;
    }, [results]);

    const formatTimestamp = (timestamp?: string) => {
        if (!timestamp) return "";
        const date = new Date(timestamp);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    if (!isOpen) return null;

    let globalIndex = -1;

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div
                className="relative w-full max-w-[640px] mx-4 bg-[#0f1318] border border-slate-800/60 rounded-xl shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800/60">
                    <span className="text-slate-500"><SearchIcon /></span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search emails, events, tasks..."
                        className="flex-1 bg-transparent text-white text-sm placeholder:text-slate-500 focus:outline-none"
                    />
                    {query && (
                        <button
                            onClick={() => setQuery("")}
                            className="p-1 rounded hover:bg-slate-800 transition-colors text-slate-400"
                        >
                            <XIcon />
                        </button>
                    )}
                    <kbd className="hidden sm:block px-2 py-1 bg-slate-800 rounded text-xs text-slate-500 font-mono">
                        esc
                    </kbd>
                </div>

                {/* Results */}
                <div ref={resultsRef} className="max-h-[400px] overflow-y-auto">
                    {loading && (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin w-5 h-5 border-2 border-slate-600 border-t-indigo-500 rounded-full" />
                        </div>
                    )}

                    {!loading && query && results.length === 0 && (
                        <div className="py-12 text-center">
                            <p className="text-slate-500 text-sm">No results for &quot;{query}&quot;</p>
                            <p className="text-slate-600 text-xs mt-1">Try a different search term</p>
                        </div>
                    )}

                    {!loading && !query && (
                        <div className="py-12 text-center">
                            <span className="text-slate-700 flex justify-center mb-3"><SearchIcon className="w-10 h-10" /></span>
                            <p className="text-slate-500 text-sm">Search across all your data</p>
                            <p className="text-slate-600 text-xs mt-1">
                                Emails, calendar events, tasks, and activity
                            </p>
                        </div>
                    )}

                    {!loading && results.length > 0 && (
                        <div className="py-2">
                            {(["email", "calendar", "task", "activity"] as const).map((type) => {
                                const typeResults = groupedResults[type];
                                if (typeResults.length === 0) return null;

                                const typeLabels = {
                                    email: "Emails",
                                    calendar: "Calendar Events",
                                    task: "Tasks",
                                    activity: "Activity",
                                };

                                return (
                                    <div key={type} className="mb-2">
                                        <div className="px-4 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            {typeLabels[type]} ({typeResults.length})
                                        </div>
                                        {typeResults.map((result) => {
                                            globalIndex++;
                                            const isSelected = globalIndex === selectedIndex;
                                            const currentIndex = globalIndex;

                                            return (
                                                <button
                                                    key={result.id}
                                                    data-index={currentIndex}
                                                    onClick={() => handleSelect(result)}
                                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                                                        isSelected
                                                            ? "bg-indigo-500/20"
                                                            : "hover:bg-slate-800/50"
                                                    }`}
                                                >
                                                    <div
                                                        className={`p-1.5 rounded-lg ${getTypeColor(result.type)}`}
                                                    >
                                                        {getIcon(result.type)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm text-white truncate">
                                                            {result.title}
                                                        </div>
                                                        {result.subtitle && (
                                                            <div className="text-xs text-slate-500 truncate">
                                                                {result.subtitle}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {result.timestamp && (
                                                        <div className="text-xs text-slate-600 whitespace-nowrap">
                                                            {formatTimestamp(result.timestamp)}
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {results.length > 0 && (
                    <div className="px-4 py-2 border-t border-slate-800/60 flex items-center gap-4 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono">↑</kbd>
                            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono">↓</kbd>
                            navigate
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono">↵</kbd>
                            select
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
