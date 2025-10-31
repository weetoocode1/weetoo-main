import { NextResponse } from "next/server";
import { SignJWT, importPKCS8 } from "jose";
import { createPrivateKey } from "crypto";
import { createClient } from "@/lib/supabase/server";
import Mux from "@mux/mux-node";

const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

async function signCountsJWT(): Promise<string | null> {
  const keyId = process.env.MUX_SIGNING_KEY;
  const privateKey = process.env.MUX_DATA_PRIVATE_KEY;
  if (!keyId || !privateKey) {
    console.error(
      "Missing MUX_SIGNING_KEY or MUX_DATA_PRIVATE_KEY environment variables."
    );
    return null;
  }

  let pem = privateKey
    .trim()
    .replace(/^"|"$/g, "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n");

  // Log the processed PEM string before further checks
  // console.log("----- Processed PEM String for Analysis -----");
  // console.log(pem);
  // console.log("--------------------------------------------");

  if (!pem.includes("BEGIN") && /^[A-Za-z0-9+/=\s]+$/.test(pem)) {
    try {
      const decoded = Buffer.from(pem.replace(/\s+/g, ""), "base64").toString(
        "utf8"
      );
      pem = decoded;
      // console.log("----- Base64 Decoded PEM String -----");
      // console.log(pem);
      // console.log("-------------------------------------");
    } catch (e) {
      console.error("Error decoding base64 PEM:", e);
    }
  }

  // Crucial check: Does it start with PKCS#8 header?
  if (!pem.includes("BEGIN PRIVATE KEY")) {
    console.error(
      "PEM string does NOT contain '-----BEGIN PRIVATE KEY-----'. It might be an RSA key or malformed."
    );
    throw new Error(
      'MUX_DATA_PRIVATE_KEY must be PKCS#8 PEM (-----BEGIN PRIVATE KEY-----). If your key says "BEGIN RSA PRIVATE KEY", ensure you convert it using OpenSSL.'
    );
  } else {
    // console.log(
    //   "PEM string contains '-----BEGIN PRIVATE KEY-----'. Proceeding with parsing."
    // );
  }

  let signingKey: unknown;
  try {
    // console.log("Attempting to parse with jose.importPKCS8...");
    signingKey = await importPKCS8(pem, "RS256");
    // console.log("Successfully parsed with jose.importPKCS8.");
  } catch (e) {
    console.error("jose.importPKCS8 failed:", e);
    // console.log(
    //   "Falling back to createPrivateKey. PEM content passed to createPrivateKey (should be the same as logged above):"
    // );
    // Log PEM again just before createPrivateKey to be absolutely sure
    // console.log(pem);
    try {
      signingKey = createPrivateKey(pem); // THIS IS THE LINE THAT FAILS
      // console.log("Successfully parsed with createPrivateKey (fallback).");
    } catch (innerError) {
      console.error("createPrivateKey (fallback) also failed:", innerError);
      throw innerError; // Re-throw the inner error for better stack trace
    }
  }

  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "RS256", kid: keyId })
    .setIssuedAt()
    .setExpirationTime("60s")
    .sign(signingKey as import("crypto").KeyObject | Uint8Array | CryptoKey);
  return token;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const { streamId } = await params;
    if (!streamId) {
      return NextResponse.json(
        { error: "Stream ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: row } = await supabase
      .from("user_streams")
      .select("playback_id, status")
      .eq("stream_id", streamId)
      .single();
    // Do not hard fail if DB row missing; we'll try Mux directly

    const token = await signCountsJWT();
    if (!token) {
      return NextResponse.json(
        { error: "Missing MUX_SIGNING_KEY or MUX_DATA_PRIVATE_KEY" },
        { status: 500 }
      );
    }

    const ids: { type: "playback_id" | "video_id"; id: string }[] = [];
    if (row?.playback_id) {
      ids.push({ type: "playback_id", id: row.playback_id });
    }
    try {
      const live = await muxClient.video.liveStreams.retrieve(streamId);
      const assetId = (live as { active_asset_id?: string }).active_asset_id;
      const pl = (live as { playback_ids?: Array<{ id?: string }> })
        .playback_ids;
      if (pl && pl[0]?.id) ids.push({ type: "playback_id", id: pl[0].id! });
      if (assetId) ids.push({ type: "video_id", id: assetId });
    } catch (muxError) {
      console.error("Error retrieving Mux live stream data:", muxError);
    }

    // Debug IDs array used for Mux Data queries
    // console.log("Generated IDs array for Mux Data:", ids);

    // De-duplicate ids
    const uniqueIds = Array.from(
      new Map(ids.map((it) => [`${it.type}:${it.id}`, it])).values()
    );

    // Query counts for each id and aggregate
    let concurrent = 0;
    let views = 0;
    for (const item of uniqueIds) {
      // Generate per-ID query token required by stats.mux.com/counts when using dimension/value
      let perIdJwt: string | null = null;
      try {
        const keyId = process.env.MUX_SIGNING_KEY;
        const privateKey = process.env.MUX_DATA_PRIVATE_KEY;
        if (keyId && privateKey) {
          const pem = privateKey
            .trim()
            .replace(/^"|"$/g, "")
            .replace(/\\n/g, "\n")
            .replace(/\r\n/g, "\n");
          if (pem.includes("BEGIN PRIVATE KEY")) {
            const signingKey = await importPKCS8(pem, "RS256");
            perIdJwt = await new SignJWT({})
              .setProtectedHeader({ alg: "RS256", kid: keyId })
              .setSubject(item.id)
              .setAudience(item.type)
              .setIssuedAt()
              .setExpirationTime("60s")
              .sign(
                signingKey as
                  | import("crypto").KeyObject
                  | Uint8Array
                  | CryptoKey
              );
          }
        }
      } catch (jwtError) {
        console.error("Error generating per-ID JWT for item:", item, jwtError);
      }

      if (!perIdJwt) {
        console.warn(
          "Skipping Mux Data fetch for item due to missing per-ID JWT:",
          item
        );
        continue;
      }

      const url = new URL("https://stats.mux.com/counts");
      url.searchParams.set("dimension", item.type);
      url.searchParams.set("value", item.id);
      url.searchParams.set("timeframe", "1m");
      url.searchParams.set("token", perIdJwt);

      // console.log(
      //   `Fetching Mux Data counts for ID: ${item.id} (type: ${
      //     item.type
      //   }) with URL: ${url.toString()}`
      // );

      const res = await fetch(url.toString());
      if (res.ok) {
        const json = (await res.json()) as {
          data?: Array<{
            viewers?: number;
            views?: number;
            updated_at?: string;
          }>;
        };
        // console.log(
        //   `Mux API Data for ID ${item.id}: (Status: ${res.status})`,
        //   json
        // );
        const first = json.data?.[0];
        if (first) {
          concurrent += Number(first.viewers || 0);
          views += Number(first.views || 0);
        }
      } else {
        console.error(
          `Mux API request failed for ID ${item.id}: Status ${
            res.status
          }, Response: ${await res.text()}`
        );
      }
    }

    return NextResponse.json({ concurrent, views });
  } catch (err) {
    console.error("engagement error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
