import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ "trading-roomId": string }> }
) {
  try {
    const resolvedParams = await params;
    const tradingRoomId = resolvedParams["trading-roomId"];

    if (!tradingRoomId) {
      return NextResponse.json(
        { error: "Room ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data: room, error: roomError } = await supabase
      .from("trading_rooms")
      .select("id, name, description, privacy, symbol, creator_id, category, tags")
      .eq("id", tradingRoomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ "trading-roomId": string }> }
) {
  try {
    const resolvedParams = await params;
    const tradingRoomId = resolvedParams["trading-roomId"];

    const body = await request.json();
    const { name, privacy, symbol, description, tags } = body;

    if (!tradingRoomId) {
      return NextResponse.json(
        { error: "Room ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user owns this room and get room data in one query
    const { data: room, error: roomError } = await supabase
      .from("trading_rooms")
      .select("creator_id, name, privacy, symbol")
      .eq("id", tradingRoomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.creator_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden: You can only edit your own rooms" },
        { status: 403 }
      );
    }

    // Update room details
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (privacy !== undefined) updateData.privacy = privacy;
    if (symbol !== undefined) updateData.symbol = symbol;
    if (description !== undefined)
      updateData.description = description?.trim() || null;
    if (tags !== undefined) {
      if (Array.isArray(tags) && tags.length <= 5) {
        updateData.tags = tags.map((tag: string) => tag.trim()).filter((tag: string) => tag);
      } else if (tags === null) {
        updateData.tags = null;
      }
    }

    const { data: updatedRoom, error: updateError } = await supabase
      .from("trading_rooms")
      .update(updateData)
      .eq("id", tradingRoomId)
      .select(
        "id, name, description, tags, privacy, symbol, creator_id, category, is_active, room_status, virtual_balance, updated_at"
      )
      .single();

    if (updateError) {
      console.error("Error updating room:", updateError);
      return NextResponse.json(
        { error: "Failed to update room" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      room: updatedRoom,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
