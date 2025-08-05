import { createServiceClient } from "@/lib/supabase/server";
import { ScreenshotService } from "./screenshot-service";

export class ThumbnailScheduler {
  private static instance: ThumbnailScheduler;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private baseUrl: string;

  private constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  static getInstance(baseUrl: string): ThumbnailScheduler {
    if (!ThumbnailScheduler.instance) {
      ThumbnailScheduler.instance = new ThumbnailScheduler(baseUrl);
    }
    return ThumbnailScheduler.instance;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      // console.log("Thumbnail scheduler is already running");
      return;
    }

    this.isRunning = true;
    //   console.log("Starting thumbnail scheduler...");

    // Take initial screenshots
    await this.updateAllActiveRoomThumbnails();

    // Set up interval for every 30 seconds
    this.intervalId = setInterval(async () => {
      await this.updateAllActiveRoomThumbnails();
    }, 30000); // 30 seconds
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    //   console.log("Thumbnail scheduler stopped");
  }

  private async updateAllActiveRoomThumbnails(): Promise<void> {
    try {
      const supabase = await createServiceClient();

      // Get all active rooms
      const { data: activeRooms, error } = await supabase
        .from("trading_rooms")
        .select("id, name, room_status")
        .eq("room_status", "active")
        .eq("is_active", true);

      if (error || !activeRooms) {
        console.error("Error fetching active rooms:", error);
        return;
      }

      //   console.log(`Updating thumbnails for ${activeRooms.length} active rooms`);

      // Update thumbnails for all active rooms
      const screenshotService = ScreenshotService.getInstance();

      for (const room of activeRooms) {
        try {
          //   console.log(`Taking screenshot for room: ${room.name} (${room.id})`);
          await screenshotService.updateRoomThumbnail(room.id, this.baseUrl);
        } catch (error) {
          console.error(`Error updating thumbnail for room ${room.id}:`, error);
        }
      }

      //   console.log("Finished updating room thumbnails");
    } catch (error) {
      console.error("Error in updateAllActiveRoomThumbnails:", error);
    }
  }

  async updateSingleRoomThumbnail(roomId: string): Promise<boolean> {
    try {
      const screenshotService = ScreenshotService.getInstance();
      return await screenshotService.updateRoomThumbnail(roomId, this.baseUrl);
    } catch (error) {
      console.error(`Error updating thumbnail for room ${roomId}:`, error);
      return false;
    }
  }
}
