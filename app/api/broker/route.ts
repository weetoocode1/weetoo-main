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

          // Add debug headers to help troubleshoot signature issues
          errorResponse.headers.set("X-DeepCoin-Debug-Broker", "deepcoin");
          errorResponse.headers.set("X-DeepCoin-Debug-Action", action);
          errorResponse.headers.set(
            "X-DeepCoin-Debug-Timestamp",
            new Date().toISOString()
          );

          // Add debug info from the error if available
          if (
            methodError &&
            typeof methodError === "object" &&
            "debugInfo" in methodError
          ) {
            const debugInfo = methodError.debugInfo as {
              signatureLength?: number;
              serverTime?: string;
            };
            errorResponse.headers.set(
              "X-DeepCoin-Debug-Signature-Length",
              debugInfo.signatureLength?.toString() || "0"
            );
            errorResponse.headers.set(
              "X-DeepCoin-Debug-Server-Time",
              debugInfo.serverTime || ""
            );
          }

          return errorResponse;
        }

        return NextResponse.json(
          { error: `Failed to execute ${action}` },
          { status: 500 }
        );
      }

      // Add debug headers for DeepCoin requests
      if (broker === "deepcoin") {
        const response = NextResponse.json(result);

        // Add debug headers to help troubleshoot signature issues
        response.headers.set("X-DeepCoin-Debug-Broker", "deepcoin");
        response.headers.set("X-DeepCoin-Debug-Action", action);
        response.headers.set(
          "X-DeepCoin-Debug-Timestamp",
          new Date().toISOString()
        );

        // Add signature debug info from the DeepCoin API call
        if (
          brokerInstance &&
          (brokerInstance as { lastSignatureDebug?: unknown })
            .lastSignatureDebug
        ) {
          const debugInfo = (brokerInstance as { lastSignatureDebug?: unknown })
            .lastSignatureDebug as {
            signatureLength?: number;
            signaturePreview?: string;
            signature?: string;
            hmacInput?: string;
          };
          response.headers.set(
            "X-DeepCoin-Debug-Signature-Length",
            debugInfo.signatureLength?.toString() || "0"
          );
          response.headers.set(
            "X-DeepCoin-Debug-Signature-Preview",
            debugInfo.signaturePreview || ""
          );
          response.headers.set(
            "X-DeepCoin-Debug-Signature-Full",
            debugInfo.signature || ""
          );
          response.headers.set(
            "X-DeepCoin-Debug-HMAC-Input",
            debugInfo.hmacInput || ""
          );
        }

        return response;
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
