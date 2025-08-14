import { NextRequest, NextResponse } from "next/server";

const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET;

export async function POST(request: NextRequest) {
  try {
    // When API Secret is not configured
    if (!PORTONE_API_SECRET) {
      return NextResponse.json(
        { error: "PORTONE_API_SECRET is not configured." },
        { status: 500 }
      );
    }

    // Extract identityVerificationId from request body
    const { identityVerificationId } = await request.json();

    if (!identityVerificationId) {
      return NextResponse.json(
        { error: "identityVerificationId is required." },
        { status: 400 }
      );
    }

    // Call PortOne identity verification inquiry API
    const verificationResponse = await fetch(
      `https://api.portone.io/identity-verifications/${encodeURIComponent(
        identityVerificationId
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `PortOne ${PORTONE_API_SECRET}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!verificationResponse.ok) {
      const errorData = await verificationResponse.json();
      console.error("PortOne API Error:", errorData);
      return NextResponse.json(
        { error: `PortOne API Error: ${JSON.stringify(errorData)}` },
        { status: verificationResponse.status }
      );
    }

    const identityVerification = await verificationResponse.json();

    if (identityVerification.status !== "VERIFIED") {
      // Verification failed
      return NextResponse.json(
        {
          error: "Identity verification is not completed.",
          status: identityVerification.status,
          data: identityVerification,
        },
        { status: 400 }
      );
    }

    // Verification successful
    return NextResponse.json({
      success: true,
      message: "Identity verification completed successfully.",
      data: identityVerification,
    });
  } catch (error) {
    console.error("Error during identity verification:", error);
    return NextResponse.json(
      { error: "Internal server error occurred." },
      { status: 500 }
    );
  }
}
