import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Secure Bank Account Creation API
 *
 * This endpoint handles bank account creation.
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
    const { account_holder_name, account_number, bank_name, bank_code } = body;

    if (!account_holder_name || !account_number || !bank_name) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: account_holder_name, account_number, bank_name",
        },
        { status: 400 }
      );
    }

    // 3. Create bank account
    const { data: bankAccount, error: createError } = await supabase
      .from("bank_accounts")
      .insert({
        user_id: user.id,
        account_holder_name: account_holder_name.trim(),
        account_number: account_number.trim(),
        bank_name: bank_name.trim(),
        bank_code: bank_code?.trim() || null,
        is_verified: false,
      })
      .select()
      .single();

    if (createError) {
      console.error("Bank account creation error:", createError);
      return NextResponse.json(
        { error: "Failed to create bank account" },
        { status: 500 }
      );
    }

    // 4. Return success
    return NextResponse.json({
      success: true,
      bankAccount: {
        id: bankAccount.id,
        account_holder_name: bankAccount.account_holder_name,
        account_number: bankAccount.account_number,
        bank_name: bankAccount.bank_name,
        bank_code: bankAccount.bank_code,
        is_verified: bankAccount.is_verified,
      },
      message: "Bank account created successfully.",
    });
  } catch (error) {
    console.error("Bank account API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve user's bank accounts
 * (Read-only, no security concerns)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's bank accounts
    const { data: bankAccounts, error } = await supabase
      .from("bank_accounts")
      .select(
        "id, account_holder_name, account_number, bank_name, bank_code, is_verified, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch bank accounts" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bankAccounts: bankAccounts || [],
    });
  } catch (error) {
    console.error("Bank account GET API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
