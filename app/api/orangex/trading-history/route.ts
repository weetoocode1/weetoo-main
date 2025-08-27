import { NextRequest, NextResponse } from "next/server";
import { createOrangeXAPI } from "@/lib/broker/orangex-api";

export async function POST(request: NextRequest) {
  try {
    const { uid, startTime, endTime } = await request.json();

    if (!uid || typeof uid !== "string") {
      return NextResponse.json(
        { error: "UID is required and must be a string" },
        { status: 400 }
      );
    }

    const api = createOrangeXAPI();
    const result = await api.getTradingHistory(uid, startTime, endTime);

    return NextResponse.json(result);
  } catch (error) {
    console.error("OrangeX trading history error:", error);

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
    }

    return NextResponse.json(
      { error: "Failed to fetch OrangeX trading history" },
      { status: 500 }
    );
  }
}
