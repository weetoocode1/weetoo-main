import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { roomId, password } = await req.json();
  if (!roomId || !password) {
    return NextResponse.json(
      { error: "Missing roomId or password" },
      { status: 400 }
    );
  }
  const supabase = await createClient();
  const { data: room, error } = await supabase
    .from("trading_rooms")
    .select("password")
    .eq("id", roomId)
    .single();
  if (error || !room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  const isValid = await bcrypt.compare(password, room.password || "");
  if (!isValid) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }
  return NextResponse.json({ success: true });
}
