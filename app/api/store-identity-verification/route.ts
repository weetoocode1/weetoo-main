import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { identityVerificationId } = await request.json();

    // Update the user's identity verification status
    const { error: updateError } = await supabase
      .from("users")
      .update({
        identity_verified: true,
        identity_verified_at: new Date().toISOString(),
        identity_verification_id: identityVerificationId,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error updating user verification status:", updateError);
      return NextResponse.json(
        { error: "Failed to update verification status" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Identity verification status stored successfully",
      data: {
        identity_verified: true,
        identity_verified_at: new Date().toISOString(),
        identity_verification_id: identityVerificationId,
      },
    });
  } catch (error) {
    console.error("Error in store-identity-verification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
