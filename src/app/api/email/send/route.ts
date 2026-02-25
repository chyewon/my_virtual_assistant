import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { google } from "googleapis";
import { getAuthContext } from "@/lib/auth";

interface SendEmailRequest {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    body: string;
    draftId?: string; // Optional: if sending from a draft, we can delete it after
}

// Sanitize email header values to prevent header injection attacks
function sanitizeHeader(value: string): string {
    return value.replace(/[\r\n]/g, '').trim();
}

// Validate email format
function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

// Validate multiple comma-separated emails
function validateEmails(emails: string): boolean {
    return emails.split(',').every(email => isValidEmail(email.trim()));
}

function buildEmailMessage(data: SendEmailRequest): string {
    const headers = [
        `To: ${sanitizeHeader(data.to)}`,
        `Subject: ${sanitizeHeader(data.subject)}`,
        `Content-Type: text/plain; charset="UTF-8"`,
    ];
    if (data.cc) headers.splice(1, 0, `Cc: ${sanitizeHeader(data.cc)}`);
    if (data.bcc) headers.splice(data.cc ? 2 : 1, 0, `Bcc: ${sanitizeHeader(data.bcc)}`);
    return [...headers, "", data.body].join("\r\n");
}

function encodeMessage(message: string): string {
    return Buffer.from(message)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthContext(req);
        if (!auth?.accessToken) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const data: SendEmailRequest = await req.json();

        if (!data.to || !data.to.trim()) {
            return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });
        }

        if (!validateEmails(data.to)) {
            return NextResponse.json({ error: "Invalid recipient email format" }, { status: 400 });
        }

        if (data.cc && !validateEmails(data.cc)) {
            return NextResponse.json({ error: "Invalid CC email format" }, { status: 400 });
        }

        if (data.bcc && !validateEmails(data.bcc)) {
            return NextResponse.json({ error: "Invalid BCC email format" }, { status: 400 });
        }

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: auth.accessToken });
        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        const emailMessage = buildEmailMessage(data);
        const encodedMessage = encodeMessage(emailMessage);

        // Send the email
        const response = await gmail.users.messages.send({
            userId: "me",
            requestBody: {
                raw: encodedMessage,
            },
        });

        // If this was sent from a draft, delete the draft
        if (data.draftId) {
            try {
                await gmail.users.drafts.delete({
                    userId: "me",
                    id: data.draftId,
                });
            } catch (draftError) {
                // Don't fail the whole operation if draft deletion fails
                console.error("Failed to delete draft after sending:", draftError);
            }
        }

        return NextResponse.json({
            success: true,
            messageId: response.data.id,
            message: "Email sent successfully!",
        });
    } catch (error: unknown) {
        console.error("Send Email API error:", error);
        const message = error instanceof Error ? error.message : "Failed to send email";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
