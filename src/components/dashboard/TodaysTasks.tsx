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

export default function TodaysTasks() {
    const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [expandedTask, setExpandedTask] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);

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

            {/* UP: Task List (Remaining Height - 2/3) */}
            <div
                className="flex-1 space-y-2 overflow-y-auto mb-4 border-b border-slate-800 pb-4 min-h-0"
                onDoubleClick={(e) => {
                    // Prevent triggering when clicking on a task item
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
                        const isExpanded = expandedTask === task.id;

                        return (
                            <div key={task.id} className={`rounded-lg border transition-all ${config.bg}`}>
                                <div className="p-2.5 cursor-pointer" onClick={() => toggleExpand(task.id)}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm">{config.icon}</span>
                                            <div>
                                                <h3 className="font-medium text-white text-sm">{task.title}</h3>
                                                <span className="text-xs text-slate-400">{task.time} - {task.endTime}</span>
                                            </div>
                                        </div>
                                        <span className="text-slate-400 text-xs">{isExpanded ? "▲" : "▼"}</span>
                                    </div>
                                </div>

                                {/* Expanded Details - Google Calendar style */}
                                {isExpanded && (
                                    <div className="px-3 pb-3 border-t border-slate-700/50 pt-2 space-y-2">
                                        {/* Location */}
                                        {task.location && (
                                            <div className="flex items-start gap-2 text-xs">
                                                <span className="text-slate-500">📍</span>
                                                <span className="text-slate-300">{task.location}</span>
                                            </div>
                                        )}

                                        {/* Meet Link */}
                                        {task.meetLink && (
                                            <div className="flex items-start gap-2 text-xs">
                                                <span className="text-slate-500">📹</span>
                                                <a href={task.meetLink} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline truncate">
                                                    Join Google Meet
                                                </a>
                                            </div>
                                        )}

                                        {/* Attendees */}
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

                                        {/* Description */}
                                        {task.description && (
                                            <div className="flex items-start gap-2 text-xs">
                                                <span className="text-slate-500">📝</span>
                                                <span className="text-slate-300">{task.description}</span>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="flex gap-2 pt-2">
                                            <button
                                                onClick={() => openEditModal(task)}
                                                className="flex-1 py-1.5 bg-indigo-500/20 text-indigo-300 rounded text-xs hover:bg-indigo-500/30"
                                            >
                                                ✏️ Edit
                                            </button>
                                            <button className="flex-1 py-1.5 bg-green-500/20 text-green-300 rounded text-xs hover:bg-green-500/30">
                                                ✓ Done
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* DOWN: AI Planning Chat (Bottom 1/3) */}
            <div className="h-1/3 flex flex-col bg-slate-800/30 rounded-lg border border-slate-700/50 overflow-hidden">
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
