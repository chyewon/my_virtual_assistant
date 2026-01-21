import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { google } from "googleapis";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.accessToken) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: session.accessToken,
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
            listId: string;
            listTitle: string;
        }> = [];

        try {
            const tasksResponse = await tasks.tasks.list({
                tasklist: vaTasksList.id,
                showCompleted: true,
                showHidden: false,
                maxResults: 100,
            });

            const listTasks = tasksResponse.data.items || [];

            for (const task of listTasks) {
                allTasks.push({
                    id: task.id || "",
                    title: task.title || "Untitled",
                    notes: task.notes || undefined,
                    due: task.due || undefined,
                    status: task.status || "needsAction",
                    completed: task.completed || undefined,
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
export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.accessToken) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const body = await request.json();
        const { taskId, listId, completed, title } = body;

        if (!taskId || !listId) {
            return NextResponse.json({ error: "Missing taskId or listId" }, { status: 400 });
        }

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: session.accessToken,
        });

        const tasks = google.tasks({ version: "v1", auth: oauth2Client });

        // Build update payload
        const updatePayload: { status?: string; completed?: string | null; title?: string } = {};

        if (completed !== undefined) {
            updatePayload.status = completed ? "completed" : "needsAction";
            updatePayload.completed = completed ? new Date().toISOString() : null;
        }

        if (title !== undefined) {
            updatePayload.title = title;
        }

        const updatedTask = await tasks.tasks.patch({
            tasklist: listId,
            task: taskId,
            requestBody: updatePayload,
        });

        return NextResponse.json({ success: true, task: updatedTask.data });
    } catch (error: unknown) {
        console.error("Update task error:", error);
        const message = error instanceof Error ? error.message : "Failed to update task";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// Create a new task
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.accessToken) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const body = await request.json();
        const { title, notes } = body;

        if (!title) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: session.accessToken,
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

        const newTask = await tasks.tasks.insert({
            tasklist: vaTasksList.id,
            requestBody: {
                title,
                notes: notes || undefined,
            },
        });

        return NextResponse.json({
            success: true,
            task: {
                id: newTask.data.id,
                title: newTask.data.title,
                notes: newTask.data.notes,
                status: newTask.data.status,
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
export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.accessToken) {
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
            access_token: session.accessToken,
        });

        const tasks = google.tasks({ version: "v1", auth: oauth2Client });

        await tasks.tasks.delete({
            tasklist: listId,
            task: taskId,
        });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Delete task error:", error);
        const message = error instanceof Error ? error.message : "Failed to delete task";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
