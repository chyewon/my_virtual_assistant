import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";
import OpenAI from "openai";
import { SYSTEM_PROMPT } from "@/lib/ai/systemPrompt";
import { env } from "@/env";

// Simple in-memory rate limiter
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute

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

interface ChatRequest {
    messages: { role: "user" | "assistant"; content: string }[];
    timezone?: string;
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

        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = (await req.json()) as ChatRequest;
        const { messages, timezone = "America/New_York" } = body;

        // 1. Fetch Today's Calendar Events
        const oauth2Client = new google.auth.OAuth2(
            env.GOOGLE_CLIENT_ID,
            env.GOOGLE_CLIENT_SECRET
        );
        oauth2Client.setCredentials({
            access_token: session.accessToken,
            refresh_token: session.refreshToken,
        });

        const calendar = google.calendar({ version: "v3", auth: oauth2Client });

        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        const eventsRes = await calendar.events.list({
            calendarId: "primary",
            timeMin: startOfDay.toISOString(),
            timeMax: endOfDay.toISOString(),
            singleEvents: true,
            orderBy: "startTime",
        });

        const events = eventsRes.data.items?.map(e => ({
            title: e.summary || "Busy",
            start: e.start?.dateTime || e.start?.date,
            end: e.end?.dateTime || e.end?.date,
        })) || [];

        // 2. Prepare Context for AI
        const contextMessage = `
Current Time: ${now.toLocaleString("en-US", { timeZone: timezone })}
User's Schedule Today:
${JSON.stringify(events, null, 2)}
`;

        // 3. Call AI
        // NOTE: In a real scenario, we would use Function Calling here to structured outputs.
        // For this MVP step, we will use a standard chat completion and simulating the "planning" aspect
        // if the API key is missing.

        if (!env.OPENAI_API_KEY) {
            return NextResponse.json({
                message: {
                    role: "assistant",
                    content: "I can help you plan, but I need an OpenAI API Key configured in .env.local first. For now, I can see you have " + events.length + " events today."
                }
            });
        }

        const openai = new OpenAI({
            apiKey: env.OPENAI_API_KEY,
        });

        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "system", content: contextMessage },
                ...messages.map(m => ({ role: m.role, content: m.content })),
            ],
            tools: [
                {
                    type: "function",
                    function: {
                        name: "create_calendar_event",
                        description: "Create a new event in the user's calendar",
                        parameters: {
                            type: "object",
                            properties: {
                                title: { type: "string" },
                                startTime: { type: "string", description: "ISO string" },
                                endTime: { type: "string", description: "ISO string" },
                                description: { type: "string" },
                            },
                            required: ["title", "startTime", "endTime"]
                        }
                    }
                }
            ],
            tool_choice: "auto",
        });

        const aiMessage = completion.choices[0].message;

        // Handle Function Calls (Tool Calls) - process ALL tool calls
        if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
            const createdEvents: string[] = [];
            const failedEvents: string[] = [];

            for (const toolCall of aiMessage.tool_calls) {
                const toolCallFunction = toolCall && "function" in toolCall ? toolCall.function : undefined;
                if (toolCall?.type === "function" && toolCallFunction?.name === "create_calendar_event") {
                    const args = JSON.parse(toolCallFunction.arguments || "{}");

                    try {
                        // Execute the calendar creation
                        await calendar.events.insert({
                            calendarId: "primary",
                            requestBody: {
                                summary: args.title,
                                description: args.description,
                                start: { dateTime: args.startTime },
                                end: { dateTime: args.endTime },
                            }
                        });

                        createdEvents.push(`"${args.title}" at ${new Date(args.startTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`);
                    } catch (eventError) {
                        console.error(`Failed to create event "${args.title}":`, eventError);
                        failedEvents.push(`"${args.title}" (invalid time range)`);
                    }
                }
            }

            if (createdEvents.length > 0 || failedEvents.length > 0) {
                let summary = "";

                if (createdEvents.length > 0) {
                    summary = createdEvents.length === 1
                        ? `I've scheduled ${createdEvents[0]}.`
                        : `I've scheduled ${createdEvents.length} events:\n• ${createdEvents.join('\n• ')}`;
                }

                if (failedEvents.length > 0) {
                    summary += summary ? "\n\n" : "";
                    summary += `⚠️ Failed to create ${failedEvents.length} event(s): ${failedEvents.join(', ')}. Please check the time ranges.`;
                }

                return NextResponse.json({
                    message: {
                        role: "assistant",
                        content: summary
                    }
                });
            }
        }

        return NextResponse.json({
            message: {
                role: "assistant",
                content: aiMessage.content
            }
        });

    } catch (error) {
        console.error("AI Chat Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
