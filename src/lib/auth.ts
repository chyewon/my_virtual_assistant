import GoogleProvider from "next-auth/providers/google";
import { NextAuthOptions } from "next-auth";
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { env } from "@/env";

function isAllowedEmail(email: string): boolean {
    const normalizedEmail = email.toLowerCase().trim();
    const allowedEmails = env.ALLOWED_EMAILS
        ?.split(",")
        .map((entry) => entry.toLowerCase().trim())
        .filter(Boolean) ?? [];
    const allowedDomain = env.ALLOWED_EMAIL_DOMAIN?.toLowerCase().trim();

    if (allowedEmails.length === 0 && !allowedDomain) {
        return true;
    }

    const listed = allowedEmails.includes(normalizedEmail);
    const matchesDomain = allowedDomain ? normalizedEmail.endsWith(`@${allowedDomain}`) : false;

    return listed || matchesDomain;
}

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            authorization: {
                params: {
                    scope: "openid email profile https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/tasks",
                    access_type: "offline",
                    prompt: "consent",
                },
            },
        }),
    ],
    callbacks: {
        async signIn({ user }) {
            if (!user.email) {
                return false;
            }
            return isAllowedEmail(user.email);
        },
        async jwt({ token, account }) {
            if (account) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                token.expiresAt = account.expires_at;
            }
            return token;
        },
        async session({ session }) {
            return session;
        },
    },
    pages: {
        signIn: "/",
    },
    session: {
        strategy: "jwt",
    },
};

export interface AuthContext {
    accessToken: string;
    refreshToken?: string;
    userId: string;
    email?: string;
}

export async function getAuthContext(request: Request | NextRequest): Promise<AuthContext | null> {
    const token = await getToken({
        req: request as NextRequest,
        secret: env.NEXTAUTH_SECRET,
    });

    if (!token || typeof token.accessToken !== "string" || typeof token.sub !== "string") {
        return null;
    }

    return {
        accessToken: token.accessToken,
        refreshToken: typeof token.refreshToken === "string" ? token.refreshToken : undefined,
        userId: token.sub,
        email: typeof token.email === "string" ? token.email : undefined,
    };
}
