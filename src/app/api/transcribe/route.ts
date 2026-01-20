import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import OpenAI from "openai";
import { env } from "@/env";

// Simple in-memory rate limiter
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 transcription requests per minute

function checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const userLimit = rateLimit.get(identifier);

    if (!userLimit || now > userLimit.resetTime) {
        rateLimit.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return true;
    }

    if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
        return false;
    }

    userLimit.count++;
    return true;
}

export async function POST(req: Request) {
    try {
        // Rate limiting
        const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        if (!checkRateLimit(clientIP)) {
            return NextResponse.json({
                error: "Rate limit exceeded. Please try again later."
            }, { status: 429 });
        }

        if (!env.OPENAI_API_KEY) {
            return NextResponse.json({
                error: "Server configuration error: OpenAI API key not configured"
            }, { status: 500 });
        }

        const openai = new OpenAI({
            apiKey: env.OPENAI_API_KEY,
        });

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
