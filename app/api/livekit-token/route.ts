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

    // Create unique identity to prevent conflicts
    const uniqueIdentity = `${role}-${userId}-${Date.now()}`;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: uniqueIdentity,
      // Set token expiration to 24 hours for long sessions
      ttl: 24 * 60 * 60, // 24 hours in seconds
    });

    // Add comprehensive grants for both host and participants
    at.addGrant({
      room: roomId,
      roomJoin: true,
      canPublish: role === "host",
      canPublishData: role === "host",
      canSubscribe: true,
      // Additional permissions for better stability
      canUpdateOwnMetadata: true,
      hidden: false,
      recorder: false,
    });

    // Add metadata to help with debugging
    at.metadata = JSON.stringify({
      userId,
      role,
      roomId,
      timestamp: Date.now(),
    });

    const token = await at.toJwt();

    console.log(
      `🔑 Generated LiveKit token for ${role} ${userId} in room ${roomId}`
    );

    return NextResponse.json({
      token,
      identity: uniqueIdentity,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
    });
  } catch (error) {
    console.error("Failed to generate LiveKit token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
