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

    const {
      identityVerificationId,
      // identityVerificationTxId,
      verificationData,
    } = await request.json();

    // Extract user data from verification response
    let extractedUserData = {
      name: null,
      birthDate: null,
      gender: null,
      mobileNumber: null,
    };

    if (verificationData?.data?.verifiedCustomer) {
      const verifiedCustomer = verificationData.data.verifiedCustomer;
      extractedUserData = {
        name: verifiedCustomer.name || null,
        birthDate: verifiedCustomer.birthDate || null,
        gender: verifiedCustomer.gender || null,
        mobileNumber:
          verifiedCustomer.phoneNumber ||
          verifiedCustomer.mobile ||
          verifiedCustomer.phone ||
          verifiedCustomer.tel ||
          verifiedCustomer.hp ||
          null,
      };
    }

    // Normalize gender to match database schema
    const normalizeGender = (
      input: string | null | undefined
    ): "male" | "female" | "other" | null => {
      if (!input) return null;
      const v = String(input).trim().toLowerCase();
      if (v === "m" || v === "male" || v === "1") return "male";
      if (v === "f" || v === "female" || v === "2") return "female";
      if (v === "other") return "other";
      return null;
    };

    // Prepare update data
    const updateData: {
      identity_verified: boolean;
      identity_verified_at: string;
      identity_verification_id: string;
      mobile_number?: string;
      birth_date?: string | null;
      gender?: string | null;
      identity_verification_name?: string | null;
    } = {
      identity_verified: true,
      identity_verified_at: new Date().toISOString(),
      identity_verification_id: identityVerificationId,
    };

    // Add extracted user data if available
    if (extractedUserData.name) {
      updateData.identity_verification_name = extractedUserData.name;
    }
    if (extractedUserData.mobileNumber) {
      updateData.mobile_number = extractedUserData.mobileNumber;
    }
    if (extractedUserData.birthDate) {
      updateData.birth_date = extractedUserData.birthDate;
    }
    if (extractedUserData.gender) {
      updateData.gender = normalizeGender(extractedUserData.gender);
    }

    // Update the user's identity verification status with detailed data
    const { error: updateError } = await supabase
      .from("users")
      .update(updateData)
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
      data: updateData,
    });
  } catch (error) {
    console.error("Error in store-identity-verification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
