import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { env } from "@/env";

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthContext(request);

        if (!auth?.accessToken) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const query = searchParams.get("query");

        if (!query || query.length < 2) {
            return NextResponse.json({ predictions: [] });
        }

        const apiKey = env.GOOGLE_PLACES_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ predictions: [] });
        }

        const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&types=establishment|geocode&key=${apiKey}`
        );

        if (!response.ok) {
            // Fallback: return empty if Places API not configured
            console.log("Places API not configured, returning empty results");
            return NextResponse.json({ predictions: [] });
        }

        const data = await response.json();

        return NextResponse.json({
            predictions: data.predictions?.map((p: { place_id: string; description: string; structured_formatting: unknown }) => ({
                place_id: p.place_id,
                description: p.description,
                structured_formatting: p.structured_formatting,
            })) || []
        });
    } catch (error: unknown) {
        console.error("Places autocomplete error:", error);
        return NextResponse.json({ predictions: [] });
    }
}
