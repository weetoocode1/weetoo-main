import { createClient } from "@/lib/supabase/server";
import { TRADING_SYMBOLS } from "@/lib/trading/symbols-config";
import { NextResponse } from "next/server";

// Type for a row from the fast_trading_rooms view
interface TradingRoomView {
  id: string;
  name: string;
  symbol: string;
  category: "regular" | "voice";
  privacy: "public" | "private";
  created_at: string;
  creator_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  participants: number | null;
  total_pnl: number | null;
}

// Type for thumbnail data
interface ThumbnailData {
  id: string;
  thumbnail_url: string | null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") || 1);
  const pageSize = Number(url.searchParams.get("pageSize") || 20);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createClient();
  const start = Date.now();

  // Optimized: Single query with participant count included
  const {
    data: roomsData,
    error: roomsError,
    count: totalCount,
  } = await supabase
    .from("fast_trading_rooms")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (roomsError || !roomsData) {
    return NextResponse.json({ data: [], total: 0 });
  }

  // Fetch thumbnail URLs in parallel with room data
  const roomIds = roomsData.map((room) => room.id);
  const [thumbnailResult, participantResult] = await Promise.all([
    supabase
      .from("trading_rooms")
      .select("id, thumbnail_url")
      .in("id", roomIds),
    supabase
      .from("trading_room_participants")
      .select("room_id")
      .in("room_id", roomIds)
      .is("left_at", null),
  ]);

  // Create a map of room ID to thumbnail URL
  const thumbnailMap = new Map<string, string | null>();
  if (thumbnailResult.data && !thumbnailResult.error) {
    thumbnailResult.data.forEach((item: ThumbnailData) => {
      thumbnailMap.set(item.id, item.thumbnail_url);
    });
  }

  // Create a map of room ID to participant count
  const participantCountMap = new Map<string, number>();
  if (participantResult.data && !participantResult.error) {
    participantResult.data.forEach((participant) => {
      const roomId = participant.room_id;
      participantCountMap.set(
        roomId,
        (participantCountMap.get(roomId) || 0) + 1
      );
    });
  }

  // Map final result to match frontend expectations
  const mapped = roomsData.map((room: TradingRoomView) => {
    const fullName =
      [room.first_name, room.last_name].filter(Boolean).join(" ") || "-";
    const dateObj = new Date(room.created_at);
    const isValidDate = !isNaN(dateObj.getTime());
    const createdAt = isValidDate ? dateObj.toISOString() : "-";
    const createdAtTimestamp = isValidDate ? dateObj.getTime() : 0;
    const startingBalance = 100000;
    const pnlPercent = startingBalance
      ? (Number(room.total_pnl) / startingBalance) * 100
      : 0;

    // Use calculated participant count instead of view's participant count
    const participantCount = participantCountMap.get(room.id) || 0;

    return {
      id: room.id,
      name: room.name,
      creator: {
        id: room.creator_id,
        name: fullName,
        avatar: room.avatar_url || "",
      },
      symbol: room.symbol,
      category: room.category,
      createdAt,
      createdAtTimestamp,
      isPublic: room.privacy === "public",
      participants: participantCount,
      pnlPercentage: pnlPercent,
      thumbnail_url: thumbnailMap.get(room.id) || null,
    };
  });

  const end = Date.now();
  console.log(
    "API /api/trading-rooms total time (optimized):",
    end - start,
    "ms"
  );

  // Add cache headers for better performance but allow real-time updates
  return NextResponse.json(
    { data: mapped, total: totalCount || 0 },
    {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
      },
    }
  );
}

// Add PATCH handler for backend validation
export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, name, symbol, privacy, password, updatedAt } = body;
  // Allowed symbols (no hardcoding elsewhere)
  const allowedSymbols = TRADING_SYMBOLS.map((s) => s.value);
  if (!id) {
    return new Response(JSON.stringify({ error: "Room ID is required." }), {
      status: 400,
    });
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    return new Response(JSON.stringify({ error: "Room name is required." }), {
      status: 400,
    });
  }
  if (
    !symbol ||
    typeof symbol !== "string" ||
    !allowedSymbols.includes(symbol)
  ) {
    return new Response(JSON.stringify({ error: "Invalid symbol." }), {
      status: 400,
    });
  }
  if (
    privacy === "private" &&
    (!password || typeof password !== "string" || !password.trim())
  ) {
    return new Response(
      JSON.stringify({ error: "Password is required for private rooms." }),
      { status: 400 }
    );
  }
  if (privacy !== "public" && privacy !== "private") {
    return new Response(JSON.stringify({ error: "Invalid privacy value." }), {
      status: 400,
    });
  }
  if (!updatedAt) {
    return new Response(
      JSON.stringify({
        error: "updatedAt is required for concurrency control.",
      }),
      { status: 400 }
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trading_rooms")
    .update({
      name: name.trim(),
      symbol,
      privacy,
      password: privacy === "private" ? password : null,
    })
    .eq("id", id)
    .eq("updated_at", updatedAt)
    .select("updated_at")
    .maybeSingle();
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
  if (!data) {
    // Retry once with the latest updated_at to avoid false conflicts from background updates
    const { data: latest, error: latestErr } = await supabase
      .from("trading_rooms")
      .select("updated_at")
      .eq("id", id)
      .maybeSingle();
    if (latestErr || !latest?.updated_at) {
      return new Response(
        JSON.stringify({
          error:
            "Room was updated recently. Please refresh the page and try again.",
        }),
        { status: 409 }
      );
    }

    const { data: retry, error: retryErr } = await supabase
      .from("trading_rooms")
      .update({
        name: name.trim(),
        symbol,
        privacy,
        password: privacy === "private" ? password : null,
      })
      .eq("id", id)
      .eq("updated_at", latest.updated_at)
      .select("updated_at")
      .maybeSingle();
    if (retryErr) {
      return new Response(JSON.stringify({ error: retryErr.message }), {
        status: 500,
      });
    }
    if (!retry) {
      return new Response(
        JSON.stringify({
          error:
            "Room was updated recently. Please refresh the page and try again.",
        }),
        { status: 409 }
      );
    }
    return new Response(
      JSON.stringify({ success: true, updatedAt: retry.updated_at }),
      { status: 200 }
    );
  }
  return new Response(
    JSON.stringify({ success: true, updatedAt: data.updated_at }),
    { status: 200 }
  );
}
