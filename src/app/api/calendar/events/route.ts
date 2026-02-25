import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { google } from "googleapis";
import { getAuthContext } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthContext(request);

        if (!auth?.accessToken) {
            console.error("Session missing accessToken");
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        // Set up Google Calendar API client
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: auth.accessToken,
        });

        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        // Get start and end dates from query params
        const { searchParams } = new URL(request.url);
        const startParam = searchParams.get("start");
        const endParam = searchParams.get("end");

        let timeMin: string;
        let timeMax: string;

        if (startParam && endParam) {
            timeMin = new Date(startParam).toISOString();
            timeMax = new Date(endParam).toISOString();
        } else {
            // Default to current week
            const now = new Date();
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);

            // Adjust to start of week (Monday)
            const day = startOfDay.getDay();
            const diff = startOfDay.getDate() - day + (day === 0 ? -6 : 1);
            startOfDay.setDate(diff);

            const endOfWeek = new Date(startOfDay);
            endOfWeek.setDate(startOfDay.getDate() + 7);
            endOfWeek.setHours(23, 59, 59, 999);

            timeMin = startOfDay.toISOString();
            timeMax = endOfWeek.toISOString();
        }

        // Fetch events from Google Calendar
        const response = await calendar.events.list({
            calendarId: "primary",
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: "startTime",
            maxResults: 250, // Increased limit for broader ranges
        });

        const events = response.data.items?.map((event) => ({
            id: event.id,
            title: event.summary || "Untitled",
            description: event.description || "",
            startTime: event.start?.dateTime || event.start?.date,
            endTime: event.end?.dateTime || event.end?.date,
            status: "scheduled",
            location: event.location || "",
            htmlLink: event.htmlLink,
            meetLink: event.conferenceData?.entryPoints?.find(e => e.entryPointType === "video")?.uri || "",
            attendees: event.attendees?.map(a => ({ email: a.email, status: a.responseStatus })) || [],
        })) || [];

        return NextResponse.json({ events });
    } catch (error: unknown) {
        console.error("Calendar API error:", error);
        const message = error instanceof Error ? error.message : "Failed to fetch calendar";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
