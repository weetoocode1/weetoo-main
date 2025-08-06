import { NextRequest, NextResponse } from "next/server";
import { ScreenshotService } from "@/lib/screenshot-service";

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

    // Read body as text first
    const bodyText = await request.text();
    if (!bodyText) {
      return NextResponse.json(
        { error: "Request body is empty" },
        { status: 400 }
      );
    }

    // Parse JSON
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (_error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { roomId } = body;

    if (!roomId) {
      return NextResponse.json(
        { error: "roomId is required" },
        { status: 400 }
      );
    }

    // Test: Add a simple log to verify the API is being called
    console.log(
      `API called for room: ${roomId} at ${new Date().toISOString()}`
    );

    // Determine base URL dynamically
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const host = request.headers.get("host") || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    // Use screenshot service (now works with @sparticuz/chromium)
    const screenshotService = ScreenshotService.getInstance();
    const success = await screenshotService.updateRoomThumbnail(
      roomId,
      baseUrl
    );

    if (success) {
      console.log(`Screenshot service completed for room: ${roomId}`);
      return NextResponse.json({ success: true });
    } else {
      console.log(
        `Screenshot service skipped for room: ${roomId} (too soon or already processing)`
      );
      return NextResponse.json({
        success: false,
        message: "Screenshot skipped - too soon or already processing",
      });
    }
  } catch (error) {
    console.error("Error in room thumbnail API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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
        { error: "roomId is required" },
        { status: 400 }
      );
    }

    const { createServiceClient } = await import("@/lib/supabase/server");
    const supabase = await createServiceClient();

    const { data, error } = await supabase
      .from("trading_rooms")
      .select("thumbnail_url")
      .eq("id", roomId)
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch thumbnail URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      thumbnail_url: data?.thumbnail_url,
      has_custom_thumbnail: false,
    });
  } catch (error) {
    console.error("Error fetching thumbnail URL:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
