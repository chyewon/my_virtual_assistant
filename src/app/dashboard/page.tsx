"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, DragEvent, useCallback } from "react";
import Image from "next/image";
import WeeklyCalendar from "@/components/dashboard/WeeklyCalendar";
import TodaysTasks from "@/components/dashboard/TodaysTasks";
import ActivityLog from "@/components/dashboard/ActivityLog";
import TaskTable from "@/components/dashboard/TaskTable";
import PriorityEmails from "@/components/PriorityEmails";
import DraftEmails from "@/components/DraftEmails";
import SentEmails from "@/components/SentEmails";
import { GlobalSearchModal } from "@/components/search/GlobalSearchModal";
import { useDashboardPreferences } from "@/hooks/useDashboardPreferences";

// SVG Icons as components for consistency
const Icons = {
    Logo: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    ),
    Calendar: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
    ),
    Tasks: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
    ),
    Activity: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
    ),
    Mail: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
        </svg>
    ),
    Bell: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
    ),
    Settings: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
    ),
    Close: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
    ),
    DragHandle: () => (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5"/>
            <circle cx="9" cy="12" r="1.5"/>
            <circle cx="9" cy="18" r="1.5"/>
            <circle cx="15" cy="6" r="1.5"/>
            <circle cx="15" cy="12" r="1.5"/>
            <circle cx="15" cy="18" r="1.5"/>
        </svg>
    ),
    Swap: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
        </svg>
    ),
    Layout: () => (
        <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="9" y1="21" x2="9" y2="9"/>
        </svg>
    ),
    Priority: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <path d="M9 12l2 2 4-4" />
        </svg>
    ),
};

// Column configuration with SVG icons
const COLUMN_CONFIG = [
    { id: "calendar", Icon: Icons.Calendar, title: "Calendar", shortcut: "1" },
    { id: "tasks", Icon: Icons.Tasks, title: "Tasks", shortcut: "2" },
    { id: "activity", Icon: Icons.Activity, title: "Activity", shortcut: "3" },
    { id: "priority", Icon: Icons.Priority, title: "Priority", shortcut: "4" },
    { id: "emails", Icon: Icons.Mail, title: "Emails", shortcut: "5" },
] as const;

type ColumnId = typeof COLUMN_CONFIG[number]["id"];

// Undo toast component
function UndoToast({
    message,
    onUndo,
    onClose
}: {
    message: string;
    onUndo: () => void;
    onClose: () => void;
}) {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="glass border border-slate-700/50 rounded-xl px-4 py-3 shadow-elevation-3 flex items-center gap-4">
                <span className="text-sm text-slate-200">{message}</span>
                <button
                    onClick={onUndo}
                    className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 rounded px-2 py-1 -my-1 hover:bg-indigo-500/10"
                >
                    Undo
                </button>
                <button
                    onClick={onClose}
                    className="text-slate-500 hover:text-slate-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded p-1 -m-1 hover:bg-slate-700/50"
                    aria-label="Dismiss"
                >
                    <Icons.Close />
                </button>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [aiCostUsed, setAiCostUsed] = useState(2.34);
    const { visibleColumns, setVisibleColumns, isLoaded } = useDashboardPreferences();
    const [draggedColumn, setDraggedColumn] = useState<ColumnId | null>(null);
    const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
    const [draggedSidebarIcon, setDraggedSidebarIcon] = useState<ColumnId | null>(null);
    const [sidebarDropTargetColumn, setSidebarDropTargetColumn] = useState<ColumnId | null>(null);
    const [undoState, setUndoState] = useState<{ column: ColumnId; index: number } | null>(null);
    const [showUndoToast, setShowUndoToast] = useState(false);
    const [columnWidths, setColumnWidths] = useState<number[]>([50, 50]); // Percentages
    const [isResizing, setIsResizing] = useState(false);
    const [resizeIndex, setResizeIndex] = useState<number | null>(null);
    const [resizeStartX, setResizeStartX] = useState(0);
    const [resizeStartWidths, setResizeStartWidths] = useState<number[]>([]);
    const [showGlobalSearch, setShowGlobalSearch] = useState(false);
    const columnRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const containerRef = useRef<HTMLDivElement>(null);
    const userImage = session?.user?.image;

    // useCallback hooks must be before any early returns
    const handleUndo = useCallback(() => {
        if (undoState) {
            setVisibleColumns(prev => {
                const newColumns = [...prev];
                newColumns.splice(undoState.index, 0, undoState.column);
                return newColumns;
            });
            setUndoState(null);
            setShowUndoToast(false);
        }
    }, [undoState]);

    const handleCloseToast = useCallback(() => {
        setShowUndoToast(false);
        setUndoState(null);
    }, []);

    // Get min/max width constraints based on number of columns
    const getWidthConstraints = useCallback(() => {
        if (visibleColumns.length === 2) {
            return { min: 25, max: 75 };
        } else if (visibleColumns.length === 3) {
            return { min: 20, max: 60 };
        }
        return { min: 100, max: 100 };
    }, [visibleColumns.length]);

    // Snap to 5% increments
    const snapToIncrement = useCallback((value: number): number => {
        return Math.round(value / 5) * 5;
    }, []);

    // Column resize handlers - must be before early returns
    const handleResizeMove = useCallback((e: MouseEvent) => {
        if (!isResizing || resizeIndex === null || !containerRef.current) return;

        const containerWidth = containerRef.current.getBoundingClientRect().width;
        const deltaX = e.clientX - resizeStartX;
        const deltaPercent = (deltaX / containerWidth) * 100;

        const { min, max } = getWidthConstraints();
        const newWidths = [...resizeStartWidths];

        // Calculate new widths for the two adjacent columns
        let leftWidth = resizeStartWidths[resizeIndex] + deltaPercent;
        let rightWidth = resizeStartWidths[resizeIndex + 1] - deltaPercent;

        // Apply constraints
        if (leftWidth < min) {
            leftWidth = min;
            rightWidth = resizeStartWidths[resizeIndex] + resizeStartWidths[resizeIndex + 1] - min;
        } else if (leftWidth > max) {
            leftWidth = max;
            rightWidth = resizeStartWidths[resizeIndex] + resizeStartWidths[resizeIndex + 1] - max;
        }

        if (rightWidth < min) {
            rightWidth = min;
            leftWidth = resizeStartWidths[resizeIndex] + resizeStartWidths[resizeIndex + 1] - min;
        } else if (rightWidth > max) {
            rightWidth = max;
            leftWidth = resizeStartWidths[resizeIndex] + resizeStartWidths[resizeIndex + 1] - max;
        }

        // Snap to 5% increments
        leftWidth = snapToIncrement(leftWidth);
        rightWidth = resizeStartWidths[resizeIndex] + resizeStartWidths[resizeIndex + 1] - leftWidth;

        newWidths[resizeIndex] = leftWidth;
        newWidths[resizeIndex + 1] = rightWidth;

        setColumnWidths(newWidths);
    }, [isResizing, resizeIndex, resizeStartX, resizeStartWidths, getWidthConstraints, snapToIncrement]);

    const handleResizeEnd = useCallback(() => {
        setIsResizing(false);
        setResizeIndex(null);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);

    // Reset column widths when number of columns changes
    useEffect(() => {
        if (visibleColumns.length === 2) {
            setColumnWidths([50, 50]);
        } else if (visibleColumns.length === 3) {
            setColumnWidths([33.33, 33.34, 33.33]);
        }
    }, [visibleColumns.length]);

    // Add/remove mouse event listeners for resizing
    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', handleResizeMove);
            window.addEventListener('mouseup', handleResizeEnd);
            return () => {
                window.removeEventListener('mousemove', handleResizeMove);
                window.removeEventListener('mouseup', handleResizeEnd);
            };
        }
    }, [isResizing, handleResizeMove, handleResizeEnd]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+K or Ctrl+K to open global search
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setShowGlobalSearch(true);
                return;
            }

            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            if (e.key === "Escape") {
                if (draggedColumn) handleDragEnd();
                if (draggedSidebarIcon) handleSidebarDragEnd();
                return;
            }

            const keyNum = parseInt(e.key);
            if (keyNum >= 1 && keyNum <= 5) {
                const column = COLUMN_CONFIG[keyNum - 1];
                if (column) toggleColumn(column.id);
                return;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [draggedColumn, draggedSidebarIcon]);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/");
        }
    }, [status, router]);

    if (status === "loading" || !isLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0d12]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white animate-pulse">
                        <Icons.Logo />
                    </div>
                    <div className="text-sm text-slate-400">Loading dashboard...</div>
                </div>
            </div>
        );
    }

    if (!session) return null;

    const budgetPercentage = (aiCostUsed / 10) * 100;
    const getCostColor = () => {
        if (budgetPercentage < 70) return "text-emerald-400";
        if (budgetPercentage < 90) return "text-amber-400";
        return "text-red-400";
    };
    const getBudgetBarColor = () => {
        if (budgetPercentage < 70) return "bg-emerald-500";
        if (budgetPercentage < 90) return "bg-amber-500";
        return "bg-red-500";
    };

    const toggleColumn = (id: ColumnId) => {
        if (visibleColumns.includes(id)) {
            setVisibleColumns(prev => prev.filter(col => col !== id));
            return;
        }
        setVisibleColumns(prev => {
            const newList = [...prev, id];
            if (newList.length > 3) return newList.slice(1);
            return newList;
        });
    };

    const getGridCols = () => {
        switch (visibleColumns.length) {
            case 0: return "grid-cols-1";
            case 1: return "grid-cols-1";
            case 2: return "grid-cols-1 md:grid-cols-2";
            case 3: return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
            default: return "grid-cols-1";
        }
    };

    const removeColumn = (id: ColumnId) => {
        const index = visibleColumns.indexOf(id);
        setUndoState({ column: id, index });
        setShowUndoToast(true);
        setVisibleColumns(prev => prev.filter(col => col !== id));
    };

    const getColumnTitle = (id: ColumnId) => COLUMN_CONFIG.find(c => c.id === id)?.title || id;
    const getColumnIcon = (id: ColumnId) => {
        const config = COLUMN_CONFIG.find(c => c.id === id);
        return config ? <config.Icon /> : null;
    };
    const getColumnPosition = (id: ColumnId) => {
        const index = visibleColumns.indexOf(id);
        return index !== -1 ? index + 1 : null;
    };

    // Check if this is a task/calendar item drag (not column reorder)
    const isTaskCardDrag = (e: DragEvent<HTMLDivElement>) => {
        return e.dataTransfer.types.includes("application/json");
    };

    // Drag and drop handlers
    const handleDragStart = (e: DragEvent<HTMLDivElement>, colId: ColumnId) => {
        if (visibleColumns.length < 2) return;
        setDraggedColumn(colId);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", colId);
        requestAnimationFrame(() => {
            const element = columnRefs.current.get(colId);
            if (element) element.style.opacity = "0.5";
        });
    };

    const handleDragEnd = () => {
        if (draggedColumn) {
            const element = columnRefs.current.get(draggedColumn);
            if (element) element.style.opacity = "1";
        }
        setDraggedColumn(null);
        setDropTargetIndex(null);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>, targetIndex: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (draggedColumn === null) return;

        const draggedIndex = visibleColumns.indexOf(draggedColumn);
        if (draggedIndex === targetIndex) {
            setDropTargetIndex(null);
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const midpoint = rect.left + rect.width / 2;
        const isLeftHalf = e.clientX < midpoint;
        let newDropIndex = isLeftHalf ? targetIndex : targetIndex + 1;

        if (newDropIndex === draggedIndex || newDropIndex === draggedIndex + 1) {
            setDropTargetIndex(null);
        } else {
            setDropTargetIndex(newDropIndex);
        }
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (!relatedTarget || !e.currentTarget.parentElement?.contains(relatedTarget)) {
            setDropTargetIndex(null);
        }
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>, targetIndex: number) => {
        e.preventDefault();
        if (draggedColumn === null) return;

        const draggedIndex = visibleColumns.indexOf(draggedColumn);
        if (draggedIndex === -1) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const midpoint = rect.left + rect.width / 2;
        const isLeftHalf = e.clientX < midpoint;
        let newIndex = isLeftHalf ? targetIndex : targetIndex + 1;

        if (draggedIndex < newIndex) newIndex -= 1;

        if (draggedIndex !== newIndex) {
            setVisibleColumns(prev => {
                const newColumns = [...prev];
                const [removed] = newColumns.splice(draggedIndex, 1);
                newColumns.splice(newIndex, 0, removed);
                return newColumns;
            });
        }
        handleDragEnd();
    };

    const canDrag = visibleColumns.length >= 2;

    // Sidebar icon drag handlers
    const handleSidebarDragStart = (e: DragEvent<HTMLDivElement>, iconId: ColumnId) => {
        setDraggedSidebarIcon(iconId);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", `sidebar:${iconId}`);
    };

    const handleSidebarDragEnd = () => {
        setDraggedSidebarIcon(null);
        setSidebarDropTargetColumn(null);
    };

    const handleColumnDragOverForSidebar = (e: DragEvent<HTMLDivElement>, colId: ColumnId) => {
        if (draggedSidebarIcon === null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setSidebarDropTargetColumn(colId);
    };

    const handleColumnDropFromSidebar = (e: DragEvent<HTMLDivElement>, targetColId: ColumnId, targetIndex: number) => {
        if (draggedSidebarIcon === null) return;
        e.preventDefault();

        const iconId = draggedSidebarIcon;
        const existingIndex = visibleColumns.indexOf(iconId);

        if (existingIndex !== -1) {
            setVisibleColumns(prev => {
                const newColumns = [...prev];
                newColumns[existingIndex] = targetColId;
                newColumns[targetIndex] = iconId;
                return newColumns;
            });
        } else {
            setVisibleColumns(prev => {
                const newColumns = [...prev];
                newColumns[targetIndex] = iconId;
                return newColumns;
            });
        }
        handleSidebarDragEnd();
    };

    const isSwapOperation = draggedSidebarIcon && visibleColumns.includes(draggedSidebarIcon);

    // Column resize start handler (regular function, not a hook)
    const handleResizeStart = (e: React.MouseEvent, index: number) => {
        e.preventDefault();
        setIsResizing(true);
        setResizeIndex(index);
        setResizeStartX(e.clientX);
        setResizeStartWidths([...columnWidths]);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    };

    return (
        <div className="min-h-screen bg-[#0a0d12] flex flex-col">
            {/* Undo Toast */}
            {showUndoToast && undoState && (
                <UndoToast
                    message={`${getColumnTitle(undoState.column)} closed`}
                    onUndo={handleUndo}
                    onClose={handleCloseToast}
                />
            )}

            {/* Top Navigation Bar */}
            <header className="bg-[#0f1318] border-b border-slate-800/60 px-6 py-3.5 sticky top-0 z-50 shadow-elevation-2">
                <div className="flex items-center justify-between w-full">
                    {/* Left: Logo & Brand */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
                            <Icons.Logo />
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-[15px] font-semibold text-white leading-none">Virtual Assistant</h1>
                            <p className="text-[11px] text-slate-500 mt-0.5">AI-powered productivity</p>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* AI Budget Tracker */}
                        <div className="flex items-center gap-3 bg-slate-800/40 border border-slate-700/40 px-3 py-2 rounded-xl">
                            <div className="hidden sm:block">
                                <p className="text-label text-slate-500 leading-none">AI Budget</p>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className={`text-base font-semibold tabular-nums ${getCostColor()}`}>
                                        ${aiCostUsed.toFixed(2)}
                                    </span>
                                    <span className="text-xs text-slate-600">/ $10</span>
                                </div>
                            </div>
                            <div className="sm:hidden">
                                <span className={`text-sm font-semibold tabular-nums ${getCostColor()}`}>
                                    ${aiCostUsed.toFixed(2)}
                                </span>
                            </div>
                            {/* Mini progress bar */}
                            <div className="w-12 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${getBudgetBarColor()} transition-all duration-500`}
                                    style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                                />
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="hidden sm:block w-px h-8 bg-slate-700/50" />

                        {/* Global Search */}
                        <button
                            onClick={() => setShowGlobalSearch(true)}
                            className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1318]"
                            aria-label="Search"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <path d="m21 21-4.35-4.35" />
                            </svg>
                            <kbd className="hidden sm:block px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-500 font-mono">⌘K</kbd>
                        </button>

                        {/* Notifications */}
                        <button
                            className="relative p-2.5 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1318]"
                            aria-label="Notifications"
                        >
                            <Icons.Bell />
                            {/* Notification dot */}
                            <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full ring-2 ring-[#0f1318]" />
                        </button>

                        {/* Settings */}
                        <button
                            className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1318]"
                            aria-label="Settings"
                        >
                            <Icons.Settings />
                        </button>

                        {/* Divider */}
                        <div className="hidden sm:block w-px h-8 bg-slate-700/50" />

                        {/* User Profile */}
                        <div className="flex items-center gap-2.5 pl-1">
                            {userImage ? (
                                <Image
                                    src={userImage}
                                    alt={session.user?.name || "User"}
                                    width={36}
                                    height={36}
                                    className="rounded-xl border-2 border-slate-700/50 shadow-sm"
                                />
                            ) : (
                                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/50 flex items-center justify-center text-slate-400 text-sm font-medium">
                                    {session.user?.name?.charAt(0) || "U"}
                                </div>
                            )}
                            <button
                                onClick={() => signOut({ callbackUrl: "/" })}
                                className="hidden sm:block text-[13px] text-slate-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-2 py-1 hover:bg-slate-800/60"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar Navigation - Fixed position so it stays visible while scrolling */}
                <aside className="hidden md:block w-[72px] bg-[#0c0f14] border-r border-slate-800/50 flex-shrink-0">
                    <div className="fixed top-[61px] left-0 w-[72px] h-[calc(100vh-61px)] bg-[#0c0f14] flex flex-col items-center py-5 gap-1.5 z-40">
                        {/* Keyboard hint */}
                        <div className="text-label text-slate-600 mb-3 px-2 text-center">
                            Keys 1-5
                        </div>

                    {COLUMN_CONFIG.map(({ id, Icon, title, shortcut }) => {
                        const position = getColumnPosition(id);
                        const isActive = position !== null;
                        const isDragging = draggedSidebarIcon === id;

                        return (
                            <div
                                key={id}
                                draggable
                                onDragStart={(e) => handleSidebarDragStart(e, id)}
                                onDragEnd={handleSidebarDragEnd}
                                onClick={() => toggleColumn(id)}
                                className={`relative w-12 h-12 rounded-xl transition-all cursor-grab active:cursor-grabbing select-none group flex items-center justify-center ${
                                    isActive
                                        ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                                        : "text-slate-500 hover:text-white hover:bg-slate-800/60"
                                } ${isDragging ? "opacity-50 scale-90" : ""}
                                focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0f14]`}
                                title={`${title} (${shortcut})`}
                                tabIndex={0}
                                role="button"
                                aria-label={`${title}${isActive ? `, position ${position}` : ""}`}
                                aria-pressed={isActive}
                            >
                                <Icon />

                                {/* Position badge */}
                                {isActive && (
                                    <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-white text-indigo-600 text-[10px] font-bold rounded-md flex items-center justify-center shadow-sm ring-2 ring-[#0c0f14]">
                                        {position}
                                    </span>
                                )}

                                {/* Drag hint */}
                                {!isActive && (
                                    <div className="absolute -right-0.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="flex flex-col gap-0.5">
                                            {[0,1,2].map(i => (
                                                <div key={i} className="w-1 h-1 bg-slate-600 rounded-full" />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Shortcut tooltip */}
                                <span className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg border border-slate-700/50 z-50">
                                    {title} <span className="text-slate-400 ml-1">({shortcut})</span>
                                </span>
                            </div>
                        );
                    })}

                        {/* Divider and hint */}
                        <div className="flex-1" />
                        <div className="w-10 h-px bg-slate-800/60 mb-2" />
                        <div className="text-[9px] text-slate-600 text-center px-2 leading-tight">
                            Drag to<br/>column
                        </div>
                    </div>
                </aside>

                {/* Mobile Bottom Navigation */}
                <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0c0f14] border-t border-slate-800/50 z-40 px-3 py-2.5 flex justify-around items-center safe-area-pb shadow-elevation-3">
                    {COLUMN_CONFIG.map(({ id, Icon, title }) => {
                        const position = getColumnPosition(id);
                        const isActive = position !== null;

                        return (
                            <button
                                key={id}
                                onClick={() => toggleColumn(id)}
                                className={`relative p-3 rounded-xl transition-all min-w-[52px] min-h-[52px] flex items-center justify-center ${
                                    isActive
                                        ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/30"
                                        : "text-slate-500 active:bg-slate-800/60"
                                } focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
                                aria-label={title}
                                aria-pressed={isActive}
                            >
                                <Icon />
                                {isActive && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-indigo-600 text-[10px] font-bold rounded-md flex items-center justify-center ring-2 ring-[#0c0f14]">
                                        {position}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Main Dashboard Area */}
                <main className="flex-1 p-4 pb-24 md:pb-4 overflow-hidden bg-[#080a0e]">
                    {/* Empty State */}
                    {visibleColumns.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center px-4">
                            <div className="w-20 h-20 bg-slate-800/30 border border-slate-700/30 rounded-2xl flex items-center justify-center mb-6 text-slate-600">
                                <Icons.Layout />
                            </div>
                            <h3 className="text-lg font-semibold text-slate-200 mb-2">No panels open</h3>
                            <p className="text-sm text-slate-500 max-w-xs mb-8">
                                Select a view from the sidebar, or use keyboard shortcuts 1-4.
                            </p>
                            <div className="flex flex-wrap justify-center gap-3">
                                {COLUMN_CONFIG.map(({ id, Icon, title, shortcut }) => (
                                    <button
                                        key={id}
                                        onClick={() => toggleColumn(id)}
                                        className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 hover:border-slate-600/50 text-slate-300 rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 group"
                                    >
                                        <span className="text-slate-400 group-hover:text-white transition-colors">
                                            <Icon />
                                        </span>
                                        <span className="text-sm font-medium">{title}</span>
                                        <span className="text-xs text-slate-600 font-mono bg-slate-900/50 px-1.5 py-0.5 rounded">{shortcut}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div
                            ref={containerRef}
                            className={`flex h-full transition-all duration-300 ${visibleColumns.length === 1 ? 'flex-col' : ''}`}
                        >
                            {visibleColumns.map((colId, index) => (
                                <div
                                    key={colId}
                                    className="relative flex min-h-0"
                                    style={{
                                        width: visibleColumns.length > 1 ? `${columnWidths[index]}%` : '100%',
                                        transition: isResizing ? 'none' : 'width 0.2s ease-out',
                                        paddingLeft: index > 0 ? '8px' : '0',
                                        paddingRight: index < visibleColumns.length - 1 ? '8px' : '0',
                                    }}
                                >
                                    {/* Drop indicator - left side */}
                                    {dropTargetIndex === index && draggedColumn !== colId && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-full z-10 -translate-x-2.5 shadow-lg shadow-indigo-500/50 animate-pulse" />
                                    )}

                                    <div
                                        ref={(el) => {
                                            if (el) columnRefs.current.set(colId, el);
                                        }}
                                        draggable={canDrag}
                                        onDragStart={(e) => handleDragStart(e, colId)}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={(e) => {
                                            if (isTaskCardDrag(e)) return; // Let child components handle task drags
                                            if (draggedSidebarIcon) handleColumnDragOverForSidebar(e, colId);
                                            else handleDragOver(e, index);
                                        }}
                                        onDragLeave={(e) => {
                                            if (draggedSidebarIcon) setSidebarDropTargetColumn(null);
                                            else handleDragLeave(e);
                                        }}
                                        onDrop={(e) => {
                                            if (isTaskCardDrag(e)) return; // Let child components handle task drags
                                            if (draggedSidebarIcon) handleColumnDropFromSidebar(e, colId, index);
                                            else handleDrop(e, index);
                                        }}
                                        className={`flex-1 relative bg-[#0f1318] border rounded-2xl overflow-hidden flex flex-col transition-all duration-200 shadow-elevation-1 ${
                                            draggedColumn === colId ? "opacity-50 scale-[0.98]" : ""
                                        } ${
                                            draggedColumn && draggedColumn !== colId ? "ring-2 ring-transparent hover:ring-indigo-500/30" : ""
                                        } ${
                                            sidebarDropTargetColumn === colId
                                                ? "border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg shadow-indigo-500/20"
                                                : "border-slate-800/60"
                                        }`}
                                    >
                                        {/* Drop overlay */}
                                        {sidebarDropTargetColumn === colId && draggedSidebarIcon && (
                                            <div className="absolute inset-0 bg-indigo-500/15 backdrop-blur-sm z-20 flex items-center justify-center rounded-2xl pointer-events-none">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="flex items-center gap-3">
                                                        {isSwapOperation && (
                                                            <>
                                                                <span className="text-slate-400 opacity-60">{getColumnIcon(colId)}</span>
                                                                <Icons.Swap />
                                                            </>
                                                        )}
                                                        <span className="text-indigo-400 scale-125">{getColumnIcon(draggedSidebarIcon)}</span>
                                                    </div>
                                                    <span className="text-sm font-medium text-indigo-300 bg-indigo-500/20 px-3 py-1 rounded-lg">
                                                        {isSwapOperation
                                                            ? `Swap with ${getColumnTitle(draggedSidebarIcon)}`
                                                            : `Replace with ${getColumnTitle(draggedSidebarIcon)}`
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Column Header */}
                                        <div
                                            className={`flex items-center justify-between px-4 py-3 border-b border-slate-800/40 bg-slate-900/20 ${
                                                canDrag ? "cursor-grab active:cursor-grabbing" : ""
                                            }`}
                                            title={canDrag ? "Drag to reorder" : undefined}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                {canDrag && (
                                                    <span className="text-slate-600">
                                                        <Icons.DragHandle />
                                                    </span>
                                                )}
                                                <span className="text-slate-400">{getColumnIcon(colId)}</span>
                                                <span className="text-sm font-medium text-slate-200">{getColumnTitle(colId)}</span>
                                                {visibleColumns.length > 1 && (
                                                    <span className="text-xs text-slate-600 font-mono">
                                                        {index + 1}/{visibleColumns.length}
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeColumn(colId);
                                                }}
                                                className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-w-[28px] min-h-[28px] flex items-center justify-center"
                                                title="Close panel"
                                                aria-label={`Close ${getColumnTitle(colId)}`}
                                            >
                                                <Icons.Close />
                                            </button>
                                        </div>

                                        <div className="flex-1 p-4 overflow-hidden flex flex-col min-h-0">
                                            {colId === "calendar" && (
                                                <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
                                                    <WeeklyCalendar />
                                                </div>
                                            )}
                                            {colId === "tasks" && (
                                                <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin">
                                                    <TodaysTasks expanded={true} />
                                                </div>
                                            )}
                                            {colId === "activity" && (
                                                <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                                    <ActivityLog />
                                                </div>
                                            )}
                                            {colId === "priority" && (
                                                <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                                    <TaskTable />
                                                </div>
                                            )}
                                            {colId === "emails" && (
                                                <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0 scrollbar-thin">
                                                    <div className="flex-initial"><PriorityEmails /></div>
                                                    <div className="flex-initial"><DraftEmails /></div>
                                                    <div className="flex-initial"><SentEmails /></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Drop indicator - right side */}
                                    {index === visibleColumns.length - 1 && dropTargetIndex === visibleColumns.length && draggedColumn !== colId && (
                                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-full z-10 translate-x-2.5 shadow-lg shadow-indigo-500/50 animate-pulse" />
                                    )}

                                    {/* Resize Handle - between columns (desktop only) */}
                                    {index < visibleColumns.length - 1 && visibleColumns.length >= 2 && (
                                        <div
                                            className="hidden md:flex absolute right-0 top-0 bottom-0 z-30 items-center justify-center cursor-col-resize group"
                                            style={{ transform: 'translateX(50%)', width: '16px' }}
                                            onMouseDown={(e) => handleResizeStart(e, index)}
                                        >
                                            {/* Hover/active hit area */}
                                            <div className={`absolute inset-0 transition-colors ${
                                                resizeIndex === index ? 'bg-indigo-500/20' : 'group-hover:bg-slate-700/30'
                                            }`} />

                                            {/* Visual handle line */}
                                            <div className={`w-1 h-16 rounded-full transition-all ${
                                                resizeIndex === index
                                                    ? 'bg-indigo-500 scale-y-100'
                                                    : 'bg-slate-600 group-hover:bg-indigo-400 scale-y-75 group-hover:scale-y-100'
                                            }`} />

                                            {/* Percentage indicator while dragging */}
                                            {isResizing && resizeIndex === index && (
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 shadow-lg z-40 whitespace-nowrap">
                                                    <div className="flex items-center gap-2 text-xs font-mono">
                                                        <span className="text-indigo-400">{Math.round(columnWidths[index])}%</span>
                                                        <span className="text-slate-600">|</span>
                                                        <span className="text-indigo-400">{Math.round(columnWidths[index + 1])}%</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {/* Global Search Modal */}
            <GlobalSearchModal
                isOpen={showGlobalSearch}
                onClose={() => setShowGlobalSearch(false)}
            />
        </div>
    );
}
