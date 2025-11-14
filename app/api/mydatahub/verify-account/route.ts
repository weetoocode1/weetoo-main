import { NextRequest, NextResponse } from "next/server";
import {
  MyDataHubAPI,
  generateMyDataHubAuthText,
} from "@/lib/mydatahub/mydatahub-api";

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      return NextResponse.json(
        {
          error:
            "Invalid request body. Please ensure the request contains valid JSON.",
        },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          error: "Request body is required and must be a valid JSON object.",
        },
        { status: 400 }
      );
    }

    const {
      bankCode,
      accountNo,
      birthdateOrSSN,
      authText,
      callbackId,
      callbackResponse,
    } = body;

    if (!callbackId && (!bankCode || !accountNo || !birthdateOrSSN)) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: bankCode, accountNo, and birthdateOrSSN",
        },
        { status: 400 }
      );
    }

    if (!process.env.MYDATAHUB_ACCESS_TOKEN) {
      return NextResponse.json(
        {
          error:
            "MyDataHub API is not configured. Please set MYDATAHUB_ACCESS_TOKEN in your environment variables.",
          details:
            "Contact MyData Hub to get your access token: mydatahub@kwic.co.kr or call 02-6281-7708",
        },
        { status: 500 }
      );
    }

    const myDataHubAPI = new MyDataHubAPI();

    if (callbackId) {
      if (!callbackResponse) {
        return NextResponse.json(
          {
            error: "Missing callbackResponse for step 2 verification",
          },
          { status: 400 }
        );
      }

      const step2Result = await myDataHubAPI.completeAccountVerification({
        callbackId,
        callbackType: "SIMPLE",
        callbackResponse: callbackResponse || "",
        callbackResponse1: "",
        callbackResponse2: "",
        retry: "",
      });

      return NextResponse.json({
        success: true,
        verified: step2Result.verified,
        message: "Account verification completed successfully",
      });
    }

    // Generate authText in format: "위투" + 6-digit number (e.g., "위투123456")
    // MyData Hub will validate the bank account first, then process the request
    // If bank account is invalid, MyData Hub will return an error (like ST09) BEFORE processing
    // If valid, MyData Hub will process and use the authText for the 1-won transaction
    const minimalAuthText = authText || generateMyDataHubAuthText();

    const step1Result = await myDataHubAPI.initiateAccountVerification({
      bankCode,
      accountNo,
      UMINNUM: birthdateOrSSN,
      authText: minimalAuthText,
    });

    // If we reach here, bank account validation passed and MyData Hub processed the request
    // The authText that was sent is what MyData Hub used for the 1-won transaction
    // Extract only the 6 digits from authText for frontend (e.g., "위투068072" -> "068072")
    const fullAuthText = step1Result.authText || minimalAuthText;
    const digitsOnly = fullAuthText.replace(/\D/g, "").slice(-6);

    return NextResponse.json({
      success: true,
      callbackId: step1Result.callbackId,
      callbackType: step1Result.callbackType,
      timeout: step1Result.timeout,
      authText: digitsOnly.length === 6 ? digitsOnly : fullAuthText, // Return only 6 digits to frontend
      message:
        "Verification initiated. Please complete authentication and submit callbackResponse.",
    });
  } catch (error) {
    console.error("MyDataHub verification error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    const statusCode =
      errorMessage.includes("authentication") ||
      errorMessage.includes("token") ||
      errorMessage.includes("2010")
        ? 401
        : errorMessage.includes("Missing required") ||
          errorMessage.includes("Invalid")
        ? 400
        : 500;

    return NextResponse.json(
      {
        error: errorMessage,
        ...(errorMessage.includes("token") && {
          help: "Please configure MYDATAHUB_ACCESS_TOKEN in your .env.local file",
        }),
      },
      { status: statusCode }
    );
  }
}
