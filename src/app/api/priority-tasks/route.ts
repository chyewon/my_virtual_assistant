import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { AuthContext, getAuthContext } from "@/lib/auth";
import { getUserDataPaths } from "@/lib/userData";
import fs from "fs";

interface Subtask {
    id: string;
    title: string;
    completed: boolean;
}

interface PriorityTask {
    id: string;
    googleTaskId?: string;
    googleTaskListId?: string;
    task: string;
    description?: string;
    dueDate: string;
    importance: "High" | "Medium" | "Low";
    completed: boolean;
    completedAt?: string;
    subtasks?: Subtask[];
    reminder?: string; // ISO datetime for reminder
}

function readData(filePath: string): PriorityTask[] {
    try {
        if (!fs.existsSync(filePath)) {
            return [];
        }
        const data = fs.readFileSync(filePath, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading priority tasks:", error);
        return [];
    }
}

function writeData(filePath: string, data: PriorityTask[]) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    } catch (error) {
        console.error("Error writing priority tasks:", error);
    }
}

// Helper to get Google Tasks client and VA Tasks list ID
async function getGoogleTasksClient(auth: AuthContext) {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
        access_token: auth.accessToken,
    });

    const tasks = google.tasks({ version: "v1", auth: oauth2Client });

    // Get VA Tasks list ID
    const taskListsResponse = await tasks.tasklists.list();
    const taskLists = taskListsResponse.data.items || [];
    let vaTasksList = taskLists.find(list => list.title === "VA Tasks");

    if (!vaTasksList || !vaTasksList.id) {
        // Create the VA Tasks list if it doesn't exist
        const newList = await tasks.tasklists.insert({
            requestBody: { title: "VA Tasks" },
        });
        vaTasksList = newList.data;
    }

    return { tasks, listId: vaTasksList?.id };
}

export async function GET(request: NextRequest) {
    const auth = await getAuthContext(request);
    if (!auth?.accessToken) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { priorityTasksPath } = getUserDataPaths(auth.userId);
    return NextResponse.json({ tasks: readData(priorityTasksPath) });
}

export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthContext(request);
        if (!auth?.accessToken) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const body = await request.json();
        const { task, description, dueDate, importance } = body;

        if (!task) return NextResponse.json({ error: "Task name is required" }, { status: 400 });

        const { priorityTasksPath } = getUserDataPaths(auth.userId);
        const tasks = readData(priorityTasksPath);
        const newTask: PriorityTask = {
            id: crypto.randomUUID().slice(0, 7),
            task,
            description: description || "",
            dueDate: dueDate || "",
            importance: importance || "Medium",
            completed: false,
        };

        // Try to sync to Google Tasks
        try {
            const googleClient = await getGoogleTasksClient(auth);
            if (googleClient && googleClient.listId) {
                // Store creation timestamp in notes metadata (same format as tasks/route.ts)
                const createdAt = new Date().toISOString();
                const notesWithMetadata = `[VA_CREATED:${createdAt}]${description ? '\n' + description : ''}`;

                const googleTask = await googleClient.tasks.tasks.insert({
                    tasklist: googleClient.listId,
                    requestBody: {
                        title: task,
                        notes: notesWithMetadata,
                    },
                });

                // Store Google Task ID mapping
                newTask.googleTaskId = googleTask.data.id || undefined;
                newTask.googleTaskListId = googleClient.listId;
            }
        } catch (googleError) {
            console.error("Failed to sync to Google Tasks (continuing with local only):", googleError);
            // Continue without Google sync - task will still be saved locally
        }

        tasks.push(newTask);
        writeData(priorityTasksPath, tasks);

        return NextResponse.json({ success: true, task: newTask });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const auth = await getAuthContext(request);
        if (!auth?.accessToken) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const body = await request.json();
        const { id, task, description, dueDate, importance, completed, subtasks, reminder } = body;

        if (!id) return NextResponse.json({ error: "Task ID is required" }, { status: 400 });

        const { priorityTasksPath } = getUserDataPaths(auth.userId);
        let tasks = readData(priorityTasksPath);
        const existingTask = tasks.find(t => t.id === id);

        tasks = tasks.map(t => t.id === id ? {
            ...t,
            task: task !== undefined ? task : t.task,
            description: description !== undefined ? description : t.description,
            dueDate: dueDate !== undefined ? dueDate : t.dueDate,
            importance: importance !== undefined ? importance : t.importance,
            completed: completed !== undefined ? completed : t.completed,
            completedAt: completed === true ? new Date().toISOString() : (completed === false ? undefined : t.completedAt),
            subtasks: subtasks !== undefined ? subtasks : t.subtasks,
            reminder: reminder !== undefined ? reminder : t.reminder,
        } : t);

        writeData(priorityTasksPath, tasks);

        // Sync update to Google Tasks if task has a Google Task ID
        if (existingTask?.googleTaskId && existingTask?.googleTaskListId) {
            try {
                const googleClient = await getGoogleTasksClient(auth);
                const updatePayload: { status?: string; title?: string } = {};

                if (completed !== undefined) {
                    updatePayload.status = completed ? "completed" : "needsAction";
                }

                if (task !== undefined) {
                    updatePayload.title = task;
                }

                if (Object.keys(updatePayload).length > 0) {
                    await googleClient.tasks.tasks.patch({
                        tasklist: existingTask.googleTaskListId,
                        task: existingTask.googleTaskId,
                        requestBody: updatePayload,
                    });
                }
            } catch (googleError) {
                console.error("Failed to sync update to Google Tasks:", googleError);
                // Continue - local update already saved
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const auth = await getAuthContext(request);
        if (!auth?.accessToken) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "Task ID is required" }, { status: 400 });

        const { priorityTasksPath } = getUserDataPaths(auth.userId);
        let tasks = readData(priorityTasksPath);
        const taskToDelete = tasks.find(t => t.id === id);

        // Delete from Google Tasks if task has a Google Task ID
        if (taskToDelete?.googleTaskId && taskToDelete?.googleTaskListId) {
            try {
                const googleClient = await getGoogleTasksClient(auth);
                if (googleClient) {
                    await googleClient.tasks.tasks.delete({
                        tasklist: taskToDelete.googleTaskListId,
                        task: taskToDelete.googleTaskId,
                    });
                }
            } catch (googleError) {
                console.error("Failed to delete from Google Tasks:", googleError);
                // Continue with local delete
            }
        }

        tasks = tasks.filter(t => t.id !== id);
        writeData(priorityTasksPath, tasks);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
    }
}
