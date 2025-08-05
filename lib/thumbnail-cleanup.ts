import { createServiceClient } from "@/lib/supabase/server";

export class ThumbnailCleanup {
  private static instance: ThumbnailCleanup;

  private constructor() {}

  static getInstance(): ThumbnailCleanup {
    if (!ThumbnailCleanup.instance) {
      ThumbnailCleanup.instance = new ThumbnailCleanup();
    }
    return ThumbnailCleanup.instance;
  }

  async cleanupOldThumbnails(): Promise<{ deleted: number; errors: number }> {
    try {
      const supabase = await createServiceClient();

      // Get all files in the room-thumbnails bucket
      const { data: files, error } = await supabase.storage
        .from("room-thumbnails")
        .list("", {
          limit: 1000,
          offset: 0,
        });

      if (error) {
        console.error("Error listing files:", error);
        return { deleted: 0, errors: 1 };
      }

      if (!files || files.length === 0) {
        // console.log("No files to clean up");
        return { deleted: 0, errors: 0 };
      }

      //   console.log(`Found ${files.length} files in storage`);

      // Get current thumbnail URLs from database
      const { data: rooms, error: roomsError } = await supabase
        .from("trading_rooms")
        .select("id, thumbnail_url")
        .not("thumbnail_url", "is", null);

      if (roomsError) {
        console.error("Error fetching rooms:", roomsError);
        return { deleted: 0, errors: 1 };
      }

      // Create a set of current thumbnail filenames
      const currentThumbnails = new Set<string>();
      rooms?.forEach((room) => {
        if (room.thumbnail_url) {
          const fileName = room.thumbnail_url.split("/").pop();
          if (fileName) {
            currentThumbnails.add(fileName);
          }
        }
      });

      //   console.log(
      //     `Found ${currentThumbnails.size} current thumbnails in database`
      //   );

      // Find files to delete (files not in current thumbnails)
      const filesToDelete = files
        .filter((file) => !currentThumbnails.has(file.name))
        .map((file) => file.name);

      //   console.log(`Found ${filesToDelete.length} files to delete`);

      if (filesToDelete.length === 0) {
        // console.log("No old files to delete");
        return { deleted: 0, errors: 0 };
      }

      // Delete old files in batches
      const batchSize = 50;
      let deleted = 0;
      let errors = 0;

      for (let i = 0; i < filesToDelete.length; i += batchSize) {
        const batch = filesToDelete.slice(i, i + batchSize);

        try {
          const { error: deleteError } = await supabase.storage
            .from("room-thumbnails")
            .remove(batch);

          if (deleteError) {
            console.error("Error deleting batch:", deleteError);
            errors += batch.length;
          } else {
            deleted += batch.length;
            // console.log(
            //   `Deleted batch ${Math.floor(i / batchSize) + 1}: ${
            //     batch.length
            //   } files`
            // );
          }
        } catch (error) {
          console.error("Error in batch deletion:", error);
          errors += batch.length;
        }
      }

      //   console.log(`Cleanup completed: ${deleted} deleted, ${errors} errors`);
      return { deleted, errors };
    } catch (error) {
      console.error("Error in cleanup:", error);
      return { deleted: 0, errors: 1 };
    }
  }

  async getStorageStats(): Promise<{ totalFiles: number; totalSize: number }> {
    try {
      const supabase = await createServiceClient();

      const { data: files, error } = await supabase.storage
        .from("room-thumbnails")
        .list("", {
          limit: 1000,
          offset: 0,
        });

      if (error || !files) {
        return { totalFiles: 0, totalSize: 0 };
      }

      const totalSize = files.reduce(
        (sum, file) => sum + (file.metadata?.size || 0),
        0
      );

      return {
        totalFiles: files.length,
        totalSize: totalSize,
      };
    } catch (error) {
      console.error("Error getting storage stats:", error);
      return { totalFiles: 0, totalSize: 0 };
    }
  }
}
