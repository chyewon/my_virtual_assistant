import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "src/data/priority_tasks.json");

interface PriorityTask {
    id: string;
    task: string;
    dueDate: string;
    importance: "High" | "Medium" | "Low";
    completed: boolean;
    completedAt?: string;
}

function readData(): PriorityTask[] {
    try {
        if (!fs.existsSync(DATA_PATH)) {
            return [];
        }
        const data = fs.readFileSync(DATA_PATH, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading priority tasks:", error);
        return [];
    }
}

function writeData(data: PriorityTask[]) {
    try {
        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), "utf8");
    } catch (error) {
        console.error("Error writing priority tasks:", error);
    }
}

export async function GET() {
    return NextResponse.json({ tasks: readData() });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { task, dueDate, importance } = body;

        if (!task) return NextResponse.json({ error: "Task name is required" }, { status: 400 });

        const tasks = readData();
        const newTask: PriorityTask = {
            id: Math.random().toString(36).substring(2, 9),
            task,
            dueDate: dueDate || "",
            importance: importance || "Medium",
            completed: false,
        };

        tasks.push(newTask);
        writeData(tasks);

        return NextResponse.json({ success: true, task: newTask });
    } catch (error) {
        return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, task, dueDate, importance, completed } = body;

        if (!id) return NextResponse.json({ error: "Task ID is required" }, { status: 400 });

        let tasks = readData();
        tasks = tasks.map(t => t.id === id ? {
            ...t,
            task: task !== undefined ? task : t.task,
            dueDate: dueDate !== undefined ? dueDate : t.dueDate,
            importance: importance !== undefined ? importance : t.importance,
            completed: completed !== undefined ? completed : t.completed,
            completedAt: completed === true ? new Date().toISOString() : (completed === false ? undefined : t.completedAt)
        } : t);

        writeData(tasks);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "Task ID is required" }, { status: 400 });

        let tasks = readData();
        tasks = tasks.filter(t => t.id !== id);
        writeData(tasks);

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
    }
}
