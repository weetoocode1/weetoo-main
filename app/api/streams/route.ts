import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const roomId = searchParams.get("roomId");

    const supabase = await createClient();

    // If roomId is provided, allow public access (for viewers)
    if (roomId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Public query - only return public fields needed for viewing
      let publicQuery = supabase
        .from("user_streams")
        .select("stream_id, playback_id, status, started_at, custom_thumbnail_url, room_id")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false });

      if (status) {
        publicQuery = publicQuery.eq("status", status);
      }

      const { data: streamData, error: roomStreamError } = await publicQuery;

      if (roomStreamError) {
        console.error("Error fetching room stream:", roomStreamError);
        return NextResponse.json(
          { error: "Failed to fetch stream" },
          { status: 500 }
        );
      }

      if (!streamData || streamData.length === 0) {
        // Only return autoCreate if user is authenticated (for stream creators)
        return NextResponse.json({
          streams: [],
          ...(user ? { autoCreate: true } : {}),
        });
      }

      return NextResponse.json({ streams: streamData });
    }

    // For listing user's own streams, require authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let query = supabase
      .from("user_streams")
      .select(
        "*, trading_rooms(id, name, symbol, thumbnail_url), users(id, first_name, last_name, avatar_url)"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data: streams, error } = await query;

    if (error) {
      console.error("Error fetching streams:", error);
      return NextResponse.json(
        { error: "Failed to fetch streams" },
        { status: 500 }
      );
    }

    return NextResponse.json({ streams: streams || [] });
  } catch (error) {
    console.error("Error in GET /api/streams:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
