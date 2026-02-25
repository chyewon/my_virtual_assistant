import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getAuthContext } from "@/lib/auth";
import { getUserDataPaths } from "@/lib/userData";
import fs from "fs";

interface PriorityTask {
    id: string;
    googleTaskId?: string;
    googleTaskListId?: string;
    task: string;
    description?: string;
    dueDate: string;
    importance: "High" | "Medium" | "Low";
    completed: boolean;
}

function readPriorityTasks(filePath: string): PriorityTask[] {
    try {
        if (!fs.existsSync(filePath)) return [];
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch { return []; }
}

function writePriorityTasks(filePath: string, data: PriorityTask[]) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

// Helper function to format duration in human-readable format
function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        const remainingHours = hours % 24;
        if (remainingHours > 0) {
            return `${days}d ${remainingHours}h`;
        }
        return `${days} day${days > 1 ? 's' : ''}`;
    }
    if (hours > 0) {
        const remainingMinutes = minutes % 60;
        if (remainingMinutes > 0) {
            return `${hours}h ${remainingMinutes}m`;
        }
        return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    return 'Less than a minute';
}

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthContext(request);
        if (!auth?.accessToken) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: auth.accessToken,
        });

        const tasks = google.tasks({ version: "v1", auth: oauth2Client });

        // Get all task lists
        const taskListsResponse = await tasks.tasklists.list();
        const taskLists = taskListsResponse.data.items || [];

        // Find the "VA Tasks" list, or create it if it doesn't exist
        let vaTasksList = taskLists.find(list => list.title === "VA Tasks");

        if (!vaTasksList || !vaTasksList.id) {
            // Create the VA Tasks list
            const newList = await tasks.tasklists.insert({
                requestBody: { title: "VA Tasks" },
            });
            vaTasksList = newList.data;
        }

        if (!vaTasksList || !vaTasksList.id) {
            return NextResponse.json({ tasks: [], message: "Could not create VA Tasks list" });
        }

        const allTasks: Array<{
            id: string;
            title: string;
            notes?: string;
            due?: string;
            status: string;
            completed?: string;
            createdAt?: string;
            completionDuration?: string;
            listId: string;
            listTitle: string;
        }> = [];

        try {
            const { searchParams } = new URL(request.url);
            const showCompleted = searchParams.get("showCompleted") === "true";

            const tasksResponse = await tasks.tasks.list({
                tasklist: vaTasksList.id,
                showCompleted,
                showHidden: false,
                maxResults: 100,
            });

            const listTasks = tasksResponse.data.items || [];

            for (const task of listTasks) {
                // Extract createdAt from notes metadata
                let createdAt: string | undefined;
                let userNotes: string | undefined = task.notes || undefined;

                if (task.notes) {
                    const metadataMatch = task.notes.match(/\[VA_CREATED:(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z)\]/);
                    if (metadataMatch) {
                        createdAt = metadataMatch[1];
                        // Remove metadata from displayed notes
                        userNotes = task.notes.replace(/\[VA_CREATED:[^\]]+\]\n?/, '').trim() || undefined;
                    }
                }

                // Calculate completion duration if task is completed and has createdAt
                let completionDuration: string | undefined;
                if (task.status === 'completed' && task.completed && createdAt) {
                    const createdDate = new Date(createdAt);
                    const completedDate = new Date(task.completed);
                    const durationMs = completedDate.getTime() - createdDate.getTime();
                    completionDuration = formatDuration(durationMs);
                }

                allTasks.push({
                    id: task.id || "",
                    title: task.title || "Untitled",
                    notes: userNotes,
                    due: task.due || undefined,
                    status: task.status || "needsAction",
                    completed: task.completed || undefined,
                    createdAt,
                    completionDuration,
                    listId: vaTasksList.id,
                    listTitle: "VA Tasks",
                });
            }
        } catch (listError) {
            console.error("Error fetching VA Tasks:", listError);
        }

        return NextResponse.json({ tasks: allTasks });
    } catch (error: unknown) {
        console.error("Fetch tasks error:", error);
        const message = error instanceof Error ? error.message : "Failed to fetch tasks";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// Update task (toggle completion or edit title)
export async function PUT(request: NextRequest) {
    try {
        const auth = await getAuthContext(request);
        if (!auth?.accessToken) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const body = await request.json();
        const { taskId, listId, completed, title } = body;

        if (!taskId || !listId) {
            return NextResponse.json({ error: "Missing taskId or listId" }, { status: 400 });
        }

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: auth.accessToken,
        });

        const tasks = google.tasks({ version: "v1", auth: oauth2Client });

        // Build update payload
        const updatePayload: { status?: string; completed?: string | null; title?: string } = {};

        if (completed !== undefined) {
            updatePayload.status = completed ? "completed" : "needsAction";
            // 'completed' field is read-only in Google Tasks API, changing status is sufficient
        }

        if (title !== undefined) {
            updatePayload.title = title;
        }

        const updatedTask = await tasks.tasks.patch({
            tasklist: listId,
            task: taskId,
            requestBody: updatePayload,
        });

        // Sync update to Priority Planner
        try {
            const { priorityTasksPath } = getUserDataPaths(auth.userId);
            const priorityTasks = readPriorityTasks(priorityTasksPath);
            const priorityTaskIndex = priorityTasks.findIndex(t => t.googleTaskId === taskId);
            if (priorityTaskIndex !== -1) {
                if (completed !== undefined) {
                    priorityTasks[priorityTaskIndex].completed = completed;
                }
                if (title !== undefined) {
                    priorityTasks[priorityTaskIndex].task = title;
                }
                writePriorityTasks(priorityTasksPath, priorityTasks);
            }
        } catch (syncError) {
            console.error("Failed to sync update to Priority Planner:", syncError);
            // Continue - Google Tasks update succeeded
        }

        return NextResponse.json({ success: true, task: updatedTask.data });
    } catch (error: unknown) {
        console.error("Update task error:", error);
        const message = error instanceof Error ? error.message : "Failed to update task";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// Create a new task
export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthContext(request);
        if (!auth?.accessToken) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const body = await request.json();
        const { title, notes } = body;

        if (!title) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: auth.accessToken,
        });

        const tasks = google.tasks({ version: "v1", auth: oauth2Client });

        // Get VA Tasks list ID, or create it if it doesn't exist
        const taskListsResponse = await tasks.tasklists.list();
        const taskLists = taskListsResponse.data.items || [];
        let vaTasksList = taskLists.find(list => list.title === "VA Tasks");

        if (!vaTasksList || !vaTasksList.id) {
            // Create the VA Tasks list
            const newList = await tasks.tasklists.insert({
                requestBody: { title: "VA Tasks" },
            });
            vaTasksList = newList.data;
        }

        if (!vaTasksList || !vaTasksList.id) {
            return NextResponse.json({ error: "Could not create VA Tasks list" }, { status: 500 });
        }

        // Store creation timestamp in notes metadata
        const createdAt = new Date().toISOString();
        const notesWithMetadata = `[VA_CREATED:${createdAt}]${notes ? '\n' + notes : ''}`;

        const newTask = await tasks.tasks.insert({
            tasklist: vaTasksList.id,
            requestBody: {
                title,
                notes: notesWithMetadata,
            },
        });

        // Also add to Priority Planner with Google Task ID mapping
        const { priorityTasksPath } = getUserDataPaths(auth.userId);
        const priorityTasks = readPriorityTasks(priorityTasksPath);
        priorityTasks.push({
            id: Math.random().toString(36).substring(2, 9),
            googleTaskId: newTask.data.id || undefined,
            googleTaskListId: vaTasksList.id,
            task: title,
            description: notes || "",
            dueDate: new Date().toISOString().split("T")[0],
            importance: "Medium",
            completed: false,
        });
        writePriorityTasks(priorityTasksPath, priorityTasks);

        return NextResponse.json({
            success: true,
            task: {
                id: newTask.data.id,
                title: newTask.data.title,
                notes: notes || undefined, // Return user-visible notes without metadata
                status: newTask.data.status,
                createdAt,
                listId: vaTasksList.id,
                listTitle: "VA Tasks",
            }
        });
    } catch (error: unknown) {
        console.error("Create task error:", error);
        const message = error instanceof Error ? error.message : "Failed to create task";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// Delete a task
export async function DELETE(request: NextRequest) {
    try {
        const auth = await getAuthContext(request);
        if (!auth?.accessToken) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const taskId = searchParams.get("taskId");
        const listId = searchParams.get("listId");

        if (!taskId || !listId) {
            return NextResponse.json({ error: "Missing taskId or listId" }, { status: 400 });
        }

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: auth.accessToken,
        });

        const tasks = google.tasks({ version: "v1", auth: oauth2Client });

        await tasks.tasks.delete({
            tasklist: listId,
            task: taskId,
        });

        // Sync delete to Priority Planner
        try {
            const { priorityTasksPath } = getUserDataPaths(auth.userId);
            let priorityTasks = readPriorityTasks(priorityTasksPath);
            priorityTasks = priorityTasks.filter(t => t.googleTaskId !== taskId);
            writePriorityTasks(priorityTasksPath, priorityTasks);
        } catch (syncError) {
            console.error("Failed to sync delete to Priority Planner:", syncError);
            // Continue - Google Tasks delete succeeded
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Delete task error:", error);
        const message = error instanceof Error ? error.message : "Failed to delete task";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
