import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { google } from "googleapis";
import { getAuthContext } from "@/lib/auth";

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthContext(req);

        if (!auth?.accessToken) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const body = await req.json();
        const { messageIds, action, labelId } = body;

        if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
            return NextResponse.json({ error: "No message IDs provided" }, { status: 400 });
        }

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: auth.accessToken,
        });

        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        // Handle different actions
        for (const id of messageIds) {
            if (action === "delete") {
                await gmail.users.messages.trash({ userId: "me", id });
            } else if (action === "markAsRead") {
                await gmail.users.messages.batchModify({
                    userId: "me",
                    requestBody: {
                        ids: [id],
                        removeLabelIds: ["UNREAD"],
                    },
                });
            } else if (action === "addLabel" && labelId) {
                await gmail.users.messages.batchModify({
                    userId: "me",
                    requestBody: {
                        ids: [id],
                        addLabelIds: [labelId],
                    },
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Gmail Action API error:", error);
        const message = error instanceof Error ? error.message : "Failed to perform email action";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
