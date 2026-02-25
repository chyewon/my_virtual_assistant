import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getAuthContext } from "@/lib/auth";
import { getUserDataPaths } from "@/lib/userData";
import fs from "fs";

interface HiddenItem {
    id: string;
    hiddenAt: string;
    expiresAt: string;
}

interface HiddenItemsData {
    hiddenItems: HiddenItem[];
    lastUpdated: string | null;
}

interface ActivityEntry {
    id: string;
    actor: "ai" | "user";
    action: string;
    timestamp: string;
    status: "success" | "warning" | "info";
    actualTime: string;
    impactScore: number;
    importance?: "High" | "Medium" | "Low";
    category: "work" | "email" | "calendar" | "task";
    rawTitle?: string;
}

interface DailyStats {
    tasks: number;
    emails: number;
    events: number;
    total: number;
}

interface ActivityHistory {
    dailyStats: Record<string, DailyStats>;
    lastUpdated: string | null;
}

interface StreakInfo {
    current: number;
    lastSevenDays: number;
}

interface Streaks {
    task: StreakInfo;
    email: StreakInfo;
    active: StreakInfo;
}

function getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
}

function getOrdinalSuffix(day: number): string {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

function formatTimestamp(date: Date): string {
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}${getOrdinalSuffix(day)}`;
}

function loadActivityHistory(filePath: string): ActivityHistory {
    try {
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
            return data;
        }
    } catch (err) {
        console.error("Error loading activity history:", err);
    }
    return { dailyStats: {}, lastUpdated: null };
}

function saveActivityHistory(filePath: string, history: ActivityHistory): void {
    try {
        history.lastUpdated = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(history, null, 2));
    } catch (err) {
        console.error("Error saving activity history:", err);
    }
}

function calculateStreaks(history: ActivityHistory): Streaks {
    const today = new Date();
    const dates: string[] = [];

    // Generate last 30 days of date keys for streak calculation
    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(getDateKey(date));
    }

    // Calculate task streak (consecutive days with tasks > 0)
    let taskStreak = 0;
    for (const dateKey of dates) {
        const dayStats = history.dailyStats[dateKey];
        if (dayStats && dayStats.tasks > 0) {
            taskStreak++;
        } else if (dateKey !== dates[0]) {
            // Allow today to be incomplete
            break;
        }
    }

    // Calculate email streak (consecutive days with emails > 0)
    let emailStreak = 0;
    for (const dateKey of dates) {
        const dayStats = history.dailyStats[dateKey];
        if (dayStats && dayStats.emails > 0) {
            emailStreak++;
        } else if (dateKey !== dates[0]) {
            break;
        }
    }

    // Calculate active streak (consecutive days with total >= 3)
    let activeStreak = 0;
    for (const dateKey of dates) {
        const dayStats = history.dailyStats[dateKey];
        if (dayStats && dayStats.total >= 3) {
            activeStreak++;
        } else if (dateKey !== dates[0]) {
            break;
        }
    }

    // Calculate last 7 days counts (forgiving format)
    const last7Dates = dates.slice(0, 7);
    const taskDays = last7Dates.filter(d => {
        const stats = history.dailyStats[d];
        return stats && stats.tasks > 0;
    }).length;

    const emailDays = last7Dates.filter(d => {
        const stats = history.dailyStats[d];
        return stats && stats.emails > 0;
    }).length;

    const activeDays = last7Dates.filter(d => {
        const stats = history.dailyStats[d];
        return stats && stats.total >= 3;
    }).length;

    return {
        task: { current: taskStreak, lastSevenDays: taskDays },
        email: { current: emailStreak, lastSevenDays: emailDays },
        active: { current: activeStreak, lastSevenDays: activeDays }
    };
}

function calculateAverageDaily(history: ActivityHistory): number {
    const values = Object.values(history.dailyStats);
    if (values.length === 0) return 0;

    // Only consider last 14 days for average
    const recentValues = values.slice(-14);
    const sum = recentValues.reduce((acc, stats) => acc + stats.total, 0);
    return Math.round(sum / recentValues.length);
}

interface WeeklyDayStats {
    date: string;
    dayLabel: string;
    total: number;
    isToday: boolean;
}

function getWeeklyStats(history: ActivityHistory): WeeklyDayStats[] {
    const today = new Date();
    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']; // Mon-Sun order
    const result: WeeklyDayStats[] = [];

    // Find Monday of current week
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ...
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysFromMonday);

    // Generate Mon-Sun
    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const dateKey = getDateKey(date);
        const dayStats = history.dailyStats[dateKey];
        const isFuture = date > today;

        result.push({
            date: dateKey,
            dayLabel: dayLabels[i],
            total: isFuture ? 0 : (dayStats?.total || 0),
            isToday: dateKey === getDateKey(today)
        });
    }

    return result;
}

function loadHiddenItems(filePath: string): HiddenItemsData {
    try {
        if (fs.existsSync(filePath)) {
            const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
            return data;
        }
    } catch (err) {
        console.error("Error loading hidden items:", err);
    }
    return { hiddenItems: [], lastUpdated: null };
}

function saveHiddenItems(filePath: string, data: HiddenItemsData): void {
    try {
        data.lastUpdated = new Date().toISOString();
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error saving hidden items:", err);
    }
}

function cleanupExpiredHiddenItems(data: HiddenItemsData): HiddenItemsData {
    const now = new Date();
    const validItems = data.hiddenItems.filter(item => new Date(item.expiresAt) > now);
    return { ...data, hiddenItems: validItems };
}

function getHiddenItemIds(hiddenItemsPath: string): Set<string> {
    const data = loadHiddenItems(hiddenItemsPath);
    const cleanedData = cleanupExpiredHiddenItems(data);

    // Save cleaned data if items were removed
    if (cleanedData.hiddenItems.length !== data.hiddenItems.length) {
        saveHiddenItems(hiddenItemsPath, cleanedData);
    }

    return new Set(cleanedData.hiddenItems.map(item => item.id));
}

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthContext(request);
        if (!auth?.accessToken) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const { priorityTasksPath, activityHistoryPath, hiddenItemsPath } = getUserDataPaths(auth.userId);
        const activities: ActivityEntry[] = [];
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Load hidden item IDs to filter out deleted items
        const hiddenIds = getHiddenItemIds(hiddenItemsPath);

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: auth.accessToken });

        // 1. Fetch Calendar Activities (Past Events)
        try {
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
                const itemId = `cal-${event.id}`;
                // Skip hidden items
                if (hiddenIds.has(itemId)) return;
                if (endTime < now) {
                    const title = event.summary || "Untitled Event";
                    activities.push({
                        id: itemId,
                        actor: "user",
                        action: `Completed "${title}"`,
                        timestamp: formatTimestamp(endTime),
                        status: "success",
                        actualTime: endTime.toISOString(),
                        impactScore: 3,
                        importance: "Medium",
                        category: "calendar",
                        rawTitle: title
                    });
                }
            });
        } catch (err) {
            console.error("Error fetching calendar for activity:", err);
        }

        // 2. Fetch Priority Planner Activities
        try {
            if (fs.existsSync(priorityTasksPath)) {
                const data = JSON.parse(fs.readFileSync(priorityTasksPath, "utf8"));
                data.forEach((task: any) => {
                    if (task.completed && task.completedAt) {
                        const compTime = new Date(task.completedAt);
                        if (compTime >= yesterday) {
                            let score = 2; // Default Low
                            if (task.importance === "High") score = 10;
                            else if (task.importance === "Medium") score = 5;

                            activities.push({
                                id: `pri-${task.id}`,
                                actor: "user",
                                action: `Finished priority task: "${task.task}"`,
                                timestamp: formatTimestamp(compTime),
                                status: "success",
                                actualTime: compTime.toISOString(),
                                impactScore: score,
                                importance: task.importance,
                                category: "task",
                                rawTitle: task.task
                            });
                        }
                    }
                });
            }
        } catch (err) {
            console.error("Error fetching priority tasks for activity:", err);
        }

        // 3. Fetch Sent Emails (today)
        try {
            const gmail = google.gmail({ version: "v1", auth: oauth2Client });
            const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const secondsSinceEpoch = Math.floor(startOfToday.getTime() / 1000);

            const response = await gmail.users.messages.list({
                userId: "me",
                q: `from:me after:${secondsSinceEpoch}`,
                maxResults: 20,
            });

            const messages = response.data.messages || [];
            for (const msg of messages) {
                const itemId = `email-${msg.id}`;
                // Skip hidden items
                if (hiddenIds.has(itemId)) continue;
                try {
                    const detail = await gmail.users.messages.get({
                        userId: "me",
                        id: msg.id!,
                        format: "metadata",
                        metadataHeaders: ["Subject", "To", "Date"],
                    });

                    const headers = detail.data.payload?.headers || [];
                    const subject = headers.find((h) => h.name === "Subject")?.value || "(No Subject)";
                    const to = headers.find((h) => h.name === "To")?.value || "someone";
                    const dateStr = headers.find((h) => h.name === "Date")?.value || "";
                    const sentTime = dateStr ? new Date(dateStr) : now;

                    // Extract just the name or email from "To" field
                    const recipientMatch = to.match(/^([^<]+)/);
                    const recipientName = recipientMatch ? recipientMatch[1].trim() : to.split("@")[0];

                    activities.push({
                        id: itemId,
                        actor: "user",
                        action: `Sent email to ${recipientName}`,
                        timestamp: formatTimestamp(sentTime),
                        status: "success",
                        actualTime: sentTime.toISOString(),
                        impactScore: 4,
                        category: "email",
                        rawTitle: subject
                    });
                } catch {
                    // Skip individual email errors
                }
            }
        } catch (err) {
            console.error("Error fetching sent emails for activity:", err);
        }

        // 4. Fetch VA Tasks (completed today)
        try {
            const tasks = google.tasks({ version: "v1", auth: oauth2Client });
            const taskListsResponse = await tasks.tasklists.list();
            const taskLists = taskListsResponse.data.items || [];
            const vaTasksList = taskLists.find(list => list.title === "VA Tasks");

            if (vaTasksList?.id) {
                const tasksResponse = await tasks.tasks.list({
                    tasklist: vaTasksList.id,
                    showCompleted: true,
                    showHidden: false,
                    maxResults: 50,
                });

                const listTasks = tasksResponse.data.items || [];
                for (const task of listTasks) {
                    if (task.status === "completed" && task.completed) {
                        const compTime = new Date(task.completed);
                        if (compTime >= yesterday) {
                            activities.push({
                                id: `vatask-${task.id}`,
                                actor: "user",
                                action: `Completed task: "${task.title || "Untitled"}"`,
                                timestamp: formatTimestamp(compTime),
                                status: "success",
                                actualTime: compTime.toISOString(),
                                impactScore: 3,
                                category: "task",
                                rawTitle: task.title || "Untitled"
                            });
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Error fetching VA tasks for activity:", err);
        }

        // Sort by actualTime descending
        activities.sort((a, b) => new Date(b.actualTime).getTime() - new Date(a.actualTime).getTime());

        // Calculate summary stats
        const stats = {
            totalScore: activities.reduce((acc, a) => acc + a.impactScore, 0),
            emailCount: activities.filter(a => a.category === "email").length,
            taskCount: activities.filter(a => a.category === "task").length,
            calendarCount: activities.filter(a => a.category === "calendar").length,
        };

        // Load and update activity history
        const history = loadActivityHistory(activityHistoryPath);
        const todayKey = getDateKey(now);

        // Update today's stats in history
        history.dailyStats[todayKey] = {
            tasks: stats.taskCount,
            emails: stats.emailCount,
            events: stats.calendarCount,
            total: stats.taskCount + stats.emailCount + stats.calendarCount
        };

        // Save updated history
        saveActivityHistory(activityHistoryPath, history);

        // Calculate streaks from history
        const streaks = calculateStreaks(history);
        const averageDaily = calculateAverageDaily(history);
        const weeklyStats = getWeeklyStats(history);

        return NextResponse.json({
            activities,
            stats,
            streaks,
            averageDaily,
            weeklyStats
        });
    } catch (error) {
        console.error("Activity API error:", error);
        return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 });
    }
}

// DELETE - Remove an accomplishment (uncomplete a task or hide an event)
export async function DELETE(request: NextRequest) {
    try {
        const auth = await getAuthContext(request);
        if (!auth?.accessToken) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }
        const { priorityTasksPath, hiddenItemsPath } = getUserDataPaths(auth.userId);

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Missing id" }, { status: 400 });
        }

        // Handle priority tasks (pri-*)
        if (id.startsWith("pri-")) {
            const taskId = id.replace("pri-", "");
            try {
                if (fs.existsSync(priorityTasksPath)) {
                    const data = JSON.parse(fs.readFileSync(priorityTasksPath, "utf8"));
                    const updatedData = data.map((task: any) => {
                        if (task.id === taskId) {
                            return { ...task, completed: false, completedAt: undefined };
                        }
                        return task;
                    });
                    fs.writeFileSync(priorityTasksPath, JSON.stringify(updatedData, null, 2));
                    return NextResponse.json({ success: true });
                }
            } catch (err) {
                console.error("Error uncompleting priority task:", err);
                return NextResponse.json({ error: "Failed to uncomplete task" }, { status: 500 });
            }
        }

        // Handle VA tasks (vatask-*)
        if (id.startsWith("vatask-")) {
            const taskId = id.replace("vatask-", "");
            try {
                const oauth2Client = new google.auth.OAuth2();
                oauth2Client.setCredentials({ access_token: auth.accessToken });
                const tasks = google.tasks({ version: "v1", auth: oauth2Client });

                // Find VA Tasks list
                const taskListsResponse = await tasks.tasklists.list();
                const taskLists = taskListsResponse.data.items || [];
                const vaTasksList = taskLists.find(list => list.title === "VA Tasks");

                if (vaTasksList?.id) {
                    await tasks.tasks.patch({
                        tasklist: vaTasksList.id,
                        task: taskId,
                        requestBody: { status: "needsAction" },
                    });
                    return NextResponse.json({ success: true });
                }
            } catch (err) {
                console.error("Error uncompleting VA task:", err);
                return NextResponse.json({ error: "Failed to uncomplete task" }, { status: 500 });
            }
        }

        // For calendar events (cal-*) and emails (email-*), persist to hidden items
        if (id.startsWith("cal-") || id.startsWith("email-")) {
            try {
                const data = loadHiddenItems(hiddenItemsPath);
                const cleanedData = cleanupExpiredHiddenItems(data);

                // Check if already hidden
                if (!cleanedData.hiddenItems.some(item => item.id === id)) {
                    const now = new Date();
                    const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours

                    cleanedData.hiddenItems.push({
                        id,
                        hiddenAt: now.toISOString(),
                        expiresAt: expiresAt.toISOString()
                    });

                    saveHiddenItems(hiddenItemsPath, cleanedData);
                }

                return NextResponse.json({ success: true, message: "Item hidden from view" });
            } catch (err) {
                console.error("Error hiding item:", err);
                return NextResponse.json({ error: "Failed to hide item" }, { status: 500 });
            }
        }

        return NextResponse.json({ error: "Unknown item type" }, { status: 400 });
    } catch (error) {
        console.error("Activity DELETE error:", error);
        return NextResponse.json({ error: "Failed to delete activity" }, { status: 500 });
    }
}
