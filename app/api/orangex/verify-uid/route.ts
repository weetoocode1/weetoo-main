import { NextRequest, NextResponse } from "next/server";
import { createOrangeXAPI } from "@/lib/broker/orangex-api";

export async function POST(request: NextRequest) {
  try {
    const { uid } = await request.json();

    if (!uid || typeof uid !== "string") {
      return NextResponse.json(
        { error: "UID is required and must be a string" },
        { status: 400 }
      );
    }

    // Basic UID validation
    if (uid.length < 3 || uid.length > 20) {
      return NextResponse.json(
        { error: "UID must be between 3 and 20 characters" },
        { status: 400 }
      );
    }

    // Check for suspicious patterns
    if (/^\d+$/.test(uid) && uid.length > 10) {
      return NextResponse.json(
        { error: "UID appears to be a random number" },
        { status: 400 }
      );
    }

    const api = createOrangeXAPI();
    const result = await api.verifyUID(uid);

    return NextResponse.json({
      verified: result.verified,
      isReferral: result.isReferral,
      broker: "OrangeX",
    });
  } catch (error) {
    console.error("OrangeX UID verification error:", error);

    if (error instanceof Error) {
      if (error.message.includes("credentials not configured")) {
        return NextResponse.json(
          { error: "OrangeX API not configured" },
          { status: 500 }
        );
      }
      if (error.message.includes("Authentication failed")) {
        return NextResponse.json(
          { error: "OrangeX authentication failed" },
          { status: 401 }
        );
      }
      if (error.message.includes("Invalid IP")) {
        return NextResponse.json(
          { error: "OrangeX IP not whitelisted" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to verify OrangeX UID" },
      { status: 500 }
    );
  }
}
