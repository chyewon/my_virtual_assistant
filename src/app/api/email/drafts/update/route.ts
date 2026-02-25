import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { google } from "googleapis";
import { getAuthContext } from "@/lib/auth";

interface DraftRequest {
    draftId?: string;
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    body: string;
}

function sanitizeHeader(value: string): string {
    return value.replace(/[\r\n]/g, "").trim();
}

function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

function validateEmails(emails: string): boolean {
    return emails.split(",").every((email) => isValidEmail(email.trim()));
}

function buildEmailMessage(data: DraftRequest): string {
    const headers = [`To: ${sanitizeHeader(data.to)}`, `Subject: ${sanitizeHeader(data.subject)}`];
    if (data.cc) headers.push(`Cc: ${sanitizeHeader(data.cc)}`);
    if (data.bcc) headers.push(`Bcc: ${sanitizeHeader(data.bcc)}`);
    headers.push(`Content-Type: text/plain; charset="UTF-8"`);
    return [...headers, "", data.body].join("\r\n");
}

function encodeMessage(message: string): string {
    return Buffer.from(message)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

// Create a new draft
export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthContext(req);
        if (!auth?.accessToken) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const data: DraftRequest = await req.json();
        if (!data.to || !validateEmails(data.to)) {
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

        const response = await gmail.users.drafts.create({
            userId: "me",
            requestBody: {
                message: { raw: encodedMessage }
            }
        });

        return NextResponse.json({
            success: true,
            draftId: response.data.id,
            message: "Draft created successfully!"
        });
    } catch (error: unknown) {
        console.error("Create Draft API error:", error);
        const message = error instanceof Error ? error.message : "Failed to create draft";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// Update an existing draft
export async function PUT(req: NextRequest) {
    try {
        const auth = await getAuthContext(req);
        if (!auth?.accessToken) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const data: DraftRequest = await req.json();
        if (!data.draftId) {
            return NextResponse.json({ error: "Draft ID is required" }, { status: 400 });
        }
        if (!data.to || !validateEmails(data.to)) {
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

        const response = await gmail.users.drafts.update({
            userId: "me",
            id: data.draftId,
            requestBody: {
                message: { raw: encodedMessage }
            }
        });

        return NextResponse.json({
            success: true,
            draftId: response.data.id,
            message: "Draft updated successfully!"
        });
    } catch (error: unknown) {
        console.error("Update Draft API error:", error);
        const message = error instanceof Error ? error.message : "Failed to update draft";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
