import { NextRequest, NextResponse } from "next/server";
import { ThumbnailScheduler } from "@/lib/thumbnail-scheduler";

export async function POST(request: NextRequest) {
  try {
    const { action, roomId } = await request.json();

    // Get base URL from environment or request
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      `${request.nextUrl.protocol}//${request.nextUrl.host}`;

    const scheduler = ThumbnailScheduler.getInstance(baseUrl);

    switch (action) {
      case "start":
        await scheduler.start();
        return NextResponse.json({
          success: true,
          message: "Thumbnail scheduler started",
        });

      case "stop":
        scheduler.stop();
        return NextResponse.json({
          success: true,
          message: "Thumbnail scheduler stopped",
        });

      case "update-single":
        if (!roomId) {
          return NextResponse.json(
            {
              error: "Room ID is required for single room update",
            },
            { status: 400 }
          );
        }

        const success = await scheduler.updateSingleRoomThumbnail(roomId);
        return NextResponse.json({
          success,
          message: success
            ? "Room thumbnail updated"
            : "Failed to update room thumbnail",
        });

      default:
        return NextResponse.json(
          {
            error: "Invalid action. Use: start, stop, or update-single",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in thumbnail scheduler API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get base URL from environment
    // const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    // const scheduler = ThumbnailScheduler.getInstance(baseUrl);

    return NextResponse.json({
      message: "Thumbnail scheduler API is running",
      endpoints: {
        "POST /api/thumbnail-scheduler": "Control the scheduler",
        "POST /api/room-thumbnail": "Update single room thumbnail",
        "GET /api/room-thumbnail?roomId=xxx": "Get room thumbnail URL",
      },
    });
  } catch (error) {
    console.error("Error in thumbnail scheduler GET:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
