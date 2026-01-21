"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";

interface Attendee {
    email: string;
    status?: string;
}

interface CalendarEvent {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    status: string;
    description?: string;
    location?: string;
    meetLink?: string;
    attendees?: Attendee[];
}

interface Task {
    id: string;
    title: string;
    time: string;
    endTime: string;
    startDateTime: Date;
    endDateTime: Date;
    status: "current" | "upcoming" | "completed" | "missed";
    description?: string;
    location?: string;
    meetLink?: string;
    attendees?: Attendee[];
}

interface EventFormData {
    id?: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    description: string;
    location: string;
    guests: string;
    addMeet: boolean;
}

interface ChatMessage {
    id: string;
    role: "ai" | "user";
    text: string;
    timestamp: Date;
}

const statusConfig = {
    current: { icon: "🔴", label: "Now", bg: "bg-red-500/20 border-red-500/50" },
    upcoming: { icon: "🟡", label: "Later", bg: "bg-yellow-500/20 border-yellow-500/50" },
    completed: { icon: "✅", label: "Done", bg: "bg-green-500/20 border-green-500/50" },
    missed: { icon: "❌", label: "Missed", bg: "bg-slate-500/20 border-slate-500/50" },
};

interface TodaysTasksProps {
    expanded?: boolean;
}

export default function TodaysTasks({ expanded = false }: TodaysTasksProps) {
    const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [expandedTask, setExpandedTask] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);

    // VA Tasks (Google Tasks) state
    const [vaTasks, setVaTasks] = useState<Array<{
        id: string;
        title: string;
        notes?: string;
        due?: string;
        status: string;
        completed?: string;
        listId: string;
        listTitle: string;
    }>>([]);
    const [vaTasksLoading, setVaTasksLoading] = useState(false);
    const [newVaTaskTitle, setNewVaTaskTitle] = useState("");
    const [showVaTaskInput, setShowVaTaskInput] = useState(false);

    // Chat State
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState<EventFormData>({
        title: "",
        date: "",
        startTime: "09:00",
        endTime: "10:00",
        description: "",
        location: "",
        guests: "",
        addMeet: false,
    });

    // Initial Greeting
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                id: "1",
                role: "ai",
                text: "Good morning! ☀️ Ready to plan your day? I can help you schedule tasks or check your availability.",
                timestamp: new Date()
            }]);
        }
    }, [messages.length]);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const fetchAllEvents = useCallback(async () => {
        try {
            const response = await fetch("/api/calendar/events");
            if (!response.ok) throw new Error("Failed to fetch events");
            const data = await response.json();
            setAllEvents(data.events || []);
        } catch (err) {
            console.error("Failed to fetch tasks:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllEvents();
        const interval = setInterval(fetchAllEvents, 30000);
        return () => clearInterval(interval);
    }, [fetchAllEvents]);

    // Fetch VA Tasks (Google Tasks) when expanded
    const fetchVaTasks = useCallback(async () => {
        setVaTasksLoading(true);
        try {
            const response = await fetch("/api/tasks");
            if (!response.ok) throw new Error("Failed to fetch VA Tasks");
            const data = await response.json();
            setVaTasks(data.tasks || []);
        } catch (err) {
            console.error("Failed to fetch VA Tasks:", err);
        } finally {
            setVaTasksLoading(false);
        }
    }, []);

    useEffect(() => {
        if (expanded) {
            fetchVaTasks();
        }
    }, [expanded, fetchVaTasks]);

    // Handle ESC key to close modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && showModal) {
                closeModal();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [showModal]);

    useEffect(() => {
        filterTasksForDate(selectedDate);
    }, [selectedDate, allEvents]);

    const filterTasksForDate = (date: Date) => {
        const targetDateStr = date.toDateString();
        const now = new Date();

        const dayTasks: Task[] = allEvents
            .filter((event: CalendarEvent) => {
                const eventDate = new Date(event.startTime);
                return eventDate.toDateString() === targetDateStr;
            })
            .map((event: CalendarEvent) => {
                const startTime = new Date(event.startTime);
                const endTime = new Date(event.endTime);

                let status: Task["status"] = "upcoming";
                if (targetDateStr === now.toDateString()) {
                    if (now >= startTime && now <= endTime) {
                        status = "current";
                    } else if (now > endTime) {
                        status = "completed";
                    }
                } else if (date < now) {
                    status = "completed";
                }

                return {
                    id: event.id,
                    title: event.title,
                    time: startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
                    endTime: endTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
                    startDateTime: startTime,
                    endDateTime: endTime,
                    status,
                    description: event.description,
                    location: event.location,
                    meetLink: event.meetLink,
                    attendees: event.attendees,
                };
            })
            .sort((a: Task, b: Task) => a.startDateTime.getTime() - b.startDateTime.getTime());

        setTasks(dayTasks);
    };

    const goToPreviousDay = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() - 1);
        setSelectedDate(newDate);
    };

    const goToNextDay = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + 1);
        setSelectedDate(newDate);
    };

    const goToToday = () => setSelectedDate(new Date());

    const isToday = selectedDate.toDateString() === new Date().toDateString();

    const formatDateLabel = () => {
        const dateStr = selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (isToday) return `Today, ${dateStr}`;

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (selectedDate.toDateString() === yesterday.toDateString()) return `Yesterday, ${dateStr}`;

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (selectedDate.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${dateStr}`;

        return selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    };

    const formatTimeInput = (date: Date) => {
        return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    };

    const formatDateInput = (date: Date) => date.toISOString().split("T")[0];

    const toggleExpand = (id: string) => setExpandedTask(expandedTask === id ? null : id);

    const openEditModal = (task: Task) => {
        setFormData({
            id: task.id,
            title: task.title,
            date: formatDateInput(task.startDateTime),
            startTime: formatTimeInput(task.startDateTime),
            endTime: formatTimeInput(task.endDateTime),
            description: task.description || "",
            location: task.location || "",
            guests: task.attendees?.map(a => a.email).join(", ") || "",
            addMeet: !!task.meetLink,
        });
        setShowModal(true);
    };

    const handleCreate = () => {
        const now = new Date();
        const nextHour = new Date(now);
        nextHour.setHours(now.getHours() + 1, 0, 0, 0);

        setFormData({
            title: "",
            date: formatDateInput(selectedDate),
            startTime: formatTimeInput(nextHour),
            endTime: formatTimeInput(new Date(nextHour.getTime() + 60 * 60 * 1000)),
            description: "",
            location: "",
            guests: "",
            addMeet: false,
        });
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formData.title || !formData.date) return;
        setSaving(true);

        try {
            const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
            const endDateTime = new Date(`${formData.date}T${formData.endTime}`);
            const attendees = formData.guests.split(",").map(e => e.trim()).filter(e => e.includes("@"));

            const isEventEditing = !!formData.id;

            const response = await fetch("/api/calendar/event", {
                method: isEventEditing ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    eventId: formData.id,
                    title: formData.title,
                    description: formData.description,
                    startTime: startDateTime.toISOString(),
                    endTime: endDateTime.toISOString(),
                    location: formData.location,
                    attendees,
                    addMeet: formData.addMeet,
                }),
            });

            if (!response.ok) throw new Error("Failed to save");
            closeModal();
            fetchAllEvents();
        } catch (err) {
            alert(formData.id ? "Failed to update event" : "Failed to create event");
        } finally {
            setSaving(false);
        }
    };


    const handleDelete = async () => {
        if (!formData.id || !confirm("Delete this event?")) return;
        setSaving(true);

        try {
            const response = await fetch(`/api/calendar/event?eventId=${formData.id}`, { method: "DELETE" });
            if (!response.ok) throw new Error("Failed to delete");
            closeModal();
            fetchAllEvents();
        } catch (err) {
            alert("Failed to delete event");
        } finally {
            setSaving(false);
        }
    };

    const setDuration = (minutes: number) => {
        if (!formData.startTime) return;
        const [hours, mins] = formData.startTime.split(":").map(Number);
        const start = new Date();
        start.setHours(hours, mins, 0, 0);
        const end = new Date(start.getTime() + minutes * 60000);
        const endHours = String(end.getHours()).padStart(2, "0");
        const endMins = String(end.getMinutes()).padStart(2, "0");
        setFormData({ ...formData, endTime: `${endHours}:${endMins}` });
    };

    const closeModal = () => {
        setShowModal(false);
        setFormData({ title: "", date: "", startTime: "09:00", endTime: "10:00", description: "", location: "", guests: "", addMeet: false });
    };

    const handleRecord = async () => {
        if (isRecording) {
            // Stop recording
            mediaRecorderRef.current?.stop();
            setIsRecording(false);
        } else {
            // Start recording
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;

                const audioChunks: Blob[] = [];
                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = async () => {
                    const audioBlob = new Blob(audioChunks, { type: "audio/webm" });

                    // UI Feedback
                    setMessages(prev => [...prev, {
                        id: Date.now().toString(),
                        role: "user",
                        text: "🎤 Processing voice...",
                        timestamp: new Date()
                    }]);

                    const formData = new FormData();
                    formData.append("file", audioBlob, "voice.webm");

                    try {
                        const response = await fetch("/api/transcribe", {
                            method: "POST",
                            body: formData,
                        });

                        if (!response.ok) throw new Error("Transcription failed");

                        const data = await response.json();

                        // Remove "Processing..." message and set input
                        setMessages(prev => prev.slice(0, -1));
                        setInput(data.text);
                    } catch (err) {
                        console.error("Transcription error", err);
                        setMessages(prev => {
                            const newHistory = prev.slice(0, -1);
                            return [...newHistory, {
                                id: Date.now().toString(),
                                role: "ai",
                                text: "Sorry, I couldn't hear that comfortably. Please type instead.",
                                timestamp: new Date()
                            }];
                        });
                    }
                };

                mediaRecorder.start();
                setIsRecording(true);
            } catch (err) {
                alert("Cannot access microphone");
            }
        }
    };

    const sendMessage = async () => {
        if (!input.trim()) return;

        const newUserMessage: ChatMessage = {
            id: Date.now().toString(),
            role: "user",
            text: input,
            timestamp: new Date(),
        };

        // Optimistic UI update
        const updatedMessages = [...messages, newUserMessage];
        setMessages(updatedMessages);
        setInput("");
        setIsTyping(true);

        try {
            // Convert messages for API: map 'ai' -> 'assistant'
            const apiMessages = updatedMessages.map(m => ({
                role: m.role === "ai" ? "assistant" : "user",
                content: m.text
            }));

            const response = await fetch("/api/planning/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: apiMessages,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                }),
            });

            if (!response.ok) throw new Error("Failed to send message");

            const data = await response.json();

            const aiResponse: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "ai",
                text: data.message.content,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, aiResponse]);

            // If the AI mentioned scheduling/creating, refersh the calendar
            if (data.message.content.toLowerCase().includes("scheduled") || data.message.content.toLowerCase().includes("created")) {
                fetchAllEvents();
            }

        } catch (error) {
            console.error("Chat Error:", error);
            const errorResponse: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: "ai",
                text: "Sorry, I encountered an error connecting to the planner service.",
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorResponse]);
        } finally {
            setIsTyping(false);
        }
    };

    if (loading) {
        return (
            <div className="h-full flex flex-col">
                <h2 className="text-lg font-semibold text-white mb-4">📋 Daily Tasks</h2>
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-pulse text-slate-400">Loading...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <h2 className="text-lg font-semibold text-white mb-3">📋 Daily Tasks</h2>

            {/* Date Navigation */}
            <div className="flex items-center justify-between mb-3 bg-slate-800/50 rounded-lg p-2">
                <button onClick={goToPreviousDay} className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded">←</button>
                <div className="flex items-center gap-2">
                    <span className="font-medium text-white text-sm">{formatDateLabel()}</span>
                    {!isToday && (
                        <button onClick={goToToday} className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-0.5 rounded hover:bg-slate-700">Today</button>
                    )}
                </div>
                <button onClick={goToNextDay} className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded">→</button>
            </div>

            <div className="text-xs text-slate-500 mb-2">{tasks.length} event{tasks.length !== 1 ? "s" : ""}</div>

            {/* VA Tasks Row - Spans both columns when expanded */}
            {expanded && (
                <div className="col-span-2 bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/30 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-lg">📋</span>
                            <h3 className="text-sm font-semibold text-white">VA Tasks</h3>
                            <span className="text-xs text-purple-400">({vaTasks.filter(t => t.status !== 'completed').length} pending)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowVaTaskInput(true)}
                                className="text-xs text-green-400 hover:text-green-300 px-2 py-0.5 rounded hover:bg-green-500/20"
                            >
                                + Add Task
                            </button>
                            <button
                                onClick={fetchVaTasks}
                                className="text-xs text-purple-400 hover:text-purple-300 px-2 py-0.5 rounded hover:bg-purple-500/20"
                            >
                                ↻ Refresh
                            </button>
                        </div>
                    </div>

                    {/* Inline Add Task Input */}
                    {showVaTaskInput && (
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={newVaTaskTitle}
                                onChange={(e) => setNewVaTaskTitle(e.target.value)}
                                placeholder="Enter new task..."
                                autoFocus
                                className="flex-1 bg-slate-800 border border-purple-500/50 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                onKeyDown={async (e) => {
                                    if (e.key === 'Enter' && newVaTaskTitle.trim()) {
                                        try {
                                            await fetch("/api/tasks", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ title: newVaTaskTitle.trim() }),
                                            });
                                            setNewVaTaskTitle("");
                                            setShowVaTaskInput(false);
                                            fetchVaTasks();
                                        } catch (err) {
                                            console.error("Failed to create task:", err);
                                        }
                                    } else if (e.key === 'Escape') {
                                        setNewVaTaskTitle("");
                                        setShowVaTaskInput(false);
                                    }
                                }}
                            />
                            <button
                                onClick={async () => {
                                    if (newVaTaskTitle.trim()) {
                                        try {
                                            await fetch("/api/tasks", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ title: newVaTaskTitle.trim() }),
                                            });
                                            setNewVaTaskTitle("");
                                            setShowVaTaskInput(false);
                                            fetchVaTasks();
                                        } catch (err) {
                                            console.error("Failed to create task:", err);
                                        }
                                    }
                                }}
                                className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600"
                            >
                                Add
                            </button>
                            <button
                                onClick={() => {
                                    setNewVaTaskTitle("");
                                    setShowVaTaskInput(false);
                                }}
                                className="px-3 py-1.5 bg-slate-700 text-slate-300 text-sm rounded-lg hover:bg-slate-600"
                            >
                                Cancel
                            </button>
                        </div>
                    )}

                    {vaTasksLoading ? (
                        <div className="text-sm text-slate-400 py-2">Loading VA Tasks...</div>
                    ) : vaTasks.length === 0 && !showVaTaskInput ? (
                        <div className="text-sm text-slate-500 py-2">No tasks in VA Tasks list. Click "+ Add Task" to create one.</div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {vaTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className={`group flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${task.status === 'completed'
                                        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                        : 'bg-purple-500/20 text-purple-200 border border-purple-500/30 hover:bg-purple-500/30'
                                        }`}
                                >
                                    {/* Checkbox */}
                                    <button
                                        onClick={async () => {
                                            const newStatus = task.status !== 'completed';
                                            setVaTasks(prev => prev.map(t =>
                                                t.id === task.id
                                                    ? { ...t, status: newStatus ? 'completed' : 'needsAction' }
                                                    : t
                                            ));
                                            try {
                                                await fetch("/api/tasks", {
                                                    method: "PUT",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({
                                                        taskId: task.id,
                                                        listId: task.listId,
                                                        completed: newStatus,
                                                    }),
                                                });
                                            } catch (err) {
                                                console.error("Failed to toggle task:", err);
                                                fetchVaTasks();
                                            }
                                        }}
                                        className="hover:scale-110 transition-transform"
                                    >
                                        {task.status === 'completed' ? '✓' : '○'}
                                    </button>

                                    {/* Editable title */}
                                    <span
                                        className={`cursor-text ${task.status === 'completed' ? 'line-through' : ''}`}
                                        onDoubleClick={(e) => {
                                            const newTitle = prompt("Edit task title:", task.title);
                                            if (newTitle?.trim() && newTitle !== task.title) {
                                                setVaTasks(prev => prev.map(t =>
                                                    t.id === task.id ? { ...t, title: newTitle.trim() } : t
                                                ));
                                                fetch("/api/tasks", {
                                                    method: "PUT",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({
                                                        taskId: task.id,
                                                        listId: task.listId,
                                                        title: newTitle.trim(),
                                                    }),
                                                }).catch(() => fetchVaTasks());
                                            }
                                        }}
                                        title="Double-click to edit"
                                    >
                                        {task.title}
                                    </span>

                                    {/* Delete button */}
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            if (!confirm(`Delete "${task.title}"?`)) return;
                                            setVaTasks(prev => prev.filter(t => t.id !== task.id));
                                            try {
                                                await fetch(`/api/tasks?taskId=${task.id}&listId=${task.listId}`, {
                                                    method: "DELETE",
                                                });
                                            } catch (err) {
                                                console.error("Failed to delete task:", err);
                                                fetchVaTasks();
                                            }
                                        }}
                                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity ml-1"
                                        title="Delete task"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Main Content Area - Two columns when expanded */}
            <div className={`flex-1 min-h-0 ${expanded ? 'grid grid-cols-2 gap-4' : ''}`}>
                {/* Task List */}
                <div
                    className={`space-y-2 overflow-y-auto ${expanded ? '' : 'mb-4 border-b border-slate-800 pb-4'}`}
                    onDoubleClick={(e) => {
                        if (e.target === e.currentTarget) {
                            handleCreate();
                        }
                    }}
                >
                    {tasks.length === 0 ? (
                        <div className="text-center text-slate-500 py-6 pointer-events-none">
                            <p className="text-3xl mb-1">📭</p>
                            <p className="text-sm">No events for {formatDateLabel().toLowerCase()}</p>
                            <p className="text-xs mt-2">Double-click to add one</p>
                        </div>
                    ) : (
                        tasks.map((task) => {
                            const config = statusConfig[task.status];
                            const isSelected = selectedTask?.id === task.id;
                            const isExpanded = !expanded && expandedTask === task.id;

                            return (
                                <div
                                    key={task.id}
                                    className={`rounded-lg border transition-all cursor-pointer ${config.bg} ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
                                    onClick={() => {
                                        if (expanded) {
                                            setSelectedTask(task);
                                        } else {
                                            toggleExpand(task.id);
                                        }
                                    }}
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        openEditModal(task);
                                    }}
                                >
                                    <div className="p-2.5">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">{config.icon}</span>
                                                <div>
                                                    <h3 className="font-medium text-white text-sm">{task.title}</h3>
                                                    <span className="text-xs text-slate-400">{task.time} - {task.endTime}</span>
                                                </div>
                                            </div>
                                            {!expanded && (
                                                <span className="text-slate-400 text-xs">{isExpanded ? "▲" : "▼"}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expanded Details - Only in single column mode */}
                                    {isExpanded && (
                                        <div className="px-3 pb-3 border-t border-slate-700/50 pt-2 space-y-2">
                                            {task.location && (
                                                <div className="flex items-start gap-2 text-xs">
                                                    <span className="text-slate-500">📍</span>
                                                    <span className="text-slate-300">{task.location}</span>
                                                </div>
                                            )}
                                            {task.meetLink && (
                                                <div className="flex items-start gap-2 text-xs">
                                                    <span className="text-slate-500">📹</span>
                                                    <a href={task.meetLink} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline truncate">
                                                        Join Google Meet
                                                    </a>
                                                </div>
                                            )}
                                            {task.attendees && task.attendees.length > 0 && (
                                                <div className="flex items-start gap-2 text-xs">
                                                    <span className="text-slate-500">👥</span>
                                                    <div className="text-slate-300">
                                                        {task.attendees.map((a, i) => (
                                                            <span key={a.email}>
                                                                {a.email}{a.status === "accepted" ? " ✓" : a.status === "declined" ? " ✗" : ""}
                                                                {i < task.attendees!.length - 1 ? ", " : ""}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {task.description && (
                                                <div className="flex items-start gap-2 text-xs">
                                                    <span className="text-slate-500">📝</span>
                                                    <span className="text-slate-300">{task.description}</span>
                                                </div>
                                            )}
                                            <div className="flex gap-2 pt-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openEditModal(task); }}
                                                    className="flex-1 py-1.5 bg-indigo-500/20 text-indigo-300 rounded text-xs hover:bg-indigo-500/30"
                                                >
                                                    ✏️ Edit
                                                </button>
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        if (!confirm(`Delete "${task.title}"?`)) return;
                                                        try {
                                                            const response = await fetch(`/api/calendar/event?eventId=${task.id}`, { method: "DELETE" });
                                                            if (!response.ok) throw new Error("Failed to delete");
                                                            fetchAllEvents();
                                                            setExpandedTask(null);
                                                        } catch (err) {
                                                            alert("Failed to delete event");
                                                        }
                                                    }}
                                                    className="flex-1 py-1.5 bg-red-500/20 text-red-300 rounded text-xs hover:bg-red-500/30"
                                                >
                                                    🗑️ Delete
                                                </button>
                                                <button className="flex-1 py-1.5 bg-green-500/20 text-green-300 rounded text-xs hover:bg-green-500/30">
                                                    ✓ Done
                                                </button>
                                                <button className="flex-1 py-1.5 bg-slate-500/20 text-slate-400 rounded text-xs hover:bg-slate-500/30">
                                                    ⭕ Incomplete
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Detail Panel - Only shown when expanded */}
                {expanded && (
                    <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-4 overflow-y-auto">
                        {selectedTask ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-white">{selectedTask.title}</h3>
                                    <span className={`px-2 py-1 rounded text-xs ${statusConfig[selectedTask.status].bg}`}>
                                        {statusConfig[selectedTask.status].icon} {statusConfig[selectedTask.status].label}
                                    </span>
                                </div>

                                <div className="text-sm text-indigo-300">
                                    🕐 {selectedTask.time} - {selectedTask.endTime}
                                </div>

                                {selectedTask.location && (
                                    <div className="flex items-center gap-2 text-sm text-slate-300">
                                        <span>📍</span>
                                        <span>{selectedTask.location}</span>
                                    </div>
                                )}

                                {selectedTask.meetLink && (
                                    <div className="flex items-center gap-2">
                                        <span>📹</span>
                                        <a href={selectedTask.meetLink} target="_blank" rel="noopener noreferrer"
                                            className="text-sm text-indigo-400 hover:underline">
                                            Join Google Meet
                                        </a>
                                    </div>
                                )}

                                {selectedTask.attendees && selectedTask.attendees.length > 0 && (
                                    <div className="space-y-1">
                                        <div className="text-xs text-slate-500">👥 Attendees</div>
                                        <div className="space-y-1">
                                            {selectedTask.attendees.map((a) => (
                                                <div key={a.email} className="text-sm text-slate-300 flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs">
                                                        {a.email[0].toUpperCase()}
                                                    </span>
                                                    {a.email}
                                                    {a.status === "accepted" && <span className="text-green-400">✓</span>}
                                                    {a.status === "declined" && <span className="text-red-400">✗</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Description / Checklist */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs text-slate-500">📝 Notes & Checklist</div>
                                        <button
                                            onClick={() => {
                                                const newItem = "\n[ ] New item";
                                                const updatedDesc = (selectedTask.description || "") + newItem;
                                                // Update locally first
                                                setSelectedTask({ ...selectedTask, description: updatedDesc });
                                                // Save to API
                                                fetch("/api/calendar/event", {
                                                    method: "PUT",
                                                    headers: { "Content-Type": "application/json" },
                                                    body: JSON.stringify({
                                                        eventId: selectedTask.id,
                                                        description: updatedDesc,
                                                    }),
                                                }).then(() => fetchAllEvents());
                                            }}
                                            className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-0.5 rounded hover:bg-slate-700"
                                        >
                                            + Add Item
                                        </button>
                                    </div>

                                    {selectedTask.description ? (
                                        <div
                                            className="space-y-1"
                                            onDoubleClick={(e) => {
                                                // If double clicking the container itself (not an item), add new item
                                                if (e.target === e.currentTarget) {
                                                    const newItem = "\n[ ] New item";
                                                    const updatedDesc = (selectedTask.description || "") + newItem;
                                                    setSelectedTask({ ...selectedTask, description: updatedDesc });
                                                    fetch("/api/calendar/event", {
                                                        method: "PUT",
                                                        headers: { "Content-Type": "application/json" },
                                                        body: JSON.stringify({
                                                            eventId: selectedTask.id,
                                                            description: updatedDesc,
                                                        }),
                                                    }).then(() => fetchAllEvents());
                                                }
                                            }}
                                        >
                                            {selectedTask.description.split('\n').map((line, idx) => {
                                                // Check if line is a checklist item
                                                const uncheckedMatch = line.match(/^\s*\[\s*\]\s*(.*)$/);
                                                const checkedMatch = line.match(/^\s*\[x\]\s*(.*)$/i);

                                                if (uncheckedMatch || checkedMatch) {
                                                    const isChecked = !!checkedMatch;
                                                    const itemText = (uncheckedMatch?.[1] || checkedMatch?.[1] || "").trim();

                                                    return (
                                                        <div key={idx} className="flex items-start gap-2 group">
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => {
                                                                    // Toggle the checkbox in the description
                                                                    const lines = selectedTask.description!.split('\n');
                                                                    if (isChecked) {
                                                                        lines[idx] = lines[idx].replace(/\[x\]/i, '[ ]');
                                                                    } else {
                                                                        lines[idx] = lines[idx].replace(/\[\s*\]/, '[x]');
                                                                    }
                                                                    const updatedDesc = lines.join('\n');
                                                                    setSelectedTask({ ...selectedTask, description: updatedDesc });
                                                                    // Save to API
                                                                    fetch("/api/calendar/event", {
                                                                        method: "PUT",
                                                                        headers: { "Content-Type": "application/json" },
                                                                        body: JSON.stringify({
                                                                            eventId: selectedTask.id,
                                                                            description: updatedDesc,
                                                                        }),
                                                                    }).then(() => fetchAllEvents());
                                                                }}
                                                                className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                                                            />
                                                            <input
                                                                type="text"
                                                                defaultValue={itemText || "New item"}
                                                                onBlur={(e) => {
                                                                    const newText = e.target.value.trim() || "New item";
                                                                    const lines = selectedTask.description!.split('\n');
                                                                    const prefix = isChecked ? '[x] ' : '[ ] ';
                                                                    lines[idx] = prefix + newText;
                                                                    const updatedDesc = lines.join('\n');
                                                                    setSelectedTask({ ...selectedTask, description: updatedDesc });
                                                                    fetch("/api/calendar/event", {
                                                                        method: "PUT",
                                                                        headers: { "Content-Type": "application/json" },
                                                                        body: JSON.stringify({
                                                                            eventId: selectedTask.id,
                                                                            description: updatedDesc,
                                                                        }),
                                                                    }).then(() => fetchAllEvents());
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.currentTarget.blur();
                                                                    }
                                                                }}
                                                                className={`text-sm flex-1 bg-transparent border-none outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 -ml-1 ${isChecked ? 'text-slate-500 line-through' : 'text-slate-300'}`}
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const lines = selectedTask.description!.split('\n');
                                                                    lines.splice(idx, 1);
                                                                    const updatedDesc = lines.join('\n');
                                                                    setSelectedTask({ ...selectedTask, description: updatedDesc });
                                                                    fetch("/api/calendar/event", {
                                                                        method: "PUT",
                                                                        headers: { "Content-Type": "application/json" },
                                                                        body: JSON.stringify({
                                                                            eventId: selectedTask.id,
                                                                            description: updatedDesc,
                                                                        }),
                                                                    }).then(() => fetchAllEvents());
                                                                }}
                                                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    );
                                                } else if (line.trim()) {
                                                    // Regular text line
                                                    return (
                                                        <p key={idx} className="text-sm text-slate-300">{line}</p>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-500 italic">No notes yet. Click "+ Add Item" to create a checklist.</p>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-4 border-t border-slate-700">
                                    <button
                                        onClick={() => openEditModal(selectedTask)}
                                        className="flex-1 py-2 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600"
                                    >
                                        ✏️ Edit
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!confirm(`Delete "${selectedTask.title}"?`)) return;
                                            try {
                                                const response = await fetch(`/api/calendar/event?eventId=${selectedTask.id}`, { method: "DELETE" });
                                                if (!response.ok) throw new Error("Failed to delete");
                                                fetchAllEvents();
                                                setSelectedTask(null);
                                            } catch (err) {
                                                alert("Failed to delete event");
                                            }
                                        }}
                                        className="flex-1 py-2 bg-red-500/20 text-red-300 rounded-lg text-sm hover:bg-red-500/30"
                                    >
                                        🗑️ Delete
                                    </button>
                                    <button className="flex-1 py-2 bg-green-500/20 text-green-300 rounded-lg text-sm hover:bg-green-500/30">
                                        ✓ Done
                                    </button>
                                    <button className="flex-1 py-2 bg-slate-500/20 text-slate-400 rounded-lg text-sm hover:bg-slate-500/30">
                                        ⭕ Incomplete
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-500">
                                <div className="text-center">
                                    <p className="text-3xl mb-2">👆</p>
                                    <p className="text-sm">Select a task to view details</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* AI Planning Chat - Always visible */}
            <div className={`${expanded ? 'h-48' : 'h-1/3'} flex flex-col bg-slate-800/30 rounded-lg border border-slate-700/50 overflow-hidden mt-4`}>
                <div className="p-2 border-b border-slate-700/50 bg-slate-800/50 flex items-center gap-2">
                    <span className="text-lg">🤖</span>
                    <span className="text-xs font-medium text-slate-300">AI Planner</span>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[85%] rounded-lg p-2 text-xs leading-relaxed ${msg.role === "user"
                                ? "bg-indigo-600 text-white rounded-br-none"
                                : "bg-slate-700 text-slate-200 rounded-bl-none"
                                }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-slate-700 rounded-lg p-2 rounded-bl-none flex gap-1">
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-2 bg-slate-800/50 border-t border-slate-700/50">
                    <div className="flex items-center gap-2">
                        <button
                            className={`p-1.5 rounded-md transition-colors ${isRecording ? "bg-red-500 text-white animate-pulse" : "bg-slate-700 text-slate-400 hover:text-white"
                                }`}
                            onClick={handleRecord}
                            title="Hold to record"
                        >
                            {isRecording ? "⏹" : "🎤"}
                        </button>
                        <input
                            type="text"
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 text-base"
                            placeholder={isRecording ? "Listening..." : "Add a task..."}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                            disabled={isRecording}
                        />
                        <button
                            className={`p-1.5 rounded-md transition-colors ${input.trim() ? "bg-indigo-500 hover:bg-indigo-600 text-white" : "bg-slate-700 text-slate-500 cursor-not-allowed"
                                }`}
                            onClick={sendMessage}
                            disabled={!input.trim()}
                        >
                            ➤
                        </button>
                    </div>
                </div>
            </div>

            {/* Edit Modal - Same as Calendar */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-white mb-4">Edit Event</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Title *</label>
                                <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
                            </div>

                            {/* Date & Time */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Date & Time *</label>
                                <div className="grid grid-cols-3 gap-2 mb-2">
                                    <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
                                    <input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
                                    <input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
                                </div>
                                {/* Duration Buttons */}
                                <div className="flex gap-2 flex-wrap">
                                    {[15, 30, 45, 60, 90, 120].map((mins) => (
                                        <button
                                            key={mins}
                                            onClick={() => setDuration(mins)}
                                            className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                                        >
                                            {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-1">📍 Location</label>
                                <PlacesAutocomplete
                                    value={formData.location}
                                    onChange={(location) => setFormData({ ...formData, location })}
                                    placeholder="Add location"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-1">👥 Guests</label>
                                <input type="text" placeholder="Comma-separated emails" value={formData.guests} onChange={(e) => setFormData({ ...formData, guests: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm" />
                            </div>

                            {/* Google Meet Toggle */}
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="addMeet"
                                    checked={formData.addMeet}
                                    onChange={(e) => setFormData({ ...formData, addMeet: e.target.checked })}
                                    className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-indigo-500"
                                />
                                <label htmlFor="addMeet" className="text-sm text-slate-300">
                                    📹 Add Google Meet video conferencing
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm text-slate-400 mb-1">📝 Description</label>
                                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm h-20 resize-none" />
                            </div>
                        </div>

                        <div className="flex gap-2 mt-5">
                            <button onClick={handleDelete} disabled={saving} className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 disabled:opacity-50">Delete</button>
                            <div className="flex-1"></div>
                            <button onClick={closeModal} disabled={saving} className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50">Cancel</button>
                            <button onClick={handleSave} disabled={saving || !formData.title} className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
