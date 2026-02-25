"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { SearchInput } from "@/components/search/SearchInput";
import { useDebounce } from "@/hooks/useDebounce";

interface Subtask {
    id: string;
    title: string;
    completed: boolean;
}

interface PriorityTask {
    id: string;
    task: string;
    description?: string;
    dueDate: string;
    importance: "High" | "Medium" | "Low";
    completed: boolean;
    subtasks?: Subtask[];
    reminder?: string;
}

type SortOption = "importance" | "dueDate" | "alphabetical" | "created";

// Drag data type for cross-component drag and drop
export interface DragTaskData {
    type: "calendar-event" | "email";
    title: string;
    date?: string;
    id: string;
}

const importanceConfig = {
    High: "text-red-400 bg-red-400/10 border-red-400/20",
    Medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    Low: "text-blue-400 bg-blue-400/10 border-blue-400/20",
};

export default function TaskTable() {
    const [tasks, setTasks] = useState<PriorityTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 200);
    const [newTask, setNewTask] = useState({
        task: "",
        description: "",
        dueDate: "",
        importance: "Medium" as const,
    });
    const [isDragOver, setIsDragOver] = useState(false);
    const [sortBy, setSortBy] = useState<SortOption>("importance");
    const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

    const filteredTasks = useMemo(() => {
        // Filter out completed tasks - they go to Accomplishments
        let result = tasks.filter(task => !task.completed);

        if (debouncedSearch) {
            const query = debouncedSearch.toLowerCase();
            result = result.filter(task =>
                task.task?.toLowerCase().includes(query)
            );
        }
        return result;
    }, [tasks, debouncedSearch]);

    const fetchTasks = useCallback(async () => {
        try {
            const response = await fetch("/api/priority-tasks");
            if (!response.ok) throw new Error("Failed to fetch tasks");
            const data = await response.json();
            setTasks(data.tasks || []);
        } catch (err) {
            console.error("Failed to fetch priority tasks:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // Check for due reminders
    useEffect(() => {
        const checkReminders = () => {
            const now = new Date();
            tasks.forEach(task => {
                if (task.reminder && !task.completed) {
                    const reminderTime = new Date(task.reminder);
                    // Check if reminder is due (within the last minute)
                    if (reminderTime <= now && reminderTime > new Date(now.getTime() - 60000)) {
                        // Request notification permission and show notification
                        if (Notification.permission === "granted") {
                            new Notification(`🔔 Task Reminder: ${task.task}`, {
                                body: task.description || "Time to work on this task!",
                                icon: "/favicon.ico",
                            });
                        } else if (Notification.permission !== "denied") {
                            Notification.requestPermission().then(permission => {
                                if (permission === "granted") {
                                    new Notification(`🔔 Task Reminder: ${task.task}`, {
                                        body: task.description || "Time to work on this task!",
                                        icon: "/favicon.ico",
                                    });
                                }
                            });
                        }
                    }
                }
            });
        };

        // Check immediately and then every 30 seconds
        checkReminders();
        const interval = setInterval(checkReminders, 30000);
        return () => clearInterval(interval);
    }, [tasks]);

    const handleAddTask = async () => {
        if (!newTask.task.trim()) return;

        try {
            const response = await fetch("/api/priority-tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newTask),
            });
            if (!response.ok) throw new Error("Failed to add task");
            setNewTask({ task: "", description: "", dueDate: "", importance: "Medium" });
            fetchTasks();
        } catch (err) {
            console.error("Failed to add task:", err);
        }
    };

    const updateTask = async (id: string, updates: Partial<PriorityTask>) => {
        // Optimistic update
        setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));

        try {
            await fetch("/api/priority-tasks", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, ...updates }),
            });
        } catch (err) {
            console.error("Failed to update task:", err);
            fetchTasks();
        }
    };

    const deleteTask = async (id: string, name: string) => {
        if (!confirm(`Delete "${name}"?`)) return;

        setTasks(prev => prev.filter(t => t.id !== id));

        try {
            await fetch(`/api/priority-tasks?id=${id}`, {
                method: "DELETE",
            });
        } catch (err) {
            console.error("Failed to delete task:", err);
            fetchTasks();
        }
    };

    // Handle drop from TodaysTasks or Email
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        try {
            const dataStr = e.dataTransfer.getData("application/json");
            if (!dataStr) return;

            const data: DragTaskData = JSON.parse(dataStr);

            // Create a new priority task from the dropped item
            const taskToAdd = {
                task: data.title,
                dueDate: data.date || new Date().toISOString().split("T")[0],
                importance: "Medium" as const,
            };

            const response = await fetch("/api/priority-tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(taskToAdd),
            });

            if (!response.ok) throw new Error("Failed to add task");
            fetchTasks();
        } catch (err) {
            console.error("Failed to add dropped task:", err);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    if (loading) return <div className="p-4 text-slate-400 animate-pulse">Loading priority planner...</div>;

    const sortedTasks = [...filteredTasks].sort((a, b) => {
        // Always put completed tasks at the bottom
        if (a.completed !== b.completed) return a.completed ? 1 : -1;

        switch (sortBy) {
            case "importance": {
                const order = { High: 0, Medium: 1, Low: 2 };
                return order[a.importance] - order[b.importance];
            }
            case "dueDate": {
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
            }
            case "alphabetical":
                return a.task.localeCompare(b.task);
            case "created":
            default:
                return 0; // Keep original order
        }
    });

    return (
        <div
            className={`h-full flex flex-col space-y-4 transition-all relative ${isDragOver ? "ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900 rounded-xl" : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
        >
            {isDragOver && (
                <div className="absolute inset-0 bg-indigo-500/10 rounded-xl pointer-events-none z-10 flex items-center justify-center">
                    <div className="bg-indigo-500/20 border-2 border-dashed border-indigo-500 rounded-xl px-6 py-4">
                        <span className="text-indigo-300 font-medium">Drop to add as Priority Task</span>
                    </div>
                </div>
            )}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="text-xl">🎯</span> Priority Planner
                </h2>
                <div className="flex items-center gap-2">
                    <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search tasks..."
                        className="w-32"
                    />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-300 focus:ring-0 cursor-pointer"
                        title="Sort by"
                    >
                        <option value="importance">⚡ Importance</option>
                        <option value="dueDate">📅 Due Date</option>
                        <option value="alphabetical">🔤 A-Z</option>
                        <option value="created">🕐 Created</option>
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-auto rounded-xl border border-slate-800 bg-slate-900/20 shadow-inner">
                <table className="w-full text-sm text-left">
                    <thead className="text-[11px] uppercase tracking-wider bg-slate-800/80 text-slate-400 sticky top-0 backdrop-blur-md z-10">
                        <tr>
                            <th className="px-4 py-3 w-8"></th>
                            <th className="px-4 py-3">Task</th>
                            <th className="px-4 py-3 w-32">Due Date</th>
                            <th className="px-2 py-3 w-24">Importance</th>
                            <th className="px-4 py-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {sortedTasks.length === 0 && debouncedSearch ? (
                            <tr>
                                <td colSpan={5} className="px-4 py-4 text-xs text-slate-500 italic">
                                    No matches for &quot;{debouncedSearch}&quot;
                                </td>
                            </tr>
                        ) : null}
                        {sortedTasks.map((task) => (
                            <tr
                                key={task.id}
                                className={`hover:bg-indigo-500/5 transition-colors group ${task.completed ? "opacity-60" : ""} cursor-pointer`}
                                onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                            >
                                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={task.completed}
                                        onChange={() => updateTask(task.id, { completed: !task.completed })}
                                        className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500 text-xs">{expandedTaskId === task.id ? "▼" : "▶"}</span>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`${task.completed ? "line-through text-slate-500" : "text-slate-200"} font-medium cursor-text`}
                                                    onDoubleClick={(e) => {
                                                        e.stopPropagation();
                                                        const newTitle = prompt("Edit task:", task.task);
                                                        if (newTitle !== null) updateTask(task.id, { task: newTitle || "Untitled" });
                                                    }}
                                                    title="Double-click to edit title"
                                                >
                                                    {task.task}
                                                </span>
                                                {/* Indicators */}
                                                {task.reminder && (
                                                    <span className="text-[10px] text-amber-400" title={`Reminder: ${new Date(task.reminder).toLocaleString()}`}>
                                                        🔔
                                                    </span>
                                                )}
                                                {task.subtasks && task.subtasks.length > 0 && (
                                                    <span className="text-[10px] text-slate-500" title="Subtasks">
                                                        {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}
                                                    </span>
                                                )}
                                            </div>
                                            {/* Expanded section with notes, subtasks, reminder */}
                                            {expandedTaskId === task.id && (
                                                <div className="mt-2 space-y-3" onClick={(e) => e.stopPropagation()}>
                                                    {/* Notes */}
                                                    <textarea
                                                        value={task.description || ""}
                                                        onChange={(e) => updateTask(task.id, { description: e.target.value })}
                                                        placeholder="Add notes..."
                                                        className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-300 placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none"
                                                        rows={2}
                                                    />

                                                    {/* Subtasks */}
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] text-slate-500 uppercase font-bold">Subtasks</div>
                                                        {(task.subtasks || []).map((subtask) => (
                                                            <div key={subtask.id} className="flex items-center gap-2 group/subtask">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={subtask.completed}
                                                                    onChange={() => {
                                                                        const updated = (task.subtasks || []).map(s =>
                                                                            s.id === subtask.id ? { ...s, completed: !s.completed } : s
                                                                        );
                                                                        updateTask(task.id, { subtasks: updated });
                                                                    }}
                                                                    className="w-3 h-3 rounded border-slate-600 bg-slate-700 text-indigo-500"
                                                                />
                                                                <span className={`text-xs flex-1 ${subtask.completed ? "line-through text-slate-500" : "text-slate-300"}`}>
                                                                    {subtask.title}
                                                                </span>
                                                                <button
                                                                    onClick={() => {
                                                                        const updated = (task.subtasks || []).filter(s => s.id !== subtask.id);
                                                                        updateTask(task.id, { subtasks: updated });
                                                                    }}
                                                                    className="opacity-0 group-hover/subtask:opacity-100 text-slate-500 hover:text-red-400 text-xs"
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <input
                                                            type="text"
                                                            placeholder="+ Add subtask..."
                                                            className="w-full bg-transparent border-none text-xs text-slate-400 placeholder-slate-600 focus:outline-none p-0"
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter" && e.currentTarget.value.trim()) {
                                                                    const newSubtask: Subtask = {
                                                                        id: Math.random().toString(36).substring(2, 9),
                                                                        title: e.currentTarget.value.trim(),
                                                                        completed: false,
                                                                    };
                                                                    updateTask(task.id, { subtasks: [...(task.subtasks || []), newSubtask] });
                                                                    e.currentTarget.value = "";
                                                                }
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Reminder */}
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-slate-500">🔔</span>
                                                        <input
                                                            type="datetime-local"
                                                            value={task.reminder ? task.reminder.slice(0, 16) : ""}
                                                            onChange={(e) => updateTask(task.id, { reminder: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                                                            className="bg-slate-800/50 border border-slate-700 rounded px-2 py-1 text-xs text-slate-400 focus:ring-1 focus:ring-indigo-500"
                                                            style={{ colorScheme: "dark" }}
                                                        />
                                                        {task.reminder && (
                                                            <button
                                                                onClick={() => updateTask(task.id, { reminder: undefined })}
                                                                className="text-xs text-slate-500 hover:text-red-400"
                                                            >
                                                                Clear
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="date"
                                        value={task.dueDate}
                                        onChange={(e) => updateTask(task.id, { dueDate: e.target.value })}
                                        className="bg-transparent border-none text-xs text-slate-400 focus:ring-0 p-0 w-full hover:text-slate-300 transition-colors cursor-pointer"
                                        style={{ colorScheme: "dark" }}
                                    />
                                </td>
                                <td className="px-2 py-3">
                                    <select
                                        value={task.importance}
                                        onChange={(e) => updateTask(task.id, { importance: e.target.value as any })}
                                        className={`text-[10px] font-bold py-0.5 px-2 rounded-full border ${importanceConfig[task.importance]} focus:ring-0 appearance-none cursor-pointer text-center w-full shadow-sm`}
                                    >
                                        <option value="High">HIGH</option>
                                        <option value="Medium">MED</option>
                                        <option value="Low">LOW</option>
                                    </select>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => deleteTask(task.id, task.task)}
                                        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all p-1"
                                        title="Remove"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {/* Inline Add Row */}
                        <tr className="bg-slate-800/10 border-t-2 border-slate-800">
                            <td className="px-4 py-3 text-center">
                                <span className="text-indigo-500 font-bold text-lg leading-none">+</span>
                            </td>
                            <td className="px-4 py-3">
                                <input
                                    type="text"
                                    placeholder="Enter new task..."
                                    value={newTask.task}
                                    onChange={(e) => setNewTask({ ...newTask, task: e.target.value })}
                                    onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                                    className="w-full bg-transparent border-none focus:ring-0 text-slate-100 placeholder-slate-600 p-0 text-sm font-medium"
                                />
                            </td>
                            <td className="px-4 py-3">
                                <input
                                    type="date"
                                    value={newTask.dueDate}
                                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg text-xs text-slate-400 py-1 px-2 focus:ring-0 cursor-pointer"
                                    style={{ colorScheme: "dark" }}
                                />
                            </td>
                            <td className="px-2 py-3">
                                <select
                                    value={newTask.importance}
                                    onChange={(e) => setNewTask({ ...newTask, importance: e.target.value as any })}
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-full text-[10px] font-bold text-slate-400 py-0.5 px-2 focus:ring-0 cursor-pointer"
                                >
                                    <option value="High">HIGH</option>
                                    <option value="Medium">MED</option>
                                    <option value="Low">LOW</option>
                                </select>
                            </td>
                            <td className="px-4 py-3 text-right">
                                <button
                                    onClick={handleAddTask}
                                    disabled={!newTask.task.trim()}
                                    className="text-indigo-500 hover:text-indigo-400 disabled:text-slate-700 transition-colors p-1"
                                    title="Add Task"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="flex gap-4 p-2 bg-slate-900/30 rounded-lg border border-slate-800/50">
                <div className="flex-1 flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">In Queue</span>
                    <span className="text-xl font-bold text-white">{tasks.filter(t => !t.completed).length}</span>
                </div>
            </div>
        </div>
    );
}
