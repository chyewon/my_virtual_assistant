import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";
import OpenAI from "openai";
import { SYSTEM_PROMPT } from "@/lib/ai/systemPrompt";


// Initialize OpenAI client - assumes OPENAI_API_KEY is in env
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "stub-key",
});

interface ChatRequest {
    messages: { role: "user" | "assistant"; content: string }[];
    timezone?: string;
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = (await req.json()) as ChatRequest;
        const { messages, timezone = "America/New_York" } = body;

        // 1. Fetch Today's Calendar Events
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
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

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({
                message: {
                    role: "assistant",
                    content: "I can help you plan, but I need an OpenAI API Key configured in .env.local first. For now, I can see you have " + events.length + " events today."
                }
            });
        }

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

        // Handle Function Calls (Tool Calls)
        if (aiMessage.tool_calls) {
            const toolCall = aiMessage.tool_calls[0];
            const toolCallFunction = toolCall && "function" in toolCall ? toolCall.function : undefined;
            if (toolCall?.type === "function" && toolCallFunction?.name === "create_calendar_event") {
                const args = JSON.parse(toolCallFunction.arguments || "{}");

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

                return NextResponse.json({
                    message: {
                        role: "assistant",
                        content: `I've scheduled "${args.title}" for ${new Date(args.startTime).toLocaleTimeString()}.`
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
