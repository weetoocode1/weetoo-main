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

export async function GET(req: NextRequest) {
  try {
    // DEBUG: Log environment variables
    // console.log("=== ENVIRONMENT VARIABLES DEBUG ===");
    // console.log("DEEPCOIN_API_KEY:", process.env.DEEPCOIN_API_KEY);
    // console.log("DEEPCOIN_API_SECRET:", process.env.DEEPCOIN_API_SECRET);
    // console.log(
    //   "DEEPCOIN_API_PASSPHRASE:",
    //   process.env.DEEPCOIN_API_PASSPHRASE
    // );
    // console.log("==================================");

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

    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");
    const startTime = searchParams.get("startTime");
    const endTime = searchParams.get("endTime");

    const timestamp = getTimestamp();
    const method = "GET";

    // Build request path with query parameters
    let requestPath = `/deepcoin/agents/users/rebates`;
    const queryParams = new URLSearchParams();
    if (uid) queryParams.append("uid", uid);
    if (startTime) queryParams.append("startTime", startTime);
    if (endTime) queryParams.append("endTime", endTime);

    if (queryParams.toString()) {
      requestPath += `?${queryParams.toString()}`;
    }

    const url = `${API_URL}${requestPath}`;
    const body = "";
    const signature = getSignature(timestamp, method, requestPath, body);

    // DEBUG: Log all request details
    console.log("=== DeepCoin Rebates API Request Debug ===");
    console.log("URL:", url);
    console.log("Method:", method);
    console.log("Request Path:", requestPath);
    console.log("Timestamp:", timestamp);
    console.log("Body:", body);
    console.log("API Key:", API_KEY.substring(0, 8) + "...");
    console.log("API Secret:", API_SECRET.substring(0, 8) + "...");
    console.log("Passphrase:", API_PASSPHRASE);
    console.log("Generated Signature:", signature);
    console.log("Query Params:", { uid, startTime, endTime });
    console.log("==================================");

    const headers = {
      "DC-ACCESS-KEY": API_KEY,
      "DC-ACCESS-SIGN": signature,
      "DC-ACCESS-TIMESTAMP": timestamp,
      "DC-ACCESS-PASSPHRASE": API_PASSPHRASE,
      "Content-Type": "application/json",
    };

    const res = await fetch(url, { method, headers });

    // DEBUG: Log response details
    console.log("=== DeepCoin Rebates API Response Debug ===");
    console.log("Status:", res.status);
    console.log("Status Text:", res.statusText);
    console.log("Response Headers:", Object.fromEntries(res.headers.entries()));

    if (!res.ok) {
      const errorText = await res.text();
      console.log("Error Response Body:", errorText);
      console.log("==================================");
      throw new Error(
        `DeepCoin API error: ${res.status} ${res.statusText} - ${errorText}`
      );
    }

    const data = await res.json();
    console.log("Success Response:", JSON.stringify(data, null, 2));
    console.log("==================================");

    return NextResponse.json({ rebates: data });
  } catch (error) {
    console.error("DeepCoin rebates fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch rebates" },
      { status: 500 }
    );
  }
}
