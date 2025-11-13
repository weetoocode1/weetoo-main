import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * MyData Hub Bank Account Verification API
 *
 * This endpoint handles bank account verification via MyData Hub 1-won authentication.
 * After successful MyData Hub verification, it updates the bank account's is_verified status.
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { bankAccountId } = body;

    if (!bankAccountId) {
      return NextResponse.json(
        {
          error: "Missing required field: bankAccountId",
        },
        { status: 400 }
      );
    }

    // 3. Get bank account details
    const { data: bankAccount, error: fetchError } = await supabase
      .from("bank_accounts")
      .select("id, user_id, is_verified")
      .eq("id", bankAccountId)
      .single();

    if (fetchError || !bankAccount) {
      return NextResponse.json(
        { error: "Bank account not found" },
        { status: 404 }
      );
    }

    // 4. Verify user owns the bank account
    if (bankAccount.user_id !== user.id) {
      return NextResponse.json(
        { error: "Bank account does not belong to user" },
        { status: 403 }
      );
    }

    // 5. Check if already verified
    if (bankAccount.is_verified) {
      return NextResponse.json(
        { error: "Bank account is already verified" },
        { status: 400 }
      );
    }

    // 6. Update bank account to verified status
    const { data: updatedBankAccount, error: updateError } = await supabase
      .from("bank_accounts")
      .update({
        is_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bankAccountId)
      .select()
      .single();

    if (updateError) {
      console.error("Bank account update error:", updateError);
      return NextResponse.json(
        { error: "Failed to verify bank account" },
        { status: 500 }
      );
    }

    // 7. Return success
    return NextResponse.json({
      success: true,
      message: "Bank account verified successfully via MyData Hub!",
      bankAccount: {
        id: updatedBankAccount.id,
        is_verified: updatedBankAccount.is_verified,
      },
    });
  } catch (error) {
    console.error("MyData Hub bank verification API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

