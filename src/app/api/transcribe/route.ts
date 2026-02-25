import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth";
import OpenAI from "openai";
import { env } from "@/env";
import { enforceUserQuota } from "@/lib/rateLimit";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const ALLOWED_AUDIO_TYPES = new Set([
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/wav",
    "audio/x-wav",
    "audio/webm",
    "audio/ogg",
    "audio/flac",
    "audio/x-m4a",
]);

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthContext(req);
        if (!auth?.accessToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const quota = enforceUserQuota(auth.userId, "transcribe", {
            perMinute: 5,
            perDay: 80,
        });
        if (!quota.allowed) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Please try again later." },
                { status: 429, headers: { "Retry-After": String(quota.retryAfterSeconds) } }
            );
        }

        if (!env.OPENAI_API_KEY) {
            return NextResponse.json({
                error: "Server configuration error: OpenAI API key not configured"
            }, { status: 500 });
        }

        const openai = new OpenAI({
            apiKey: env.OPENAI_API_KEY,
        });

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (file.size <= 0 || file.size > MAX_AUDIO_BYTES) {
            return NextResponse.json({ error: "Invalid file size. Maximum size is 10MB." }, { status: 400 });
        }
        if (!ALLOWED_AUDIO_TYPES.has(file.type)) {
            return NextResponse.json({ error: "Unsupported audio format." }, { status: 400 });
        }

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
