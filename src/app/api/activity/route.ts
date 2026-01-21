import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { google } from "googleapis";
import { authOptions } from "@/lib/auth";
import fs from "fs";
import path from "path";

const PRIORITY_DATA_PATH = path.join(process.cwd(), "src/data/priority_tasks.json");

interface ActivityEntry {
    id: string;
    actor: "ai" | "user";
    action: string;
    timestamp: string;
    status: "success" | "warning" | "info";
    actualTime: string;
}

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.accessToken) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const activities: ActivityEntry[] = [];
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // 1. Fetch Calendar Activities (Past Events)
        try {
            const oauth2Client = new google.auth.OAuth2();
            oauth2Client.setCredentials({ access_token: session.accessToken });
            const calendar = google.calendar({ version: "v3", auth: oauth2Client });

            const calendarResponse = await calendar.events.list({
                calendarId: "primary",
                timeMin: yesterday.toISOString(),
                timeMax: now.toISOString(),
                singleEvents: true,
                orderBy: "startTime",
            });

            calendarResponse.data.items?.forEach(event => {
                const endTime = new Date(event.end?.dateTime || event.end?.date || "");
                if (endTime < now) {
                    activities.push({
                        id: `cal-${event.id}`,
                        actor: "user",
                        action: `Completed "${event.summary || "Untitled Event"}"`,
                        timestamp: endTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
                        status: "success",
                        actualTime: endTime.toISOString(),
                    });
                }
            });
        } catch (err) {
            console.error("Error fetching calendar for activity:", err);
        }

        // 2. Fetch Priority Planner Activities
        try {
            if (fs.existsSync(PRIORITY_DATA_PATH)) {
                const data = JSON.parse(fs.readFileSync(PRIORITY_DATA_PATH, "utf8"));
                data.forEach((task: any) => {
                    if (task.completed && task.completedAt) {
                        const compTime = new Date(task.completedAt);
                        if (compTime >= yesterday) {
                            activities.push({
                                id: `pri-${task.id}`,
                                actor: "user",
                                action: `Finished priority task: "${task.task}"`,
                                timestamp: compTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
                                status: "success",
                                actualTime: compTime.toISOString(),
                            });
                        }
                    }
                });
            }
        } catch (err) {
            console.error("Error fetching priority tasks for activity:", err);
        }

        // Sort by actualTime descending
        activities.sort((a, b) => new Date(b.actualTime).getTime() - new Date(a.actualTime).getTime());

        return NextResponse.json({ activities });
    } catch (error) {
        console.error("Activity API error:", error);
        return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
    }
}
