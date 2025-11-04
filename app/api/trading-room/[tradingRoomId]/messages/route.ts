import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tradingRoomId: string }> }
) {
  try {
    const { tradingRoomId } = await params;
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trimmedMessage = message.trim().slice(0, 5000);

    const { data: room, error: roomError } = await supabase
      .from("trading_rooms")
      .select("id, room_status, privacy")
      .eq("id", tradingRoomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.room_status !== "active") {
      return NextResponse.json(
        { error: "Room is not active" },
        { status: 400 }
      );
    }

    const serviceClient = await createServiceClient();
    const { data: insertedMessage, error: insertError } = await serviceClient
      .from("trading_room_messages")
      .insert({
        room_id: tradingRoomId,
        user_id: user.id,
        message: trimmedMessage,
      })
      .select("id, created_at")
      .single();

    if (insertError) {
      console.error("Error inserting message:", insertError);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: insertedMessage.id,
      created_at: insertedMessage.created_at,
    });
  } catch (error) {
    console.error(
      "Error in POST /api/trading-room/[tradingRoomId]/messages:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
