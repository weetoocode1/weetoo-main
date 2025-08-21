import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Debug: Check all admin bank accounts first
    const { data: allBanks, error: allBanksError } = await supabase
      .from("admin_bank_accounts")
      .select("*");

    if (allBanksError) {
      console.error("Error fetching all admin bank accounts:", allBanksError);
    } else {
      console.log("All admin bank accounts:", allBanks);
    }

    // Get the primary admin bank account - use maybeSingle to avoid errors
    const { data: primaryBank, error: bankError } = await supabase
      .from("admin_bank_accounts")
      .select("*")
      .eq("is_primary", true)
      .eq("is_active", true)
      .maybeSingle();

    if (bankError) {
      console.error("Error fetching primary admin bank account:", bankError);
      return NextResponse.json(
        { error: "Failed to fetch payment instructions" },
        { status: 500 }
      );
    }

    if (!primaryBank) {
      console.error("No primary bank account found in admin_bank_accounts");
      console.log("Query conditions: is_primary=true, is_active=true");
      return NextResponse.json(
        {
          error:
            "No primary bank account configured. Please contact an administrator.",
        },
        { status: 500 }
      );
    }

    console.log("Found primary bank account:", primaryBank);

    return NextResponse.json({
      bank_name: primaryBank.bank_name,
      account_number: primaryBank.account_number,
      account_holder: primaryBank.account_holder,
    });
  } catch (error) {
    console.error("Error in admin bank account API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
