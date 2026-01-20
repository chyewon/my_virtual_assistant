import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Convert File to Buffer/ReadStream if needed, but OpenAI SDK v4+ supports File/Blob directly from FormData
        // However, in Node environment, we might need a workaround if using standard Request
        // Let's try passing directly first.

        const transcription = await openai.audio.transcriptions.create({
            file: file,
            model: "whisper-1",
        });

        return NextResponse.json({ text: transcription.text });
    } catch (error) {
        console.error("Transcription Error:", error);
        return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
    }
}
