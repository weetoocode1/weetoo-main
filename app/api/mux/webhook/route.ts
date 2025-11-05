import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createServiceClient } from "@/lib/supabase/server";

const MUX_WEBHOOK_SECRET = process.env.MUX_WEBHOOK_SECRET;

if (!MUX_WEBHOOK_SECRET) {
  console.error(
    "⚠️ MUX_WEBHOOK_SECRET is not set. Webhook verification will fail."
  );
}

function verifyMuxSignature(payload: string, signatureHeader: string): boolean {
  if (!MUX_WEBHOOK_SECRET) {
    console.error("MUX_WEBHOOK_SECRET not configured");
    return false;
  }

  // Mux webhook signature format: t=<timestamp>,v1=<signature> or sha256=<signature>
  // Parse the signature header
  const parts: Record<string, string> = {};
  signatureHeader.split(",").forEach((part) => {
    const [key, value] = part.split("=");
    if (key && value) {
      parts[key.trim()] = value.trim();
    }
  });

  const timestamp = parts.t;
  const signature = parts.v1 || parts.sha256;

  if (!timestamp || !signature) {
    console.error("Invalid signature format:", signatureHeader);
    return false;
  }

  // Mux uses: HMAC-SHA256(timestamp + "." + payload)
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac("sha256", MUX_WEBHOOK_SECRET)
    .update(signedPayload, "utf8")
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signatureHeader = request.headers.get("mux-signature");

    if (!signatureHeader) {
      console.error("❌ Missing Mux signature header");
      return NextResponse.json(
        { error: "Missing signature header" },
        { status: 401 }
      );
    }

    if (!MUX_WEBHOOK_SECRET) {
      console.error("❌ MUX_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    const isValid = verifyMuxSignature(body, signatureHeader);

    if (!isValid) {
      console.error("❌ Invalid Mux webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(body);
    const eventType = payload.type;
    const data = payload.data;

    console.log(
      `📨 Mux webhook received: ${eventType} for stream ${
        data?.id?.substring(0, 8) || "unknown"
      }...`
    );

    if (!data || !data.id) {
      console.warn("⚠️ Webhook payload missing required data");
      return NextResponse.json({ received: true });
    }

    const supabase = await createServiceClient();

    if (
      eventType === "video.live_stream.active" ||
      eventType === "video.live_stream.connected"
    ) {
      // Check current status to avoid unnecessary updates
      const { data: currentStream } = await supabase
        .from("user_streams")
        .select("status")
        .eq("stream_id", data.id)
        .single();

      // Only update if not already active (prevents duplicate updates)
      if (currentStream?.status === "active") {
        console.log(
          `ℹ️ Stream ${data.id.substring(
            0,
            8
          )}... already active, skipping ${eventType} update`
        );
        return NextResponse.json({ received: true });
      }

      const { error: updateError } = await supabase
        .from("user_streams")
        .update({
          status: "active",
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("stream_id", data.id);

      if (updateError) {
        console.error(
          `❌ Error updating stream ${data.id.substring(0, 8)}... to active:`,
          updateError
        );
      } else {
        if (eventType === "video.live_stream.connected") {
          console.log(
            `✅ Stream ${data.id.substring(
              0,
              8
            )}... CONNECTED → updating to ACTIVE (Mux will send 'active' event in ~1-3s for validation)`
          );
        } else {
          console.log(
            `✅ Stream ${data.id.substring(
              0,
              8
            )}... confirmed ACTIVE by Mux (stream validated and ready)`
          );
        }
      }
    } else if (
      eventType === "video.live_stream.idle" ||
      eventType === "video.live_stream.disconnected"
    ) {
      const { error: updateError } = await supabase
        .from("user_streams")
        .update({
          status: "idle",
          started_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("stream_id", data.id);

      if (updateError) {
        console.error(
          `❌ Error updating stream ${data.id.substring(0, 8)}... to idle:`,
          updateError
        );
      } else {
        console.log(
          `✅ Stream ${data.id.substring(
            0,
            8
          )}... updated to IDLE instantly via webhook`
        );
      }
    } else {
      console.log(`ℹ️ Unhandled webhook event type: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("❌ Error processing Mux webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Mux webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
