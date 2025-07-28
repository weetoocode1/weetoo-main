import { AccessToken } from "livekit-server-sdk";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { userId, roomId, role } = await req.json();
    if (!userId || !roomId || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    if (role !== "host" && role !== "participant") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "LiveKit API credentials not set" },
        { status: 500 }
      );
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
    });
    at.addGrant({
      room: roomId,
      roomJoin: true,
      canPublish: role === "host",
      canPublishData: role === "host",
      canSubscribe: true,
      // canPublishSources: ["audio"], // Optionally restrict to audio only
    });

    const token = await at.toJwt();
    return NextResponse.json({ token });
  } catch (_err) {
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
