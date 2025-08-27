import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const API_URL = "https://api.deepcoin.com";
const API_KEY = process.env.DEEPCOIN_API_KEY!;
const API_SECRET = process.env.DEEPCOIN_API_SECRET!;
const API_PASSPHRASE = process.env.DEEPCOIN_API_PASSPHRASE!;

function getTimestamp() {
  return new Date().toISOString();
}

function getSignature(
  timestamp: string,
  method: string,
  requestPath: string,
  body = ""
) {
  const prehash = timestamp + method.toUpperCase() + requestPath + body;
  const hmac = crypto.createHmac("sha256", API_SECRET);
  hmac.update(prehash);
  return hmac.digest("base64");
}

export async function POST(request: NextRequest) {
  try {
    const { uid } = await request.json();

    if (!uid) {
      return NextResponse.json({ error: "UID is required" }, { status: 400 });
    }

    // IMPORTANT: Input validation to prevent security issues
    const uidString = String(uid);

    // Validate UID format and length
    if (uidString.length > 20) {
      return NextResponse.json(
        {
          error: "UID too long",
          verified: false,
          reason: "UID exceeds maximum length of 20 characters",
        },
        { status: 400 }
      );
    }

    // Check if UID contains only digits
    if (!/^\d+$/.test(uidString)) {
      return NextResponse.json(
        {
          error: "Invalid UID format",
          verified: false,
          reason: "UID must contain only digits",
        },
        { status: 400 }
      );
    }

    // Check if UID is reasonable (not all same digits)
    if (/^(\d)\1+$/.test(uidString)) {
      return NextResponse.json(
        {
          error: "Suspicious UID pattern",
          verified: false,
          reason: "UID pattern appears to be invalid",
        },
        { status: 400 }
      );
    }

    // Check if environment variables are set
    if (!API_KEY || !API_SECRET || !API_PASSPHRASE) {
      console.error("Missing DeepCoin environment variables:", {
        API_KEY: !!API_KEY,
        API_SECRET: !!API_SECRET,
        API_PASSPHRASE: !!API_PASSPHRASE,
      });
      return NextResponse.json(
        { error: "DeepCoin API credentials not configured" },
        { status: 500 }
      );
    }

    const timestamp = getTimestamp();
    const method = "GET";

    // Strategy: fetch the agents users list and check for the UID locally
    // This mirrors the referrals call and avoids auth edge-cases on filtered queries
    const requestPath = `/deepcoin/agents/users`;
    const url = `${API_URL}${requestPath}`;
    const body = "";
    const signature = getSignature(timestamp, method, requestPath, body);

    const headers = {
      "DC-ACCESS-KEY": API_KEY,
      "DC-ACCESS-SIGN": signature,
      "DC-ACCESS-TIMESTAMP": timestamp,
      "DC-ACCESS-PASSPHRASE": API_PASSPHRASE,
      "Content-Type": "application/json",
    };

    const res = await fetch(url, { method, headers });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(
        `DeepCoin API error: ${res.status} ${res.statusText} - ${errorText}`
      );
    }

    const data = await res.json();

    // IMPORTANT: Proper UID validation logic
    // Check if the UID actually exists in the response data
    let isVerified = false;
    let uidFound = false;

    if (data && (data.code === "0" || data.code === 0)) {
      // Check if data.list exists and contains the UID
      if (data.data && data.data.list && Array.isArray(data.data.list)) {
        // Look for the specific UID in the list
        uidFound = data.data.list.some((item: { uid: string }) => {
          const itemUid = String(item.uid);
          const requestUid = String(uid);
          return itemUid === requestUid;
        });

        isVerified = uidFound;
      }
    }

    return NextResponse.json({
      verified: isVerified,
      data: data,
      message: isVerified ? "UID verified successfully" : "UID not found",
      uidFound: uidFound,
      debug: {
        requestedUid: uid,
        responseCode: data?.code,
        hasDataList: !!data?.data?.list,
        listLength: data?.data?.list?.length || 0,
        uidFound: uidFound,
      },
    });
  } catch (error) {
    console.error("DeepCoin UID verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify UID" },
      { status: 500 }
    );
  }
}
