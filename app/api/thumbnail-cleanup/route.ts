import { NextRequest, NextResponse } from "next/server";
import { ThumbnailCleanup } from "@/lib/thumbnail-cleanup";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const cleanup = ThumbnailCleanup.getInstance();
    const result = await cleanup.cleanupOldThumbnails();

    return NextResponse.json({
      success: true,
      message: `Cleanup completed: ${result.deleted} files deleted, ${result.errors} errors`,
      result,
    });
  } catch (error) {
    console.error("Error during cleanup:", error);
    return NextResponse.json(
      { error: "Failed to perform cleanup" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cleanup = ThumbnailCleanup.getInstance();
    const stats = await cleanup.getStorageStats();

    return NextResponse.json({
      success: true,
      stats,
      message: `Storage stats: ${stats.totalFiles} files, ${(
        stats.totalSize /
        1024 /
        1024
      ).toFixed(2)} MB`,
    });
  } catch (error) {
    console.error("Error getting storage stats:", error);
    return NextResponse.json(
      { error: "Failed to get storage stats" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServiceClient();

    // Get all rooms with thumbnail URLs
    const { data: rooms } = await supabase
      .from("trading_rooms")
      .select("id, thumbnail_url")
      .not("thumbnail_url", "is", null);

    let cleanedCount = 0;
    let errorCount = 0;

    if (rooms) {
      for (const room of rooms) {
        if (room.thumbnail_url) {
          const fileName = room.thumbnail_url.split("/").pop();
          if (fileName) {
            try {
              // Check if the file exists in storage
              const { data: fileExists } = await supabase.storage
                .from("room-thumbnails")
                .list("", {
                  search: fileName,
                });

              // If file doesn't exist, clear the database entry
              if (!fileExists || fileExists.length === 0) {
                await supabase
                  .from("trading_rooms")
                  .update({ thumbnail_url: null })
                  .eq("id", room.id);
                cleanedCount++;
              }
            } catch (_error) {
              errorCount++;
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Database cleanup completed: ${cleanedCount} orphaned entries cleaned, ${errorCount} errors`,
      result: { cleaned: cleanedCount, errors: errorCount },
    });
  } catch (error) {
    console.error("Error during database cleanup:", error);
    return NextResponse.json(
      { error: "Failed to perform database cleanup" },
      { status: 500 }
    );
  }
}
