import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Simple in-memory rate limiting (for production, consider Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = {
  MAX_ATTEMPTS: 5, // Maximum attempts per window
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes window
  BLOCK_DURATION_MS: 60 * 60 * 1000, // 1 hour block after limit exceeded
};

function checkRateLimit(userId: string): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit) {
    // First attempt
    rateLimitMap.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT.WINDOW_MS,
    });
    return {
      allowed: true,
      remaining: RATE_LIMIT.MAX_ATTEMPTS - 1,
      resetTime: now + RATE_LIMIT.WINDOW_MS,
    };
  }

  // Check if we're in a new window
  if (now > userLimit.resetTime) {
    // Reset for new window
    rateLimitMap.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT.WINDOW_MS,
    });
    return {
      allowed: true,
      remaining: RATE_LIMIT.MAX_ATTEMPTS - 1,
      resetTime: now + RATE_LIMIT.WINDOW_MS,
    };
  }

  // Check if user is blocked
  if (userLimit.count >= RATE_LIMIT.MAX_ATTEMPTS) {
    const blockEndTime = userLimit.resetTime + RATE_LIMIT.BLOCK_DURATION_MS;
    if (now < blockEndTime) {
      return { allowed: false, remaining: 0, resetTime: blockEndTime };
    } else {
      // Block period ended, reset
      rateLimitMap.set(userId, {
        count: 1,
        resetTime: now + RATE_LIMIT.WINDOW_MS,
      });
      return {
        allowed: true,
        remaining: RATE_LIMIT.MAX_ATTEMPTS - 1,
        resetTime: now + RATE_LIMIT.WINDOW_MS,
      };
    }
  }

  // Increment attempt count
  userLimit.count++;
  rateLimitMap.set(userId, userLimit);

  return {
    allowed: true,
    remaining: RATE_LIMIT.MAX_ATTEMPTS - userLimit.count,
    resetTime: userLimit.resetTime,
  };
}

/**
 * Secure Bank Account Verification API
 *
 * This endpoint handles bank account verification with server-side validation
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
    const { bankAccountId, verificationAmount } = body;

    if (!bankAccountId || verificationAmount === undefined) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: bankAccountId and verificationAmount",
        },
        { status: 400 }
      );
    }

    // 3. Validate verification amount format
    const parsedAmount = Number(verificationAmount);
    if (isNaN(parsedAmount) || parsedAmount < 0.001 || parsedAmount > 0.0099) {
      return NextResponse.json(
        {
          error:
            "Invalid verification amount. Must be between 0.0010 and 0.0099",
        },
        { status: 400 }
      );
    }

    // 4. Get bank account details (with verification amount for validation)
    const { data: bankAccount, error: fetchError } = await supabase
      .from("bank_accounts")
      .select("id, user_id, verification_amount, is_verified")
      .eq("id", bankAccountId)
      .single();

    if (fetchError || !bankAccount) {
      return NextResponse.json(
        { error: "Bank account not found" },
        { status: 404 }
      );
    }

    // 5. Verify user owns the bank account
    if (bankAccount.user_id !== user.id) {
      return NextResponse.json(
        { error: "Bank account does not belong to user" },
        { status: 403 }
      );
    }

    // 6. Check rate limiting
    const rateLimit = checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many verification attempts. Please try again later.",
          resetTime: rateLimit.resetTime,
          blocked: true,
        },
        { status: 429 }
      );
    }

    // 7. Check if already verified
    if (bankAccount.is_verified) {
      return NextResponse.json(
        { error: "Bank account is already verified" },
        { status: 400 }
      );
    }

    // 7. Validate verification amount (with tolerance for floating point precision)
    const expectedAmount = Number(bankAccount.verification_amount);
    const enteredAmount = Number(parsedAmount.toFixed(4));
    const tolerance = 0.0001; // Allow small precision differences

    if (Math.abs(enteredAmount - expectedAmount) > tolerance) {
      return NextResponse.json(
        {
          error:
            "Verification amount does not match. Please check the amount you received.",
        },
        { status: 400 }
      );
    }

    // 8. Use the existing RPC function for verification
    const { error: rpcError } = await supabase.rpc("verify_bank_and_promote", {
      _bank_account_id: bankAccountId,
      _amount: enteredAmount,
    });

    if (rpcError) {
      console.error("RPC verification error:", rpcError);
      return NextResponse.json(
        { error: "Verification failed. Please try again." },
        { status: 500 }
      );
    }

    // 9. Return success with rate limit info
    const response = NextResponse.json({
      success: true,
      message: "Bank account verified successfully!",
      bankAccount: {
        id: bankAccountId,
        is_verified: true,
      },
    });

    // Add rate limit headers
    response.headers.set(
      "X-RateLimit-Remaining",
      rateLimit.remaining.toString()
    );
    response.headers.set("X-RateLimit-Reset", rateLimit.resetTime.toString());
    response.headers.set(
      "X-RateLimit-Limit",
      RATE_LIMIT.MAX_ATTEMPTS.toString()
    );

    return response;
  } catch (error) {
    console.error("Bank verification API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
