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

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 12AM (0) to 11PM (23)

export default function WeeklyCalendar() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [now, setNow] = useState(new Date());
    const scrollContainerRef = useRef<HTMLDivElement>(null);
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

    const today = new Date();
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    startOfWeek.setHours(0, 0, 0, 0);

    const fetchEvents = useCallback(async () => {
        try {
            const response = await fetch("/api/calendar/events");
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to fetch events");
            }
            const data = await response.json();
            setEvents(data.events || []);
            setError(null);
        } catch (err: unknown) {
            console.error("Failed to fetch events:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEvents();
        const interval = setInterval(fetchEvents, 30000);
        return () => clearInterval(interval);
    }, [fetchEvents]);

    // Update current time every minute
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(interval);
    }, []);

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

    // Auto-scroll to current time (4 hours before) on load
    useEffect(() => {
        if (!loading && scrollContainerRef.current) {
            const currentHour = new Date().getHours();
            const scrollToHour = Math.max(0, currentHour - 4);
            const hourHeight = 48; // h-12 = 48px
            scrollContainerRef.current.scrollTop = scrollToHour * hourHeight;
        }
    }, [loading]);

    const getEventsForDay = (dayIndex: number) => {
        const targetDate = new Date(startOfWeek);
        targetDate.setDate(startOfWeek.getDate() + dayIndex);
        return events.filter((event) => {
            const eventDate = new Date(event.startTime);
            return eventDate.toDateString() === targetDate.toDateString();
        });
    };

    const getEventPosition = (event: CalendarEvent) => {
        const start = new Date(event.startTime);
        const end = new Date(event.endTime);
        const startHour = start.getHours() + start.getMinutes() / 60;
        const endHour = end.getHours() + end.getMinutes() / 60;
        const top = (startHour / 24) * 100;
        const height = ((endHour - startHour) / 24) * 100;
        return { top: `${Math.max(0, top)}%`, height: `${Math.min(height, 100 - top)}%` };
    };

    const getCurrentTimePosition = () => {
        const currentHour = now.getHours() + now.getMinutes() / 60;
        return (currentHour / 24) * 100;
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    };

    const formatTimeInput = (date: Date) => {
        return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    };

    const formatDateInput = (date: Date) => {
        return date.toISOString().split("T")[0];
    };

    const handleTimeSlotDoubleClick = (dayIndex: number, hour: number) => {
        const targetDate = new Date(startOfWeek);
        targetDate.setDate(startOfWeek.getDate() + dayIndex);

        setFormData({
            title: "",
            date: formatDateInput(targetDate),
            startTime: `${String(hour).padStart(2, "0")}:00`,
            endTime: `${String(hour + 1).padStart(2, "0")}:00`,
            description: "",
            location: "",
            guests: "",
            addMeet: false,
        });
        setIsEditing(false);
        setShowModal(true);
    };

    const handleEventDoubleClick = (event: CalendarEvent, e: React.MouseEvent) => {
        e.stopPropagation();
        const startDate = new Date(event.startTime);
        const endDate = new Date(event.endTime);

        setFormData({
            id: event.id,
            title: event.title,
            date: formatDateInput(startDate),
            startTime: formatTimeInput(startDate),
            endTime: formatTimeInput(endDate),
            description: event.description || "",
            location: event.location || "",
            guests: event.attendees?.map(a => a.email).join(", ") || "",
            addMeet: !!event.meetLink,
        });
        setIsEditing(true);
        setShowModal(true);
    };

    const handleSave = async () => {
        if (!formData.title || !formData.date) return;
        setSaving(true);

        try {
            const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
            const endDateTime = new Date(`${formData.date}T${formData.endTime}`);
            const attendees = formData.guests
                .split(",")
                .map(e => e.trim())
                .filter(e => e.includes("@"));

            const payload = {
                eventId: formData.id,
                title: formData.title,
                description: formData.description,
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString(),
                location: formData.location,
                attendees,
                addMeet: formData.addMeet,
            };

            const response = await fetch("/api/calendar/event", {
                method: isEditing ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error("Failed to save event");

            closeModal();
            fetchEvents();
        } catch (err) {
            alert(isEditing ? "Failed to update event" : "Failed to create event");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!formData.id || !confirm("Delete this event?")) return;
        setSaving(true);

        try {
            const response = await fetch(`/api/calendar/event?eventId=${formData.id}`, {
                method: "DELETE",
            });
            if (!response.ok) throw new Error("Failed to delete event");
            closeModal();
            fetchEvents();
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
        setIsEditing(false);
        setFormData({
            title: "",
            date: "",
            startTime: "09:00",
            endTime: "10:00",
            description: "",
            location: "",
            guests: "",
            addMeet: false,
        });
    };

    if (loading) {
        return (
            <div className="h-full flex flex-col">
                <h2 className="text-lg font-semibold text-white mb-4">📅 Weekly Calendar</h2>
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-pulse text-slate-400">Loading calendar...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">📅 Weekly Calendar</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setIsEditing(false); setShowModal(true); }}
                        className="text-xs bg-indigo-500 text-white px-2 py-1 rounded hover:bg-indigo-600"
                    >
                        + Add
                    </button>
                    <button
                        onClick={fetchEvents}
                        className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-800"
                    >
                        ↻
                    </button>
                </div>
            </div>

            {error && (
                <div className="mb-2 p-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-xs">
                    {error}
                </div>
            )}

            <p className="text-xs text-slate-500 mb-2">Double-click to create/edit</p>

            {/* Week Grid */}
            <div ref={scrollContainerRef} className="flex-1 overflow-auto">
                <div className="min-w-full">
                    {/* Day Headers */}
                    <div className="grid grid-cols-8 gap-px bg-slate-800 sticky top-0 z-10">
                        <div className="bg-slate-900 p-2 text-xs text-slate-500"></div>
                        {DAYS.map((day, idx) => {
                            const date = new Date(startOfWeek);
                            date.setDate(startOfWeek.getDate() + idx);
                            const isToday = date.toDateString() === today.toDateString();
                            return (
                                <div key={day} className={`bg-slate-900 p-2 text-center ${isToday ? "bg-indigo-900/30" : ""}`}>
                                    <div className="text-xs text-slate-400">{day}</div>
                                    <div className={`text-sm font-medium ${isToday ? "text-indigo-400" : "text-white"}`}>
                                        {date.getDate()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Time Grid */}
                    <div className="grid grid-cols-8 gap-px bg-slate-800 relative">
                        {/* Current Time Indicator Line (Absolute to grid) */}
                        <div
                            className="absolute left-0 right-0 border-t-2 border-red-500 z-20 pointer-events-none flex items-center"
                            style={{ top: `${getCurrentTimePosition()}%` }}
                        >
                            <div className="absolute -left-1 w-2 h-2 bg-red-500 rounded-full"></div>
                        </div>

                        <div className="bg-slate-900">
                            {HOURS.map((hour) => (
                                <div key={hour} className="h-12 px-2 text-xs text-slate-500 text-right border-t border-slate-800">
                                    {hour === 0 ? "12AM" : hour < 12 ? `${hour}AM` : hour === 12 ? "12PM" : `${hour - 12}PM`}
                                </div>
                            ))}
                        </div>

                        {DAYS.map((_, dayIdx) => {
                            const dayEvents = getEventsForDay(dayIdx);
                            const date = new Date(startOfWeek);
                            date.setDate(startOfWeek.getDate() + dayIdx);
                            const isToday = date.toDateString() === today.toDateString();

                            return (
                                <div
                                    key={dayIdx}
                                    className={`bg-slate-900 relative ${isToday ? "bg-indigo-900/10" : ""}`}
                                    style={{ height: `${HOURS.length * 48}px` }}
                                >
                                    {HOURS.map((hour) => (
                                        <div
                                            key={hour}
                                            className="h-12 border-t border-slate-800/50 hover:bg-slate-800/30 cursor-pointer"
                                            onDoubleClick={() => handleTimeSlotDoubleClick(dayIdx, hour)}
                                        />
                                    ))}

                                    {dayEvents.map((event) => {
                                        const pos = getEventPosition(event);
                                        return (
                                            <div
                                                key={event.id}
                                                onDoubleClick={(e) => handleEventDoubleClick(event, e)}
                                                className="absolute left-0.5 right-0.5 bg-indigo-500/40 border-l-2 border-indigo-500 rounded px-1 py-0.5 overflow-hidden cursor-pointer hover:bg-indigo-500/60 transition-colors"
                                                style={{ top: pos.top, height: pos.height, minHeight: "20px" }}
                                                title={`${event.title}${event.location ? `\n📍 ${event.location}` : ""}`}
                                            >
                                                <div className="text-xs font-medium text-white truncate">{event.title}</div>
                                                <div className="text-xs text-indigo-200 truncate">{formatTime(event.startTime)}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-semibold text-white mb-4">
                            {isEditing ? "Edit Event" : "New Event"}
                        </h3>

                        <div className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Title *</label>
                                <input
                                    type="text"
                                    placeholder="Add title"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    autoFocus
                                />
                            </div>

                            {/* Date & Time */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">Date & Time *</label>
                                <div className="grid grid-cols-3 gap-2 mb-2">
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                                    />
                                    <input
                                        type="time"
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                                    />
                                    <input
                                        type="time"
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                                    />
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

                            {/* Location */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">📍 Location</label>
                                <PlacesAutocomplete
                                    value={formData.location}
                                    onChange={(location) => setFormData({ ...formData, location })}
                                    placeholder="Add location"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                />
                            </div>

                            {/* Guests */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">👥 Guests</label>
                                <input
                                    type="text"
                                    placeholder="Add guests (comma-separated emails)"
                                    value={formData.guests}
                                    onChange={(e) => setFormData({ ...formData, guests: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                                />
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

                            {/* Description */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">📝 Description</label>
                                <textarea
                                    placeholder="Add description..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm h-20 resize-none"
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-5">
                            {isEditing && (
                                <button
                                    onClick={handleDelete}
                                    disabled={saving}
                                    className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 disabled:opacity-50"
                                >
                                    Delete
                                </button>
                            )}
                            <div className="flex-1"></div>
                            <button
                                onClick={closeModal}
                                disabled={saving}
                                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving || !formData.title || !formData.date}
                                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50"
                            >
                                {saving ? "Saving..." : isEditing ? "Save" : "Create"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
