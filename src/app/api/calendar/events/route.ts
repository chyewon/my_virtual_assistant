import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { google } from "googleapis";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.accessToken) {
            console.error("Session missing accessToken");
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        console.log("Using Access Token:", session.accessToken.substring(0, 10) + "...");

        // Set up Google Calendar API client
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: session.accessToken,
        });

        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        // Get start and end of the week
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() + 7);
        endOfWeek.setHours(23, 59, 59, 999);

        // Fetch events from Google Calendar
        const response = await calendar.events.list({
            calendarId: "primary",
            timeMin: startOfDay.toISOString(),
            timeMax: endOfWeek.toISOString(),
            singleEvents: true,
            orderBy: "startTime",
            maxResults: 50,
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
