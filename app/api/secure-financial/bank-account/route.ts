import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Secure Bank Account Creation API
 *
 * This endpoint handles bank account creation with server-side verification amount generation
 * to prevent client-side manipulation and ensure security.
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
    const { account_holder_name, account_number, bank_name } = body;

    if (!account_holder_name || !account_number || !bank_name) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: account_holder_name, account_number, bank_name",
        },
        { status: 400 }
      );
    }

    // 3. Server-side verification amount generation (secure)
    const generateVerificationAmount = () => {
      const min = 10; // 0.0010
      const max = 99; // 0.0099
      const range = max - min + 1;
      const u32 = new Uint32Array(1);
      const maxAcceptable = Math.floor(0xffffffff / range) * range;
      let r: number;
      do {
        crypto.getRandomValues(u32);
        r = u32[0];
      } while (r >= maxAcceptable);
      const n = min + (r % range);
      return Number((n / 10000).toFixed(4));
    };

    // 4. Create bank account with server-generated verification amount
    const { data: bankAccount, error: createError } = await supabase
      .from("bank_accounts")
      .insert({
        user_id: user.id,
        account_holder_name: account_holder_name.trim(),
        account_number: account_number.trim(),
        bank_name: bank_name.trim(),
        is_verified: false,
        verification_amount: generateVerificationAmount(), // Server-side generation
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

    // 5. Return success (DO NOT return verification amount for security)
    return NextResponse.json({
      success: true,
      bankAccount: {
        id: bankAccount.id,
        account_holder_name: bankAccount.account_holder_name,
        account_number: bankAccount.account_number,
        bank_name: bankAccount.bank_name,
        is_verified: bankAccount.is_verified,
        // ❌ verification_amount is NOT returned for security
      },
      message:
        "Bank account created successfully. Verification amount will be sent to your account.",
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

    // Get user's bank accounts (without verification amounts for security)
    const { data: bankAccounts, error } = await supabase
      .from("bank_accounts")
      .select(
        "id, account_holder_name, account_number, bank_name, is_verified, created_at, updated_at"
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
