import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name");
  const excludeId = searchParams.get("excludeId");

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json(
      { error: "Room name is required." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  let query = supabase
    .from("trading_rooms")
    .select("id")
    .ilike("name", name.trim())
    .limit(1);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Database error." }, { status: 500 });
  }

  return NextResponse.json({ exists: !!(data && data.length > 0) });
}
