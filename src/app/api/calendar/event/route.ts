import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getAuthContext } from "@/lib/auth";

// CREATE a new event
export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthContext(request);
        if (!auth?.accessToken) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const body = await request.json();
        const { title, description, startTime, endTime, location, attendees, addMeet, isAllDay, recurrence } = body;

        if (!title || !startTime) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: auth.accessToken,
        });

        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        const eventData: Record<string, unknown> = {
            summary: title,
            description: description || "",
            location: location || "",
        };

        // Handle all-day vs timed events
        if (isAllDay) {
            // All-day events use 'date' instead of 'dateTime'
            eventData.start = { date: startTime };
            eventData.end = { date: endTime || startTime };
        } else {
            eventData.start = {
                dateTime: new Date(startTime).toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            };
            eventData.end = {
                dateTime: new Date(endTime).toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            };
        }

        // Add attendees if provided
        if (attendees && attendees.length > 0) {
            eventData.attendees = attendees.map((email: string) => ({ email }));
        }

        // Add Google Meet if requested
        if (addMeet) {
            eventData.conferenceData = {
                createRequest: {
                    requestId: `meet-${Date.now()}`,
                    conferenceSolutionKey: { type: "hangoutsMeet" },
                },
            };
        }

        // Add recurrence rule if provided
        if (recurrence && recurrence.frequency !== "none") {
            const freqMap: Record<string, string> = {
                daily: "DAILY",
                weekly: "WEEKLY",
                monthly: "MONTHLY",
                yearly: "YEARLY",
            };

            let rrule = `RRULE:FREQ=${freqMap[recurrence.frequency]}`;

            if (recurrence.interval > 1) {
                rrule += `;INTERVAL=${recurrence.interval}`;
            }

            if (recurrence.endType === "count" && recurrence.count) {
                rrule += `;COUNT=${recurrence.count}`;
            } else if (recurrence.endType === "until" && recurrence.until) {
                // Format: YYYYMMDD
                const untilDate = recurrence.until.replace(/-/g, "");
                rrule += `;UNTIL=${untilDate}`;
            }

            eventData.recurrence = [rrule];
        }

        const event = await calendar.events.insert({
            calendarId: "primary",
            requestBody: eventData,
            conferenceDataVersion: addMeet ? 1 : 0,
            sendUpdates: attendees?.length > 0 ? "all" : "none",
        });

        return NextResponse.json({
            success: true,
            event: {
                id: event.data.id,
                title: event.data.summary,
                startTime: event.data.start?.dateTime,
                endTime: event.data.end?.dateTime,
                location: event.data.location,
                meetLink: event.data.conferenceData?.entryPoints?.[0]?.uri,
            }
        });
    } catch (error: unknown) {
        console.error("Create event error:", error);
        const message = error instanceof Error ? error.message : "Failed to create event";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// UPDATE an existing event (supports partial updates)
export async function PUT(request: NextRequest) {
    try {
        const auth = await getAuthContext(request);
        if (!auth?.accessToken) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const body = await request.json();
        const { eventId, title, description, startTime, endTime, location, attendees } = body;

        if (!eventId) {
            return NextResponse.json({ error: "Event ID required" }, { status: 400 });
        }

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: auth.accessToken,
        });

        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        // Fetch existing event to support partial updates
        const existingEvent = await calendar.events.get({
            calendarId: "primary",
            eventId: eventId,
        });

        const eventData: Record<string, unknown> = {
            summary: title ?? existingEvent.data.summary,
            description: description ?? existingEvent.data.description ?? "",
            location: location ?? existingEvent.data.location ?? "",
            start: startTime ? {
                dateTime: new Date(startTime).toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            } : existingEvent.data.start,
            end: endTime ? {
                dateTime: new Date(endTime).toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            } : existingEvent.data.end,
        };

        // Add attendees if provided, otherwise keep existing
        if (attendees && attendees.length > 0) {
            eventData.attendees = attendees.map((email: string) => ({ email }));
        } else if (existingEvent.data.attendees) {
            eventData.attendees = existingEvent.data.attendees;
        }

        const event = await calendar.events.update({
            calendarId: "primary",
            eventId: eventId,
            requestBody: eventData,
            sendUpdates: attendees?.length > 0 ? "all" : "none",
        });

        return NextResponse.json({
            success: true,
            event: {
                id: event.data.id,
                title: event.data.summary,
                startTime: event.data.start?.dateTime,
                endTime: event.data.end?.dateTime,
                location: event.data.location,
            }
        });
    } catch (error: unknown) {
        console.error("Update event error:", error);
        const message = error instanceof Error ? error.message : "Failed to update event";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// DELETE an event
export async function DELETE(request: NextRequest) {
    try {
        const auth = await getAuthContext(request);
        if (!auth?.accessToken) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const eventId = searchParams.get("eventId");

        if (!eventId) {
            return NextResponse.json({ error: "Event ID required" }, { status: 400 });
        }

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: auth.accessToken,
        });

        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        await calendar.events.delete({
            calendarId: "primary",
            eventId: eventId,
            sendUpdates: "all",
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Delete event error:", error);
        const message = error instanceof Error ? error.message : "Failed to delete event";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
