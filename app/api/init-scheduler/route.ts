import { NextResponse } from "next/server";

// Initialize the server-side scheduler exactly once per process
let started = false;

export async function GET() {
  try {
    if (!started) {
      await import("@/lib/scheduler");
      started = true;
      console.log("✅ Scheduler initialized via /api/init-scheduler");
    }
    return NextResponse.json({ ok: true, started });
  } catch (error: unknown) {
    console.error("❌ Scheduler init failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: String(error instanceof Error ? error.message : error),
      },
      { status: 500 }
    );
  }
}
