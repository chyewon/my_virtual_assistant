import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { google } from "googleapis";
import { getAuthContext } from "@/lib/auth";

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthContext(request);

        if (!auth?.accessToken) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: auth.accessToken,
        });

        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        // Get start of today in UTC
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const secondsSinceEpoch = Math.floor(startOfToday.getTime() / 1000);

        // Query for sent emails since today
        const response = await gmail.users.messages.list({
            userId: "me",
            q: `from:me after:${secondsSinceEpoch}`,
            maxResults: 20,
        });

        const messages = response.data.messages || [];
        const emailDetails = await Promise.all(
            messages.map(async (msg) => {
                const detail = await gmail.users.messages.get({
                    userId: "me",
                    id: msg.id!,
                    format: "full",
                });

                const headers = detail.data.payload?.headers || [];
                const subject = headers.find((h) => h.name === "Subject")?.value || "(No Subject)";
                const to = headers.find((h) => h.name === "To")?.value || "Unknown Recipient";
                const date = headers.find((h) => h.name === "Date")?.value || "";

                return {
                    id: msg.id,
                    subject,
                    to,
                    snippet: detail.data.snippet || "",
                    date,
                    threadId: msg.threadId,
                };
            })
        );

        return NextResponse.json({ emails: emailDetails });
    } catch (error: unknown) {
        console.error("Gmail API error (sent):", error);
        const message = error instanceof Error ? error.message : "Failed to fetch sent emails";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
