import { NextRequest, NextResponse } from "next/server";
import { ScreenshotService } from "@/lib/screenshot-service";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Check if request has content
    const contentType = request.headers.get("content-type");

    if (!contentType || !contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Content-Type must be application/json" },
        { status: 400 }
      );
    }

    let body;
    try {
      const text = await request.text();

      if (!text) {
        return NextResponse.json(
          { error: "Request body is empty" },
          { status: 400 }
        );
      }

      body = JSON.parse(text);
    } catch (_parseError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { roomId } = body;

    if (!roomId) {
      return NextResponse.json(
        { error: "Room ID is required" },
        { status: 400 }
      );
    }

    // Get base URL from environment or request
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      `${request.nextUrl.protocol}//${request.nextUrl.host}:${
        request.nextUrl.port || ""
      }`;

    // Get screenshot service instance
    const screenshotService = ScreenshotService.getInstance();

    // Update room thumbnail
    const success = await screenshotService.updateRoomThumbnail(
      roomId,
      baseUrl
    );

    if (success) {
      return NextResponse.json({
        success: true,
        message: "Room thumbnail updated successfully",
      });
    } else {
      return NextResponse.json(
        {
          error: "Failed to update room thumbnail",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in room thumbnail API:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    if (!roomId) {
      return NextResponse.json(
        { error: "Room ID is required" },
        { status: 400 }
      );
    }

    // Get current thumbnail URL from database
    const supabase = await createClient();
    const { data: room, error } = await supabase
      .from("trading_rooms")
      .select("thumbnail_url")
      .eq("id", roomId)
      .single();

    if (error || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json({
      thumbnailUrl: room.thumbnail_url,
    });
  } catch (error) {
    console.error("Error getting room thumbnail:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
