import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: rooms, error } = await supabase
      .from("trading_rooms")
      .select("name")
      .not("name", "is", null)
      .limit(1000); // Limit to prevent large responses

    if (error) {
      console.error("Error fetching room names:", error);
      return NextResponse.json(
        { error: "Failed to fetch room names" },
        { status: 500 }
      );
    }

    const names = rooms?.map((room) => room.name) || [];

    return NextResponse.json({ names });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
