"use client";

import { useState, useEffect, useCallback } from "react";

interface PriorityTask {
    id: string;
    task: string;
    dueDate: string;
    importance: "High" | "Medium" | "Low";
    completed: boolean;
}

const importanceConfig = {
    High: "text-red-400 bg-red-400/10 border-red-400/20",
    Medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
    Low: "text-blue-400 bg-blue-400/10 border-blue-400/20",
};

export default function TaskTable() {
    const [tasks, setTasks] = useState<PriorityTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [newTask, setNewTask] = useState({
        task: "",
        dueDate: "",
        importance: "Medium" as const,
    });

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

    const handleAddTask = async () => {
        if (!newTask.task.trim()) return;

        try {
            const response = await fetch("/api/priority-tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newTask),
            });
            if (!response.ok) throw new Error("Failed to add task");
            setNewTask({ task: "", dueDate: "", importance: "Medium" });
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

    if (loading) return <div className="p-4 text-slate-400 animate-pulse">Loading priority planner...</div>;

    const sortedTasks = [...tasks].sort((a, b) => {
        const order = { High: 0, Medium: 1, Low: 2 };
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return order[a.importance] - order[b.importance];
    });

    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="text-xl">🎯</span> Priority Planner
                </h2>
                <div className="flex gap-2 text-[10px] uppercase font-bold">
                    <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">Independent</span>
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
                        {sortedTasks.map((task) => (
                            <tr key={task.id} className={`hover:bg-indigo-500/5 transition-colors group ${task.completed ? "opacity-60" : ""}`}>
                                <td className="px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={task.completed}
                                        onChange={() => updateTask(task.id, { completed: !task.completed })}
                                        className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <span
                                        className={`${task.completed ? "line-through text-slate-500" : "text-slate-200"} font-medium cursor-text block w-full`}
                                        onDoubleClick={() => {
                                            const newTitle = prompt("Edit task:", task.task);
                                            if (newTitle !== null) updateTask(task.id, { task: newTitle || "Untitled" });
                                        }}
                                        title="Double-click to edit"
                                    >
                                        {task.task}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
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
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Planned</span>
                    <span className="text-xl font-bold text-white">{tasks.length}</span>
                </div>
                <div className="w-px bg-slate-800 my-1"></div>
                <div className="flex-1 flex flex-col items-center">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Finished</span>
                    <span className="text-xl font-bold text-green-400">{tasks.filter(t => t.completed).length}</span>
                </div>
            </div>
        </div>
    );
}
