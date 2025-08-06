import puppeteer, { Browser } from "puppeteer-core";
import { createServiceClient } from "@/lib/supabase/server";
import { existsSync } from "fs";

interface ScreenshotOptions {
  roomId: string;
  baseUrl: string;
  width?: number;
  height?: number;
}

export class ScreenshotService {
  private static instance: ScreenshotService;
  private browser: Browser | null = null;
  private lastScreenshotTimes: Map<string, number> = new Map();
  private isProcessing: Set<string> = new Set();

  private constructor() {}

  static getInstance(): ScreenshotService {
    if (!ScreenshotService.instance) {
      ScreenshotService.instance = new ScreenshotService();
    }
    return ScreenshotService.instance;
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      // Check if we're in a Vercel environment
      const isVercel = process.env.VERCEL === "1";

      if (isVercel) {
        // Use @sparticuz/chromium for Vercel compatibility
        const chromium = await import("@sparticuz/chromium");

        this.browser = await puppeteer.launch({
          args: chromium.default.args,
          defaultViewport: { width: 1920, height: 1080 },
          executablePath: await chromium.default.executablePath(),
          headless: true,
        });
      } else {
        // Local development - try to find Chrome
        const chromePaths = [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          "/usr/bin/google-chrome",
          "/usr/bin/chromium-browser",
          "/usr/bin/chromium",
          process.env.CHROME_PATH,
        ].filter(Boolean);

        let executablePath: string | undefined;

        for (const path of chromePaths) {
          if (path && existsSync(path)) {
            executablePath = path;
            break;
          }
        }

        if (!executablePath) {
          throw new Error(
            "Chrome not found. Please install Chrome or set CHROME_PATH environment variable."
          );
        }

        this.browser = await puppeteer.launch({
          headless: true,
          executablePath,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--disable-gpu",
          ],
        });
      }
    }
    return this.browser;
  }

  async takeRoomScreenshot({
    roomId,
    baseUrl,
    width = 1920,
    height = 1080,
  }: ScreenshotOptions): Promise<string | null> {
    try {
      console.log(`Starting takeRoomScreenshot for room: ${roomId}`);
      return await this.takeScreenshotWithPuppeteer(
        roomId,
        baseUrl,
        width,
        height
      );
    } catch (error) {
      console.error(`Error in takeRoomScreenshot for room: ${roomId}`, error);
      return null;
    }
  }

  private async takeScreenshotWithPuppeteer(
    roomId: string,
    baseUrl: string,
    width: number,
    height: number
  ): Promise<string | null> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // Set viewport
      await page.setViewport({ width, height });

      // Navigate to the room page
      const roomUrl = `${baseUrl}/room/${roomId}`;

      await page.goto(roomUrl, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      try {
        await page.waitForSelector('[data-testid="trading-room-window"]', {
          timeout: 15000,
        });
      } catch (_error) {
        // Continue if not found
      }

      // Wait for TradingView chart to load
      try {
        await page.waitForSelector('[data-testid="trading-view-chart"]', {
          timeout: 20000,
        });

        // Wait for the chart to actually render
        await page.waitForFunction(
          () => {
            const chartContainer = document.querySelector(
              '[data-testid="trading-view-chart"]'
            );
            const canvas = chartContainer?.querySelector("canvas");
            return canvas && canvas.width > 0 && canvas.height > 0;
          },
          { timeout: 30000 }
        );
      } catch (_error) {
        // Continue if not found
      }

      // Wait for participants to load
      try {
        await page.waitForSelector('[data-testid="participants-list"]', {
          timeout: 10000,
        });
      } catch (_error) {
        // Continue if not found
      }

      // Wait for market data to load
      try {
        await page.waitForFunction(
          () => {
            const priceElement = document.querySelector(
              '[data-testid="current-price"]'
            );
            return (
              priceElement &&
              priceElement.textContent &&
              priceElement.textContent !== "-" &&
              priceElement.textContent !== "0.00"
            );
          },
          { timeout: 15000 }
        );
      } catch (_error) {
        // Continue if not found
      }

      // Wait longer for all dynamic content to load
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // Final check - wait for any remaining dynamic content
      try {
        await page.waitForFunction(
          () => {
            // Check if TradingView chart has content
            const chartContainer = document.querySelector(
              '[data-testid="trading-view-chart"]'
            );
            const hasChartContent =
              chartContainer && chartContainer.children.length > 0;

            // Check if participants are loaded
            const participantsContainer = document.querySelector(
              '[data-testid="participants-list"]'
            );
            const hasParticipants =
              participantsContainer &&
              participantsContainer.textContent &&
              !participantsContainer.textContent.includes("Loading...");

            // Check if market data is loaded
            const priceElement = document.querySelector(
              '[data-testid="current-price"]'
            );
            const hasMarketData =
              priceElement &&
              priceElement.textContent &&
              priceElement.textContent !== "-" &&
              priceElement.textContent !== "0.00";

            return hasChartContent && hasParticipants && hasMarketData;
          },
          { timeout: 20000 }
        );
      } catch (_error) {
        // Continue anyway
      }

      // Take screenshot
      const screenshot = await page.screenshot({
        type: "png",
        fullPage: true,
      });

      // Upload to Supabase Storage
      const supabase = await createServiceClient();
      const fileName = `room-${roomId}-${Date.now()}.png`;

      console.log(
        `Uploading screenshot to Supabase for room: ${roomId}, fileName: ${fileName}`
      );
      const { error: uploadError } = await supabase.storage
        .from("room-thumbnails")
        .upload(fileName, screenshot, {
          contentType: "image/png",
          upsert: false,
        });

      if (uploadError) {
        console.error(`Upload error for room: ${roomId}`, uploadError);
        return null;
      }

      console.log(`Screenshot uploaded successfully for room: ${roomId}`);

      // Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("room-thumbnails").getPublicUrl(fileName);

      console.log(`Public URL generated for room: ${roomId}: ${publicUrl}`);
      return publicUrl;
    } catch (_error) {
      return null;
    } finally {
      await page.close();
    }
  }

  async updateRoomThumbnail(roomId: string, baseUrl: string): Promise<boolean> {
    // Server-side timing control - prevent screenshots too frequently
    const now = Date.now();
    const lastScreenshotTime = this.lastScreenshotTimes.get(roomId) || 0;
    const timeSinceLastScreenshot = now - lastScreenshotTime;
    const minIntervalMs = 600000; // 10 minutes minimum

    if (timeSinceLastScreenshot < minIntervalMs) {
      console.log(
        `Screenshot too soon for room: ${roomId} (${timeSinceLastScreenshot}ms < ${minIntervalMs}ms), skipping`
      );
      return false;
    }

    // Prevent multiple simultaneous screenshots for the same room
    if (this.isProcessing.has(roomId)) {
      console.log(
        `Screenshot already in progress for room: ${roomId}, skipping`
      );
      return false;
    }

    this.isProcessing.add(roomId);
    this.lastScreenshotTimes.set(roomId, now);

    try {
      console.log(
        `Screenshot service started for room: ${roomId} at ${new Date().toISOString()}`
      );

      // Take new screenshot first
      console.log(`Taking screenshot for room: ${roomId}...`);
      const newThumbnailUrl = await this.takeRoomScreenshot({
        roomId,
        baseUrl,
      });

      if (!newThumbnailUrl) {
        console.error(
          `Screenshot failed for room: ${roomId} - takeRoomScreenshot returned null/undefined`
        );
        return false;
      }

      console.log(
        `Screenshot taken successfully for room: ${roomId}, URL: ${newThumbnailUrl}`
      );

      console.log(
        `New screenshot taken for room: ${roomId}, updating thumbnail immediately`
      );

      // Get the current thumbnail URL before replacing
      console.log(`Connecting to database for room: ${roomId}...`);
      const supabase = await createServiceClient();

      console.log(`Fetching current thumbnail for room: ${roomId}...`);
      const { data: room, error: selectError } = await supabase
        .from("trading_rooms")
        .select("thumbnail_url")
        .eq("id", roomId)
        .single();

      if (selectError) {
        console.error(`Database select error for room: ${roomId}`, selectError);
        return false;
      }

      const oldThumbnailUrl = room?.thumbnail_url;
      console.log(`Current thumbnail for room: ${roomId}: ${oldThumbnailUrl}`);

      // Delete the old thumbnail if it exists
      if (oldThumbnailUrl) {
        try {
          console.log(`Deleting old thumbnail for room: ${roomId}...`);
          const oldFileName = oldThumbnailUrl.split("/").pop();
          if (oldFileName) {
            const { error: deleteError } = await supabase.storage
              .from("room-thumbnails")
              .remove([oldFileName]);

            if (deleteError) {
              console.error(
                `Error deleting old thumbnail for room: ${roomId}`,
                deleteError
              );
            } else {
              console.log(`Old thumbnail deleted for room: ${roomId}`);
            }
          }
        } catch (_error) {
          console.error(
            `Exception deleting old thumbnail for room: ${roomId}`,
            _error
          );
        }
      }

      // Update database with new thumbnail URL immediately
      console.log(
        `Updating database with new thumbnail for room: ${roomId}...`
      );
      const { error: updateError } = await supabase
        .from("trading_rooms")
        .update({ thumbnail_url: newThumbnailUrl })
        .eq("id", roomId);

      if (updateError) {
        console.error(
          `Database update failed for room: ${roomId}`,
          updateError
        );
        return false;
      } else {
        console.log(`Thumbnail successfully updated for room: ${roomId}`);
      }

      // Clean up any other orphaned files for this room
      try {
        console.log(`Cleaning up orphaned files for room: ${roomId}...`);
        const { data: files } = await supabase.storage
          .from("room-thumbnails")
          .list("", {
            search: `room-${roomId}-`,
          });

        if (files && files.length > 1) {
          // Keep only the newest file for this room
          const sortedFiles = files
            .filter((file) => file.name !== newThumbnailUrl.split("/").pop())
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            );

          if (sortedFiles.length > 0) {
            const filesToDelete = sortedFiles.map((file) => file.name);
            await supabase.storage
              .from("room-thumbnails")
              .remove(filesToDelete);
            console.log(
              `Cleaned up ${filesToDelete.length} orphaned files for room: ${roomId}`
            );
          }
        }
      } catch (_error) {
        console.error(`Error cleaning up files for room: ${roomId}`, _error);
      }

      console.log(
        `Screenshot service completed successfully for room: ${roomId}`
      );
      return true;
    } catch (error) {
      console.error(`Error in screenshot service for room: ${roomId}`, error);
      return false;
    } finally {
      // Remove from processing set
      this.isProcessing.delete(roomId);
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private async validateAndCleanupOrphanedThumbnails(
    supabase: Awaited<ReturnType<typeof createServiceClient>>
  ) {
    try {
      // Get all rooms with thumbnail URLs
      const { data: rooms } = await supabase
        .from("trading_rooms")
        .select("id, thumbnail_url")
        .not("thumbnail_url", "is", null);

      if (!rooms) return;

      for (const room of rooms) {
        if (room.thumbnail_url) {
          const fileName = room.thumbnail_url.split("/").pop();
          if (fileName) {
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
            }
          }
        }
      }
    } catch (_error) {
      // Silent error handling
    }
  }
}
