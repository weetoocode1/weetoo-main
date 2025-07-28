import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      name,
      description,
      startDate,
      endDate,
      startTime,
      endTime,
      competitionUrl,
    } = await request.json();

    // Automatically determine status based on dates and times
    const now = new Date();
    const startDateTime = new Date(startDate); // Now includes time from frontend
    const endDateTime = new Date(endDate); // Now includes time from frontend

    let status = "active"; // Default status

    console.log("Status check:", {
      now: now.toISOString(),
      startDateTime: startDateTime.toISOString(),
      endDateTime: endDateTime.toISOString(),
      nowMs: now.getTime(),
      startMs: startDateTime.getTime(),
      endMs: endDateTime.getTime(),
    });

    if (now.getTime() > endDateTime.getTime()) {
      status = "completed"; // Competition has ended
    } else if (
      now.getTime() >= startDateTime.getTime() &&
      now.getTime() <= endDateTime.getTime()
    ) {
      status = "inactive"; // Competition is currently running (users can't register)
    } else if (now.getTime() < startDateTime.getTime()) {
      status = "active"; // Competition hasn't started yet (users can register)
    }

    console.log("Determined status:", status);

    // Create the competition
    const { data: competition, error } = await supabase
      .from("competitions")
      .insert({
        name,
        description,
        start_date: startDate,
        end_date: endDate,
        start_time: startTime,
        end_time: endTime,
        competition_url: competitionUrl,
        status: status,
        created_by: null, // We'll set this to null since we removed current user check
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating competition:", error);
      return NextResponse.json(
        { error: "Failed to create competition" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Competition created successfully",
      competition,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();

    console.log("Fetching competitions from API...");

    // Get current user session for debugging
    const {
      data: { session },
    } = await supabase.auth.getSession();
    console.log(
      "Current session:",
      session ? "Authenticated" : "Not authenticated"
    );

    // Fetch all competitions - this should work for all users
    const { data: competitions, error } = await supabase
      .from("competitions")
      .select("*")
      .order("created_at", { ascending: false });

    console.log("API competitions result:", {
      competitionsCount: competitions?.length || 0,
      error: error?.message || null,
    });

    if (error) {
      console.error("Error fetching competitions:", error);
      return NextResponse.json(
        { error: "Failed to fetch competitions", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ competitions: competitions || [] });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
