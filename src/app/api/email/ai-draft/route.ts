import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { google } from "googleapis";
import { getAuthContext } from "@/lib/auth";
import { env } from "@/env";
import OpenAI from "openai";
import { enforceUserQuota } from "@/lib/rateLimit";

interface AIDraftRequest {
    emailId: string;
    subject: string;
    from: string;
    body: string;
    threadId?: string;
    userPrompt?: string;
}

// Gemini API call for audit
async function auditWithGemini(originalEmail: string, draftReply: string): Promise<string> {
    if (!env.GEMINI_API_KEY) {
        return draftReply; // Skip audit if no Gemini key
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `You are an email communication auditor. Review this draft reply for:
1. Tone appropriateness and emotional intelligence
2. Clarity and conciseness
3. Professional yet warm communication style
4. Any potential misunderstandings or gaps

ORIGINAL EMAIL:
${originalEmail}

DRAFT REPLY:
${draftReply}

Provide specific, actionable feedback to improve the reply. Keep feedback concise and focused.`
                    }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 500,
                }
            }),
        }
    );

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No feedback provided.";
}

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthContext(req);
        if (!auth?.accessToken) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        if (!env.OPENAI_API_KEY) {
            return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
        }

        const quota = enforceUserQuota(auth.userId, "email-ai-draft", {
            perMinute: 5,
            perDay: 120,
        });
        if (!quota.allowed) {
            return NextResponse.json(
                { error: "Quota exceeded. Please try again later." },
                { status: 429, headers: { "Retry-After": String(quota.retryAfterSeconds) } }
            );
        }

        const body: AIDraftRequest = await req.json();
        const { emailId, subject, from, body: emailBody, threadId } = body;

        const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

        // Step 1: ChatGPT generates initial draft
        const initialDraftResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an expert email communication assistant. Your task is to draft professional, emotionally intelligent replies.

GUIDELINES:
- Understand the context and relationship from the email
- Match appropriate tone (professional yet warm)
- Be concise - avoid unnecessary adjectives and filler words
- Show depth in emotional intelligence and understanding
- Address all key points from the original email
- Keep responses focused and actionable
- Do NOT use overly formal language or excessive pleasantries
- Write as if you are the recipient responding personally`
                },
                {
                    role: "user",
                    content: `Draft a reply to this email:

FROM: ${from}
SUBJECT: ${subject}

EMAIL BODY:
${emailBody}

Write a concise, emotionally intelligent reply that addresses the sender's needs while maintaining a professional yet warm tone.`
                }
            ],
            temperature: 0.7,
            max_tokens: 1000,
        });

        const initialDraft = initialDraftResponse.choices[0]?.message?.content || "";

        // Step 2: Gemini audits the draft
        const geminiAudit = await auditWithGemini(emailBody, initialDraft);

        // Step 3: ChatGPT reviews and finalizes based on Gemini's feedback
        const finalDraftResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are refining an email draft based on audit feedback. Apply the feedback to improve the reply while maintaining the original intent and tone. Return ONLY the final email text, nothing else.`
                },
                {
                    role: "user",
                    content: `ORIGINAL DRAFT:
${initialDraft}

AUDIT FEEDBACK:
${geminiAudit}

Apply the feedback and return the improved final email draft. Be concise.`
                }
            ],
            temperature: 0.5,
            max_tokens: 1000,
        });

        const finalDraft = finalDraftResponse.choices[0]?.message?.content || initialDraft;

        // Step 4: Save as Gmail draft
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: auth.accessToken });
        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        // Create email message in RFC 2822 format
        const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;
        const emailMessage = [
            `To: ${from}`,
            `Subject: ${replySubject}`,
            `In-Reply-To: ${emailId}`,
            `References: ${emailId}`,
            `Content-Type: text/plain; charset="UTF-8"`,
            "",
            finalDraft
        ].join("\r\n");

        const encodedMessage = Buffer.from(emailMessage)
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

        const draftResponse = await gmail.users.drafts.create({
            userId: "me",
            requestBody: {
                message: {
                    raw: encodedMessage,
                    threadId: threadId,
                }
            }
        });

        return NextResponse.json({
            success: true,
            draftId: draftResponse.data.id,
            initialDraft,
            geminiAudit,
            finalDraft,
            message: "Draft created successfully!"
        });

    } catch (error: unknown) {
        console.error("AI Draft API error:", error);
        const message = error instanceof Error ? error.message : "Failed to generate AI draft";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
