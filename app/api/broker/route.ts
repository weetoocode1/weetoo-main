import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { broker, action, uid, sourceType } = await request.json();

    if (!broker || !action) {
      return NextResponse.json(
        { error: "Broker and action are required" },
        { status: 400 }
      );
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
          const params = action === "getReferrals" ? [] : [uid];
          if (action === "getCommissionData" && sourceType) {
            params.push(sourceType);
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
