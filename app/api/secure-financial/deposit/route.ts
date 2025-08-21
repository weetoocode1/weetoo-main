import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  validateDepositRequest,
  checkRateLimit,
} from "@/lib/secure-financial-operations";

/**
 * Secure Deposit API Endpoint
 *
 * This endpoint handles deposit requests with server-side validation
 * to prevent client-side bypass attacks and ensure security.
 *
 * New Payment Flow:
 * 1. User submits deposit request
 * 2. System generates unique payment reference
 * 3. User receives payment instructions with admin bank account details
 * 4. User transfers money manually
 * 5. Admin confirms payment and credits KOR coins
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
    const { korCoinsAmount, bankAccountId } = body;

    // Basic presence checks
    if (
      korCoinsAmount === undefined ||
      korCoinsAmount === null ||
      !bankAccountId
    ) {
      return NextResponse.json(
        { error: "Missing required fields: korCoinsAmount and bankAccountId" },
        { status: 400 }
      );
    }

    // Sanitize and normalize amount (integer KOR only)
    const normalizedAmount = Number.isFinite(Number(korCoinsAmount))
      ? Math.floor(Number(korCoinsAmount))
      : NaN;
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid korCoinsAmount" },
        { status: 400 }
      );
    }

    // Validate bankAccountId format (UUID)
    const UUID_RE =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(String(bankAccountId))) {
      return NextResponse.json(
        { error: "Invalid bankAccountId" },
        { status: 400 }
      );
    }

    // 3. Check rate limiting (daily, env-configurable)
    const DAILY_LIMIT = Number(process.env.DEPOSIT_DAILY_LIMIT ?? "20");
    const rateLimitCheck = await checkRateLimit(
      user.id,
      "deposit",
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
    const validation = await validateDepositRequest(
      user.id,
      normalizedAmount,
      bankAccountId
    );

    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.errorMessage },
        { status: 400 }
      );
    }

    // 5. Get bank account details
    const { data: bankAccount, error: bankError } = await supabase
      .from("bank_accounts")
      .select("id, bank_name, account_number, account_holder_name")
      .eq("id", bankAccountId)
      .single();

    if (bankError || !bankAccount) {
      return NextResponse.json(
        { error: "Bank account not found" },
        { status: 400 }
      );
    }

    // 6. Generate unique payment reference
    const generatePaymentReference = () => {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 8);
      return `DEP${timestamp}${random}`.toUpperCase();
    };

    const paymentReference = generatePaymentReference();

    // 7. Create deposit request with new payment flow
    const { data: depositRequest, error: createError } = await supabase
      .from("deposit_requests")
      .insert({
        user_id: user.id,
        bank_account_id: bankAccountId,
        kor_coins_amount: normalizedAmount,
        won_amount: validation.totalAmount - validation.vatAmount, // Base amount without VAT
        vat_amount: validation.vatAmount,
        total_amount: validation.totalAmount,
        status: "pending", // Use existing valid status
        payment_reference: paymentReference,
        payment_status: "pending_payment",
      })
      .select()
      .single();

    if (createError) {
      console.error("Deposit creation error:", createError);
      return NextResponse.json(
        { error: "Failed to create deposit request" },
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
        type: "deposit_request_created",
        title: "New Deposit Request",
        body: `${displayName} requested ${normalizedAmount.toLocaleString()} KOR (${paymentReference})`,
        metadata: {
          user_id: user.id,
          user_name: displayName,
          kor_coins_amount: korCoinsAmount,
          deposit_request_id: depositRequest.id,
          won_amount: validation.totalAmount - validation.vatAmount,
          vat_amount: validation.vatAmount,
          total_amount: validation.totalAmount,
          payment_reference: paymentReference,
          bank_account: {
            bank_name: bankAccount.bank_name,
            account_number: bankAccount.account_number,
            account_holder: bankAccount.account_holder_name,
          },
        },
        read: false,
      });
    } catch (notificationError) {
      // Log but don't fail the request for notification errors
      console.error("Notification creation error:", notificationError);
    }

    // 9. Return success response with payment reference
    return NextResponse.json({
      success: true,
      depositRequest: {
        id: depositRequest.id,
        kor_coins_amount: normalizedAmount,
        won_amount: validation.totalAmount - validation.vatAmount,
        vat_amount: validation.vatAmount,
        total_amount: validation.totalAmount,
        status: "pending",
        payment_reference: paymentReference,
        payment_status: "pending_payment",
        bank_account: bankAccount,
      },
      message:
        "Deposit request created successfully. Please transfer the amount using the payment reference.",
    });
  } catch (error) {
    console.error("Deposit API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve user's deposit requests
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

    // Get user's deposit requests
    const { data: depositRequests, error } = await supabase
      .from("deposit_requests")
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
        { error: "Failed to fetch deposit requests" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      depositRequests: depositRequests || [],
    });
  } catch (error) {
    console.error("Deposit GET API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
