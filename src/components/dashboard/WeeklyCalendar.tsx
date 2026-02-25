"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import PlacesAutocomplete from "@/components/PlacesAutocomplete";
import { SearchInput } from "@/components/search/SearchInput";
import { useDebounce } from "@/hooks/useDebounce";

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

interface RecurrenceRule {
    frequency: "none" | "daily" | "weekly" | "monthly" | "yearly";
    interval: number;
    endType: "never" | "count" | "until";
    count?: number;
    until?: string;
    weekdays?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
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
    isAllDay: boolean;
    recurrence: RecurrenceRule;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 12AM (0) to 11PM (23)

const DEFAULT_RECURRENCE: RecurrenceRule = {
    frequency: "none",
    interval: 1,
    endType: "never",
};

export default function WeeklyCalendar() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const debouncedSearch = useDebounce(searchQuery, 200);

    const filteredEvents = useMemo(() => {
        if (!debouncedSearch) return events;
        const query = debouncedSearch.toLowerCase();
        return events.filter(event =>
            event.title?.toLowerCase().includes(query) ||
            event.description?.toLowerCase().includes(query) ||
            event.location?.toLowerCase().includes(query)
        );
    }, [events, debouncedSearch]);

    const matchesSearch = useCallback((event: CalendarEvent) => {
        if (!debouncedSearch) return true;
        const query = debouncedSearch.toLowerCase();
        return (
            event.title?.toLowerCase().includes(query) ||
            event.description?.toLowerCase().includes(query) ||
            event.location?.toLowerCase().includes(query)
        );
    }, [debouncedSearch]);
    const [currentWeekStart, setCurrentWeekStart] = useState(() => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    });

    const [now, setNow] = useState(new Date());
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Drag-to-resize state
    const [resizingEvent, setResizingEvent] = useState<CalendarEvent | null>(null);
    const [resizeEdge, setResizeEdge] = useState<'top' | 'bottom' | null>(null);
    const [resizePreview, setResizePreview] = useState<{ top: string; height: string } | null>(null);
    const dragStartRef = useRef<{ y: number; startHour: number; endHour: number } | null>(null);

    const [formData, setFormData] = useState<EventFormData>({
        title: "",
        date: "",
        startTime: "09:00",
        endTime: "10:00",
        description: "",
        location: "",
        guests: "",
        addMeet: false,
        isAllDay: false,
        recurrence: { ...DEFAULT_RECURRENCE },
    });

    // Update derived state when currentWeekStart changes
    const startOfWeek = new Date(currentWeekStart);

    const today = new Date(); // Keep track of today for highlighting

    const fetchEvents = useCallback(async () => {
        if (!currentWeekStart) return;

        const start = new Date(currentWeekStart);
        const end = new Date(currentWeekStart);
        end.setDate(end.getDate() + 7);

        try {
            const query = new URLSearchParams({
                start: start.toISOString(),
                end: end.toISOString(),
            });

            const response = await fetch(`/api/calendar/events?${query}`);
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
    }, [currentWeekStart]);

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
            isAllDay: false,
            recurrence: { ...DEFAULT_RECURRENCE },
        });
    };

    // Check for conflicting events
    const checkConflicts = (startTime: Date, endTime: Date, excludeEventId?: string): CalendarEvent[] => {
        return events.filter(event => {
            if (excludeEventId && event.id === excludeEventId) return false;
            const eventStart = new Date(event.startTime);
            const eventEnd = new Date(event.endTime);
            // Check if time ranges overlap
            return startTime < eventEnd && endTime > eventStart;
        });
    };

    const handleSave = async () => {
        if (!formData.title || !formData.date) return;

        let startDateTime: Date;
        let endDateTime: Date;

        if (formData.isAllDay) {
            // For all-day events, use date only (no time component)
            startDateTime = new Date(formData.date);
            startDateTime.setHours(0, 0, 0, 0);
            endDateTime = new Date(formData.date);
            endDateTime.setDate(endDateTime.getDate() + 1);
            endDateTime.setHours(0, 0, 0, 0);
        } else {
            startDateTime = new Date(`${formData.date}T${formData.startTime}`);
            endDateTime = new Date(`${formData.date}T${formData.endTime}`);

            // Check for conflicts (only for timed events)
            const conflicts = checkConflicts(startDateTime, endDateTime, formData.id);
            if (conflicts.length > 0) {
                const conflictNames = conflicts.map(e => `"${e.title}"`).join(", ");
                const proceed = confirm(
                    `⚠️ Schedule Conflict Detected!\n\nThis event overlaps with: ${conflictNames}\n\nDo you want to create it anyway?`
                );
                if (!proceed) return;
            }
        }

        setSaving(true);

        try {
            const attendees = formData.guests
                .split(",")
                .map(e => e.trim())
                .filter(e => e.includes("@"));

            const payload = {
                eventId: formData.id,
                title: formData.title,
                description: formData.description,
                startTime: formData.isAllDay ? formData.date : startDateTime.toISOString(),
                endTime: formData.isAllDay ? formData.date : endDateTime.toISOString(),
                location: formData.location,
                attendees,
                addMeet: formData.addMeet,
                isAllDay: formData.isAllDay,
                recurrence: formData.recurrence.frequency !== "none" ? formData.recurrence : undefined,
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

    // Handle ESC to close and Enter to save
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!showModal) return;

            if (e.key === "Escape") {
                closeModal();
            } else if (e.key === "Enter") {
                // Don't save if in textarea (allow newlines)
                if (document.activeElement instanceof HTMLTextAreaElement) return;

                // Prevent default form submission if any
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [showModal, formData, handleSave]); // Added formData dep since handleSave uses it

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
            isAllDay: false,
            recurrence: { ...DEFAULT_RECURRENCE },
        });
        setIsEditing(false);
        setShowModal(true);
    };

    const handleEventDoubleClick = (event: CalendarEvent, e: React.MouseEvent) => {
        e.stopPropagation();
        const startDate = new Date(event.startTime);
        const endDate = new Date(event.endTime);

        // Check if it's an all-day event (no time component or spans full day)
        const isAllDay = !event.startTime.includes("T") ||
            (startDate.getHours() === 0 && startDate.getMinutes() === 0 &&
             endDate.getHours() === 0 && endDate.getMinutes() === 0);

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
            isAllDay: isAllDay,
            recurrence: { ...DEFAULT_RECURRENCE }, // TODO: Parse from event.recurrence if available
        });
        setIsEditing(true);
        setShowModal(true);
    };



    // Drag-to-resize handlers
    const handleResizeStart = (event: CalendarEvent, edge: 'top' | 'bottom', e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const start = new Date(event.startTime);
        const end = new Date(event.endTime);

        setResizingEvent(event);
        setResizeEdge(edge);
        dragStartRef.current = {
            y: e.clientY,
            startHour: start.getHours() + start.getMinutes() / 60,
            endHour: end.getHours() + end.getMinutes() / 60,
        };
    };

    const handleResizeMove = useCallback((e: MouseEvent) => {
        if (!resizingEvent || !dragStartRef.current || !scrollContainerRef.current) return;

        const containerRect = scrollContainerRef.current.getBoundingClientRect();
        const hourHeight = (HOURS.length * 48) / 24; // pixels per hour
        const deltaY = e.clientY - dragStartRef.current.y;
        const deltaHours = deltaY / hourHeight;

        let newStartHour = dragStartRef.current.startHour;
        let newEndHour = dragStartRef.current.endHour;

        if (resizeEdge === 'top') {
            newStartHour = Math.max(0, Math.min(newEndHour - 0.25, dragStartRef.current.startHour + deltaHours));
            // Snap to 15-minute increments
            newStartHour = Math.round(newStartHour * 4) / 4;
        } else if (resizeEdge === 'bottom') {
            newEndHour = Math.min(24, Math.max(newStartHour + 0.25, dragStartRef.current.endHour + deltaHours));
            // Snap to 15-minute increments
            newEndHour = Math.round(newEndHour * 4) / 4;
        }

        const top = (newStartHour / 24) * 100;
        const height = ((newEndHour - newStartHour) / 24) * 100;
        setResizePreview({ top: `${top}%`, height: `${height}%` });
    }, [resizingEvent, resizeEdge]);

    const handleResizeEnd = useCallback(async () => {
        if (!resizingEvent || !resizePreview || !dragStartRef.current) {
            setResizingEvent(null);
            setResizeEdge(null);
            setResizePreview(null);
            dragStartRef.current = null;
            return;
        }

        // Calculate new times from preview
        const topPercent = parseFloat(resizePreview.top) / 100;
        const heightPercent = parseFloat(resizePreview.height) / 100;
        const newStartHour = topPercent * 24;
        const newEndHour = (topPercent + heightPercent) * 24;

        // Get date from original event
        const originalStart = new Date(resizingEvent.startTime);
        const newStart = new Date(originalStart);
        newStart.setHours(Math.floor(newStartHour), Math.round((newStartHour % 1) * 60), 0, 0);
        const newEnd = new Date(originalStart);
        newEnd.setHours(Math.floor(newEndHour), Math.round((newEndHour % 1) * 60), 0, 0);

        // Reset state first
        const eventId = resizingEvent.id;
        setResizingEvent(null);
        setResizeEdge(null);
        setResizePreview(null);
        dragStartRef.current = null;

        // Update via API
        try {
            const response = await fetch("/api/calendar/event", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    eventId,
                    startTime: newStart.toISOString(),
                    endTime: newEnd.toISOString(),
                }),
            });

            if (!response.ok) throw new Error("Failed to update event");
            fetchEvents();
        } catch (err) {
            console.error("Failed to resize event:", err);
            fetchEvents(); // Refresh to reset UI
        }
    }, [resizingEvent, resizePreview, fetchEvents]);

    // Document-level mouse listeners for drag
    useEffect(() => {
        if (!resizingEvent) return;

        const handleMove = (e: MouseEvent) => handleResizeMove(e);
        const handleEnd = () => handleResizeEnd();

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);

        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
        };
    }, [resizingEvent, handleResizeMove, handleResizeEnd]);

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
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-white">📅 Weekly Calendar</h2>
                    <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 ml-2">
                        <button
                            onClick={() => {
                                const newDate = new Date(currentWeekStart);
                                newDate.setDate(newDate.getDate() - 7);
                                setCurrentWeekStart(newDate);
                            }}
                            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                        >
                            ←
                        </button>
                        <span className="text-xs text-slate-300 px-2 font-medium">
                            {startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(new Date(startOfWeek).setDate(startOfWeek.getDate() + 6)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <button
                            onClick={() => {
                                const newDate = new Date(currentWeekStart);
                                newDate.setDate(newDate.getDate() + 7);
                                setCurrentWeekStart(newDate);
                            }}
                            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                        >
                            →
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            const d = new Date();
                            const day = d.getDay();
                            const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                            d.setDate(diff);
                            d.setHours(0, 0, 0, 0);
                            setCurrentWeekStart(d);
                        }}
                        className="text-xs bg-slate-800 text-slate-400 hover:text-white px-2 py-1 rounded hover:bg-slate-700 ml-1"
                    >
                        Today
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search events..."
                        className="w-32"
                    />
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
                                            onDoubleClick={undefined}
                                            onClick={() => handleTimeSlotDoubleClick(dayIdx, hour)}
                                        />
                                    ))}

                                    {dayEvents.map((event) => {
                                        const pos = getEventPosition(event);
                                        const isResizing = resizingEvent?.id === event.id;
                                        const displayPos = isResizing && resizePreview ? resizePreview : pos;
                                        const isMatch = matchesSearch(event);
                                        const hasSearchQuery = !!debouncedSearch;

                                        // Calculate preview time for display during resize
                                        let displayTime = formatTime(event.startTime);
                                        let displayEndTime = formatTime(event.endTime);
                                        if (isResizing && resizePreview) {
                                            const topPercent = parseFloat(resizePreview.top) / 100;
                                            const heightPercent = parseFloat(resizePreview.height) / 100;
                                            const previewStartHour = topPercent * 24;
                                            const previewEndHour = (topPercent + heightPercent) * 24;

                                            const startH = Math.floor(previewStartHour);
                                            const startM = Math.round((previewStartHour % 1) * 60);
                                            const endH = Math.floor(previewEndHour);
                                            const endM = Math.round((previewEndHour % 1) * 60);

                                            const formatPreviewTime = (h: number, m: number) => {
                                                const period = h >= 12 ? 'PM' : 'AM';
                                                const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                                                return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
                                            };

                                            displayTime = formatPreviewTime(startH, startM);
                                            displayEndTime = formatPreviewTime(endH, endM);
                                        }

                                        return (
                                            <div
                                                key={event.id}
                                                onDoubleClick={(e) => handleEventDoubleClick(event, e)}
                                                className={`absolute left-0.5 right-0.5 rounded overflow-hidden cursor-pointer transition-colors group ${
                                                    isResizing ? 'bg-indigo-500/60 z-30' : ''
                                                } ${
                                                    hasSearchQuery && isMatch
                                                        ? 'bg-green-500/50 border-l-2 border-green-400 ring-2 ring-green-400/50 hover:bg-green-500/60'
                                                        : hasSearchQuery && !isMatch
                                                        ? 'bg-slate-700/30 border-l-2 border-slate-600 opacity-40'
                                                        : 'bg-indigo-500/40 border-l-2 border-indigo-500 hover:bg-indigo-500/60'
                                                }`}
                                                style={{ top: displayPos.top, height: displayPos.height, minHeight: "20px" }}
                                                title={`${event.title}${event.location ? `\n📍 ${event.location}` : ""}`}
                                            >
                                                {/* Top resize handle */}
                                                <div
                                                    className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 hover:bg-indigo-300/30 transition-opacity"
                                                    onMouseDown={(e) => handleResizeStart(event, 'top', e)}
                                                />

                                                {/* Event content */}
                                                <div className="px-1 py-0.5">
                                                    <div className="text-xs font-medium text-white truncate">{event.title}</div>
                                                    <div className={`text-xs truncate ${isResizing ? 'text-yellow-300 font-medium' : 'text-indigo-200'}`}>
                                                        {displayTime} - {displayEndTime}
                                                    </div>
                                                </div>

                                                {/* Bottom resize handle */}
                                                <div
                                                    className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 hover:bg-indigo-300/30 transition-opacity"
                                                    onMouseDown={(e) => handleResizeStart(event, 'bottom', e)}
                                                />
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
                                {/* All-Day Toggle */}
                                <div className="flex items-center gap-3 mb-2">
                                    <input
                                        type="checkbox"
                                        id="isAllDay"
                                        checked={formData.isAllDay}
                                        onChange={(e) => setFormData({ ...formData, isAllDay: e.target.checked })}
                                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                                    />
                                    <label htmlFor="isAllDay" className="text-sm text-slate-300">
                                        All-day event
                                    </label>
                                </div>
                                <div className={`grid ${formData.isAllDay ? 'grid-cols-1' : 'grid-cols-3'} gap-2 mb-2`}>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                                    />
                                    {!formData.isAllDay && (
                                        <>
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
                                        </>
                                    )}
                                </div>
                                {/* Duration Buttons - only show for timed events */}
                                {!formData.isAllDay && (
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
                                )}
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

                            {/* Recurrence Options */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">🔄 Repeat</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        value={formData.recurrence.frequency}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            recurrence: { ...formData.recurrence, frequency: e.target.value as RecurrenceRule["frequency"] }
                                        })}
                                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                                    >
                                        <option value="none">Does not repeat</option>
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                        <option value="yearly">Yearly</option>
                                    </select>
                                    {formData.recurrence.frequency !== "none" && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-400">Every</span>
                                            <input
                                                type="number"
                                                min={1}
                                                max={99}
                                                value={formData.recurrence.interval}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    recurrence: { ...formData.recurrence, interval: parseInt(e.target.value) || 1 }
                                                })}
                                                className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-sm text-center"
                                            />
                                            <span className="text-xs text-slate-400">
                                                {formData.recurrence.frequency === "daily" ? "day(s)" :
                                                 formData.recurrence.frequency === "weekly" ? "week(s)" :
                                                 formData.recurrence.frequency === "monthly" ? "month(s)" : "year(s)"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {formData.recurrence.frequency !== "none" && (
                                    <div className="mt-2 flex items-center gap-2">
                                        <select
                                            value={formData.recurrence.endType}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                recurrence: { ...formData.recurrence, endType: e.target.value as RecurrenceRule["endType"] }
                                            })}
                                            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                                        >
                                            <option value="never">Never ends</option>
                                            <option value="count">After X occurrences</option>
                                            <option value="until">Until date</option>
                                        </select>
                                        {formData.recurrence.endType === "count" && (
                                            <input
                                                type="number"
                                                min={1}
                                                max={999}
                                                value={formData.recurrence.count || 10}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    recurrence: { ...formData.recurrence, count: parseInt(e.target.value) || 10 }
                                                })}
                                                className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs text-center"
                                            />
                                        )}
                                        {formData.recurrence.endType === "until" && (
                                            <input
                                                type="date"
                                                value={formData.recurrence.until || ""}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    recurrence: { ...formData.recurrence, until: e.target.value }
                                                })}
                                                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs"
                                            />
                                        )}
                                    </div>
                                )}
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
