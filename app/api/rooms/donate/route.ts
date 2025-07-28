import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { roomId, amount } = await req.json();
    if (!roomId || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Not authenticated", userError);
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const userId = user.id;
    const { data: userData, error: userFetchError } = await supabase
      .from("users")
      .select("kor_coins")
      .eq("id", userId)
      .single();
    if (userFetchError || !userData) {
      console.error("User not found", userFetchError);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (userData.kor_coins < amount) {
      return NextResponse.json(
        { error: "Insufficient kor-coins" },
        { status: 400 }
      );
    }
    const { data: roomData, error: roomError } = await supabase
      .from("trading_rooms")
      .select("creator_id")
      .eq("id", roomId)
      .single();
    if (roomError || !roomData) {
      console.error("Room not found", roomError);
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }
    const creatorId = roomData.creator_id;

    try {
      const rpcPromise = supabase
        .rpc("donate_to_host", {
          p_room_id: roomId,
          p_user_id: userId,
          p_creator_id: creatorId,
          p_amount: amount,
        })
        .select();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 10000)
      );
      const result = await Promise.race([rpcPromise, timeoutPromise]);
      if (
        result &&
        typeof result === "object" &&
        "error" in result &&
        result.error
      ) {
        const txError = result.error;
        let errorMsg: string;
        if (typeof txError === "string") {
          errorMsg = txError;
        } else if (
          txError &&
          typeof txError === "object" &&
          "message" in txError &&
          typeof (txError as { message?: unknown }).message === "string"
        ) {
          errorMsg = (txError as { message: string }).message;
        } else {
          errorMsg = JSON.stringify(txError) || "Donation failed";
        }
        console.error("Donation RPC error:", txError);
        return NextResponse.json({ error: errorMsg }, { status: 500 });
      }
    } catch (rpcErr: unknown) {
      let errorMsg = "Donation failed (timeout)";
      if (
        rpcErr &&
        typeof rpcErr === "object" &&
        "message" in rpcErr &&
        typeof (rpcErr as { message?: unknown }).message === "string"
      ) {
        errorMsg = (rpcErr as { message: string }).message;
      }
      console.error("Donation RPC timeout or error:", rpcErr);
      return NextResponse.json({ error: errorMsg }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    let errorMsg = "Server error";
    if (
      err &&
      typeof err === "object" &&
      "message" in err &&
      typeof (err as { message?: unknown }).message === "string"
    ) {
      errorMsg = (err as { message: string }).message;
    }
    console.error("Donation API error:", err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
