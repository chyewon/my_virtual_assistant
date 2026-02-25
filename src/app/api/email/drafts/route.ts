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

        // Fetch drafts
        const draftsRes = await gmail.users.drafts.list({
            userId: "me",
            maxResults: 10,
        });

        const drafts = draftsRes.data.drafts || [];

        // Get details for each draft
        const draftDetails = await Promise.all(
            drafts.map(async (draft) => {
                const draftData = await gmail.users.drafts.get({
                    userId: "me",
                    id: draft.id!,
                    format: "full",
                });

                const message = draftData.data.message;
                const headers = message?.payload?.headers || [];

                const getHeader = (name: string) =>
                    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

                // Extract body
                let body = "";
                const payload = message?.payload;
                if (payload?.body?.data) {
                    body = Buffer.from(payload.body.data, "base64").toString("utf-8");
                } else if (payload?.parts) {
                    const textPart = payload.parts.find(p => p.mimeType === "text/plain" || p.mimeType === "text/html");
                    if (textPart?.body?.data) {
                        body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
                    }
                }

                return {
                    id: draft.id,
                    messageId: message?.id,
                    subject: getHeader("Subject") || "(No Subject)",
                    to: getHeader("To") || "",
                    snippet: message?.snippet || "",
                    body,
                    date: getHeader("Date"),
                };
            })
        );

        return NextResponse.json({ drafts: draftDetails });
    } catch (error: unknown) {
        console.error("Gmail Drafts API error:", error);
        const message = error instanceof Error ? error.message : "Failed to fetch drafts";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
