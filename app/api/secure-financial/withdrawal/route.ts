import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  validateWithdrawalRequest,
  checkRateLimit,
  validateUserBalance,
} from "@/lib/secure-financial-operations";

/**
 * Secure Withdrawal API Endpoint
 *
 * This endpoint handles withdrawal requests with server-side validation
 * to prevent client-side bypass attacks and ensure security.
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
    const { amount, bankAccountId } = body;

    if (!amount || !bankAccountId) {
      return NextResponse.json(
        { error: "Missing required fields: amount and bankAccountId" },
        { status: 400 }
      );
    }

    // 3. Check rate limiting
    const DAILY_LIMIT = Number(process.env.WITHDRAWAL_DAILY_LIMIT ?? "20");
    const rateLimitCheck = await checkRateLimit(
      user.id,
      "withdrawal",
      DAILY_LIMIT
    );
    if (!rateLimitCheck.isAllowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          remainingRequests: rateLimitCheck.remainingRequests,
          resetTime: rateLimitCheck.resetTime,
          dailyLimit: DAILY_LIMIT,
        },
        { status: 429 }
      );
    }

    // 4. Server-side validation (this prevents client-side bypass)
    const validation = await validateWithdrawalRequest(
      user.id,
      amount,
      bankAccountId
    );

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.errorMessage },
        { status: 400 }
      );
    }

    // 5. Double-check balance (defense in depth)
    const balanceCheck = await validateUserBalance(user.id, amount);
    if (!balanceCheck.hasSufficientBalance) {
      return NextResponse.json(
        { error: balanceCheck.errorMessage || "Insufficient balance" },
        { status: 400 }
      );
    }

    // 6. Create withdrawal request with validated data
    const { data: withdrawalRequest, error: createError } = await supabase
      .from("withdrawal_requests")
      .insert({
        user_id: user.id,
        bank_account_id: bankAccountId,
        kor_coins_amount: amount,
        fee_percentage: validation.feePercentage,
        fee_amount: validation.feeAmount,
        final_amount: validation.finalAmount,
        status: "pending", // Always start as pending for security
      })
      .select()
      .single();

    if (createError) {
      console.error("Withdrawal creation error:", createError);
      return NextResponse.json(
        { error: "Failed to create withdrawal request" },
        { status: 500 }
      );
    }

    // 7. Deduct KOR coins from user balance (atomic operation)
    const { error: balanceUpdateError } = await supabase
      .from("users")
      .update({
        kor_coins: balanceCheck.currentBalance - amount,
      })
      .eq("id", user.id);

    if (balanceUpdateError) {
      // Rollback withdrawal request if balance update fails
      await supabase
        .from("withdrawal_requests")
        .delete()
        .eq("id", withdrawalRequest.id);

      console.error("Balance update error:", balanceUpdateError);
      return NextResponse.json(
        { error: "Failed to update balance" },
        { status: 500 }
      );
    }

    // 8. Create admin notification
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("first_name, last_name, nickname, email")
        .eq("id", user.id)
        .single();

      const displayName =
        userData?.first_name || userData?.last_name
          ? `${userData?.first_name || ""} ${userData?.last_name || ""}`.trim()
          : userData?.nickname || userData?.email || "User";

      await supabase.from("notifications").insert({
        user_id: user.id,
        audience: "admin",
        type: "withdrawal_request_created",
        title: "New withdrawal request",
        body: `${displayName} requested ${amount.toLocaleString()} KOR`,
        metadata: {
          user_id: user.id,
          user_name: displayName,
          kor_coins_amount: amount,
          withdrawal_request_id: withdrawalRequest.id,
          fee_amount: validation.feeAmount,
          final_amount: validation.finalAmount,
        },
        read: false,
      });
    } catch (notificationError) {
      // Log but don't fail the request for notification errors
      console.error("Notification creation error:", notificationError);
    }

    // 9. Return success response
    return NextResponse.json({
      success: true,
      withdrawalRequest: {
        id: withdrawalRequest.id,
        amount: amount,
        feeAmount: validation.feeAmount,
        finalAmount: validation.finalAmount,
        feePercentage: validation.feePercentage,
        status: "pending",
      },
      message: "Withdrawal request created successfully",
    });
  } catch (error) {
    console.error("Withdrawal API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve user's withdrawal requests
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

    // Get user's withdrawal requests
    const { data: withdrawalRequests, error } = await supabase
      .from("withdrawal_requests")
      .select(
        `
        *,
        bank_account:bank_accounts(*)
      `
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch withdrawal requests" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      withdrawalRequests: withdrawalRequests || [],
    });
  } catch (error) {
    console.error("Withdrawal GET API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
