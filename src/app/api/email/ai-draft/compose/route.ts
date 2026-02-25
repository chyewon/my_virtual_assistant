import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { env } from "@/env";
import OpenAI from "openai";
import { enforceUserQuota } from "@/lib/rateLimit";

interface ComposeRequest {
    prompt: string;
    to?: string;
    subject?: string;
    existingBody?: string;
}

// Gemini API call for audit
async function auditWithGemini(draftContent: string, userPrompt: string): Promise<string> {
    if (!env.GEMINI_API_KEY) {
        return "No audit available (Gemini key missing).";
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `You are an email communication auditor. Review this draft email based on the user's intent.

USER'S INTENT: ${userPrompt}

DRAFT EMAIL:
${draftContent}

Provide specific, actionable feedback to improve the email:
1. Does it match the user's intent?
2. Is the tone appropriate?
3. Is it clear and concise?
4. Any improvements needed?

Keep feedback brief and focused.`
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

        const quota = enforceUserQuota(auth.userId, "email-ai-compose", {
            perMinute: 5,
            perDay: 120,
        });
        if (!quota.allowed) {
            return NextResponse.json(
                { error: "Quota exceeded. Please try again later." },
                { status: 429, headers: { "Retry-After": String(quota.retryAfterSeconds) } }
            );
        }

        const body: ComposeRequest = await req.json();
        const { prompt, to, subject, existingBody } = body;

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

        let systemPrompt = `You are an expert email composer. Write professional, emotionally intelligent emails based on the user's description.

GUIDELINES:
- Write in a professional yet warm tone
- Be concise - avoid unnecessary words
- Match the tone to the context described
- Do NOT use overly formal language or excessive pleasantries
- Write naturally as if from a real person
${to ? `- The email is addressed to: ${to}` : ''}
${subject ? `- The subject is: ${subject}` : ''}`;

        let userPromptContent = `Write an email based on this description: ${prompt}

Provide ONLY the email body text, no subject line or greeting headers.`;

        if (existingBody && existingBody.trim().length > 0) {
            systemPrompt += `\n\nCONTEXT:\nThe user wants to MODIFY an existing email draft. Update the draft based on the user's instructions. Keep parts of the draft that don't need changing.`;
            userPromptContent = `EXISTING DRAFT:\n${existingBody}\n\nUSER INSTRUCTIONS:\n${prompt}\n\nPlease update the draft based on the instructions. Return the FULL updated email body.`;
        }

        // Step 1: ChatGPT generates initial draft
        const initialDraftResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: userPromptContent
                }
            ],
            temperature: 0.7,
            max_tokens: 1000,
        });

        const initialDraft = initialDraftResponse.choices[0]?.message?.content || "";

        // Step 2: Gemini audits the draft
        const geminiAudit = await auditWithGemini(initialDraft, prompt);

        // Step 3: ChatGPT reviews and finalizes based on Gemini's feedback
        const finalDraftResponse = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are refining an email draft based on audit feedback. Apply the feedback to improve the email. Return ONLY the final email body text.`
                },
                {
                    role: "user",
                    content: `ORIGINAL DRAFT:
${initialDraft}

AUDIT FEEDBACK:
${geminiAudit}

Apply the feedback and return the improved final email. Be concise.`
                }
            ],
            temperature: 0.5,
            max_tokens: 1000,
        });

        const finalDraft = finalDraftResponse.choices[0]?.message?.content || initialDraft;

        // Generate subject if not provided and it's a new draft
        let generatedSubject = subject;
        if (!subject && !existingBody) {
            const subjectResponse = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "user",
                        content: `Generate a concise email subject line (5-8 words max) for this email:\n\n${finalDraft}`
                    }
                ],
                temperature: 0.5,
                max_tokens: 50,
            });
            generatedSubject = subjectResponse.choices[0]?.message?.content?.replace(/^["']|["']$/g, '') || "Email";
        }

        return NextResponse.json({
            success: true,
            initialDraft,
            geminiAudit,
            finalDraft,
            subject: generatedSubject,
        });

    } catch (error: unknown) {
        console.error("AI Compose API error:", error);
        const message = error instanceof Error ? error.message : "Failed to generate AI draft";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
