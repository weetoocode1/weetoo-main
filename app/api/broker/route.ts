import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";

// Input validation schema
const brokerApiSchema = z.object({
  broker: z.enum(["deepcoin", "orangex", "lbank", "bingx"]),
  action: z.string().min(1).max(50),
  uid: z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,64}$/)
    .optional(),
  sourceType: z.string().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Add authentication check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // SECURITY: Validate input parameters
    const validationResult = brokerApiSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid input parameters",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { broker, action, uid, sourceType, date } = validationResult.data;

    // SECURITY: Validate UID ownership for actions that require it
    if (
      uid &&
      (action === "getDailyRebates" ||
        action === "getCommissionData" ||
        action === "spot-commission")
    ) {
      const { data: uidData, error: uidError } = await supabase
        .from("user_broker_uids")
        .select("id, user_id")
        .eq("uid", uid)
        .eq("user_id", user.id)
        .single();

      if (uidError || !uidData) {
        return NextResponse.json(
          { error: "UID not found or does not belong to user" },
          { status: 403 }
        );
      }
    }

    try {
      // Dynamic import - loads only the broker we need
      const { default: BrokerAPI } = await import(`@/lib/broker/${broker}-api`);
      const brokerInstance = new BrokerAPI();

      // Check if the method exists
      if (typeof brokerInstance[action] !== "function") {
        return NextResponse.json(
          { error: `Action '${action}' not supported for broker '${broker}'` },
          { status: 400 }
        );
      }

      // Dynamic method call - completely clean and optimized
      let result;
      try {
        const method = brokerInstance[action];

        if (action === "isAPIActive") {
          // isAPIActive is synchronous
          result = method.call(brokerInstance);
        } else {
          // All other methods are async
          let params: unknown[] = [];

          if (action === "getReferrals") {
            params = [];
          } else if (action === "getDailyRebates") {
            params = [uid, date];
          } else if (
            action === "getCommissionData" ||
            action === "spot-commission"
          ) {
            params = [uid];
            if (sourceType) {
              params.push(sourceType);
            }
          } else if (action === "isReferral") {
            params = [uid];
          } else {
            params = [uid];
          }

          result = await method.call(brokerInstance, ...params);
        }
      } catch (methodError) {
        console.error(`Method ${action} execution failed:`, methodError);

        // Add debug headers for DeepCoin errors
        if (broker === "deepcoin") {
          const errorResponse = NextResponse.json(
            { error: `Failed to execute ${action}` },
            { status: 500 }
          );

          return errorResponse;
        }

        return NextResponse.json(
          { error: `Failed to execute ${action}` },
          { status: 500 }
        );
      }

      return NextResponse.json(result);
    } catch (importError) {
      console.error(`Failed to load broker ${broker}:`, importError);
      return NextResponse.json(
        { error: `Broker '${broker}' not found or not implemented` },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Broker API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
