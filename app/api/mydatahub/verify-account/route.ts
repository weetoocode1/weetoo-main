import { NextRequest, NextResponse } from "next/server";
import { MyDataHubAPI } from "@/lib/mydatahub/mydatahub-api";

function generateAuthText(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${timestamp}${random}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bankCode, accountNo, birthdateOrSSN, authText, callbackId, callbackResponse } =
      body;

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

    const step1Result = await myDataHubAPI.initiateAccountVerification({
      bankCode,
      accountNo,
      UMINNUM: birthdateOrSSN,
      authText: authText || generateAuthText(),
    });

    return NextResponse.json({
      success: true,
      callbackId: step1Result.callbackId,
      callbackType: step1Result.callbackType,
      timeout: step1Result.timeout,
      authText: authText || "", // echo back if client sent it
      message:
        "Verification initiated. Please complete authentication and submit callbackResponse.",
    });
  } catch (error) {
    console.error("MyDataHub verification error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    const statusCode = errorMessage.includes("authentication") ||
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

