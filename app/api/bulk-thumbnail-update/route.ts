import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { ScreenshotService } from "@/lib/screenshot-service";

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from a trusted source (optional)
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createServiceClient();

    // Get all active rooms
    const { data: activeRooms, error } = await supabase
      .from("trading_rooms")
      .select("id, name, room_status")
      .eq("room_status", "active")
      .eq("is_active", true);

    if (error || !activeRooms) {
      return NextResponse.json(
        { error: "Failed to fetch active rooms" },
        { status: 500 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const screenshotService = ScreenshotService.getInstance();

    const results = [];

    // Update thumbnails for all active rooms
    for (const room of activeRooms) {
      try {
        const success = await screenshotService.updateRoomThumbnail(
          room.id,
          baseUrl
        );
        results.push({
          roomId: room.id,
          roomName: room.name,
          success,
        });
      } catch (error) {
        results.push({
          roomId: room.id,
          roomName: room.name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${results.filter((r) => r.success).length} out of ${
        results.length
      } rooms`,
      results,
    });
  } catch (error) {
    console.error("Error in bulk thumbnail update:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Bulk thumbnail update API is running",
    usage: "POST with authorization header to trigger thumbnail updates",
  });
}
