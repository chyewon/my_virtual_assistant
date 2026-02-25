import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { google } from "googleapis";
import { getAuthContext } from "@/lib/auth";
import OpenAI from "openai";
import { env } from "@/env";
import { enforceUserQuota } from "@/lib/rateLimit";

interface PriorityEmail {
    id: string | null | undefined;
    subject: string;
    senderName: string;
    from: string;
    snippet: string;
    body: string;
    date: string;
    threadId: string | null | undefined;
    isPersonal?: boolean;
}

export async function GET(req: NextRequest) {
    try {
        const auth = await getAuthContext(req);

        if (!auth?.accessToken) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const category = searchParams.get("category") || "all";

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: auth.accessToken,
        });

        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        // Define query based on category
        let query = "label:INBOX";
        if (category !== "all") {
            query += ` category:${category}`;
        }

        const response = await gmail.users.messages.list({
            userId: "me",
            q: query,
            maxResults: 20,
        });

        const messages = response.data.messages || [];
        const emailDetails: PriorityEmail[] = await Promise.all(
            messages.map(async (msg) => {
                const detail = await gmail.users.messages.get({
                    userId: "me",
                    id: msg.id!,
                    format: "full",
                });

                const headers = detail.data.payload?.headers || [];
                const subject = headers.find((h) => h.name === "Subject")?.value || "(No Subject)";
                const from = headers.find((h) => h.name === "From")?.value || "Unknown Sender";
                const date = headers.find((h) => h.name === "Date")?.value || "";

                const fromMatch = from.match(/^(.*?)\s*<.*?>$/);
                const senderName = fromMatch ? fromMatch[1] : from;

                // Extract HTML or plain text body
                let body = "";
                const parts = detail.data.payload?.parts || [];

                type MessagePart = {
                    mimeType?: string | null;
                    body?: { data?: string | null } | null;
                    parts?: MessagePart[] | null;
                };

                function getBody(parts: MessagePart[]): string {
                    // Try to find HTML first
                    for (const part of parts) {
                        if (part.mimeType === "text/html" && part.body?.data) {
                            return Buffer.from(part.body.data, 'base64').toString();
                        }
                        if (part.parts) {
                            const found = getBody(part.parts);
                            if (found) return found;
                        }
                    }
                    // Fallback to plain text
                    for (const part of parts) {
                        if (part.mimeType === "text/plain" && part.body?.data) {
                            return Buffer.from(part.body.data, 'base64').toString();
                        }
                    }
                    return "";
                }

                if (detail.data.payload?.body?.data) {
                    body = Buffer.from(detail.data.payload.body.data, 'base64').toString();
                } else if (parts.length > 0) {
                    body = getBody(parts);
                }

                return {
                    id: msg.id,
                    subject,
                    senderName,
                    from,
                    snippet: detail.data.snippet || "",
                    body,
                    date,
                    threadId: msg.threadId,
                };
            })
        );

        // Classify emails using AI
        if (emailDetails.length > 0 && env.OPENAI_API_KEY) {
            const quota = enforceUserQuota(auth.userId, "email-priority", {
                perMinute: 8,
                perDay: 400,
            });
            if (!quota.allowed) {
                return NextResponse.json(
                    { error: "Quota exceeded. Please try again later." },
                    { status: 429, headers: { "Retry-After": String(quota.retryAfterSeconds) } }
                );
            }

            const classificationPrompt = `Classify the following emails as "personal" (from a real person, direct communication) or "other" (automated, newsletter, receipt, etc.). Respond with a JSON object containing an array "isPersonal" of booleans corresponding to each email.
            
            Emails:
            ${emailDetails.map((e, i) => `${i + 1}. From: ${e.from}, Subject: ${e.subject}, Snippet: ${e.snippet}`).join('\n')}
            `;

            try {
                const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
                const classification = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: "You are an assistant that classifies emails. Return only a JSON object like {\"isPersonal\": [true, false, ...]}." },
                        { role: "user", content: classificationPrompt }
                    ],
                    response_format: { type: "json_object" }
                });

                const content = classification.choices[0].message.content;
                if (content) {
                    const result = JSON.parse(content);
                    const isPersonalList = result.isPersonal;
                    if (Array.isArray(isPersonalList)) {
                        emailDetails.forEach((email, index) => {
                            if (index < isPersonalList.length) {
                                email.isPersonal = !!isPersonalList[index];
                            }
                        });
                    }
                }
            } catch (aiError) {
                console.error("AI Classification Error:", aiError);
            }
        }

        return NextResponse.json({ emails: emailDetails });
    } catch (error: unknown) {
        console.error("Gmail API error (priority):", error);
        const message = error instanceof Error ? error.message : "Failed to fetch priority emails";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
