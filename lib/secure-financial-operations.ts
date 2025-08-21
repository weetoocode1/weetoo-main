/**
 * Secure Financial Operations
 *
 * This module contains server-side validation and business logic
 * for financial operations to prevent client-side bypass attacks.
 *
 * All functions must be called from server-side code only.
 */

import { createClient } from "@/lib/supabase/server";

// Types for secure financial operations
export interface SecureWithdrawalValidation {
  isValid: boolean;
  errorMessage?: string;
  feeAmount: number;
  finalAmount: number;
  feePercentage: number;
}

export interface SecureDepositValidation {
  isValid: boolean;
  errorMessage?: string;
  vatAmount: number;
  totalAmount: number;
}

export interface RateLimitCheck {
  isAllowed: boolean;
  remainingRequests: number;
  resetTime: Date;
}

/**
 * Secure withdrawal validation - validates balance, limits, and calculates fees
 * This function must be called server-side to prevent client manipulation
 */
export async function validateWithdrawalRequest(
  userId: string,
  requestedAmount: number,
  bankAccountId: string
): Promise<SecureWithdrawalValidation> {
  try {
    const supabase = await createClient();

    // 1. Validate user exists and get current balance
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, kor_coins, level")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return {
        isValid: false,
        errorMessage: "User not found",
        feeAmount: 0,
        finalAmount: 0,
        feePercentage: 0,
      };
    }

    // 2. Server-side amount validation
    if (requestedAmount < 100) {
      return {
        isValid: false,
        errorMessage: "Minimum withdrawal amount is 100 KOR",
        feeAmount: 0,
        finalAmount: 0,
        feePercentage: 0,
      };
    }

    if (requestedAmount > 15000) {
      return {
        isValid: false,
        errorMessage: "Maximum withdrawal amount is 15,000 KOR",
        feeAmount: 0,
        finalAmount: 0,
        feePercentage: 0,
      };
    }

    // 3. Server-side balance validation
    if (requestedAmount > user.kor_coins) {
      return {
        isValid: false,
        errorMessage: `Insufficient balance. You have ${user.kor_coins.toLocaleString()} KOR, but requested ${requestedAmount.toLocaleString()} KOR`,
        feeAmount: 0,
        finalAmount: 0,
        feePercentage: 0,
      };
    }

    // 4. Server-side fee calculation based on user level
    const level = user.level || 1;
    let feePercentage = 40; // Default Bronze tier

    if (level >= 76 && level <= 99) {
      feePercentage = 10; // Platinum
    } else if (level >= 51 && level <= 75) {
      feePercentage = 20; // Gold
    } else if (level >= 26 && level <= 50) {
      feePercentage = 30; // Silver
    }

    const feeAmount = Math.floor((requestedAmount * feePercentage) / 100);
    const finalAmount = requestedAmount - feeAmount;

    // 5. Validate bank account exists and is accessible
    const { data: bankAccount, error: bankError } = await supabase
      .from("bank_accounts")
      .select("id, user_id")
      .eq("id", bankAccountId)
      .single();

    if (bankError || !bankAccount) {
      return {
        isValid: false,
        errorMessage: "Bank account not found",
        feeAmount: 0,
        finalAmount: 0,
        feePercentage: 0,
      };
    }

    // 6. Ensure user owns the bank account
    if (bankAccount.user_id !== userId) {
      return {
        isValid: false,
        errorMessage: "Bank account does not belong to user",
        feeAmount: 0,
        finalAmount: 0,
        feePercentage: 0,
      };
    }

    return {
      isValid: true,
      feeAmount,
      finalAmount,
      feePercentage,
    };
  } catch (_error) {
    return {
      isValid: false,
      errorMessage: "Validation failed due to server error",
      feeAmount: 0,
      finalAmount: 0,
      feePercentage: 0,
    };
  }
}

/**
 * Secure deposit validation - validates amount and calculates VAT
 * This function must be called server-side to prevent client manipulation
 */
export async function validateDepositRequest(
  userId: string,
  korCoinsAmount: number,
  bankAccountId: string
): Promise<SecureDepositValidation> {
  try {
    const supabase = await createClient();

    // 1. Validate user exists
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return {
        isValid: false,
        errorMessage: "User not found",
        vatAmount: 0,
        totalAmount: 0,
      };
    }

    // 2. Sanitize amount to integer and validate range
    const sanitizedAmount = Math.floor(Number(korCoinsAmount));
    if (!Number.isFinite(sanitizedAmount) || sanitizedAmount <= 0) {
      return {
        isValid: false,
        errorMessage: "Invalid amount",
        vatAmount: 0,
        totalAmount: 0,
      };
    }

    if (sanitizedAmount < 100) {
      return {
        isValid: false,
        errorMessage: "Minimum deposit amount is 100 KOR",
        vatAmount: 0,
        totalAmount: 0,
      };
    }

    if (sanitizedAmount > 99000) {
      return {
        isValid: false,
        errorMessage: "Maximum deposit amount is 99,000 KOR",
        vatAmount: 0,
        totalAmount: 0,
      };
    }

    // 3. Server-side VAT calculation (1 KOR = 1.1 won, 10% VAT included)
    const baseWon = sanitizedAmount;
    const vatAmount = Math.floor((baseWon * 10) / 100);
    const totalAmount = baseWon + vatAmount;

    // 4. Validate bank account exists and is accessible
    const { data: bankAccount, error: bankError } = await supabase
      .from("bank_accounts")
      .select("id, user_id")
      .eq("id", bankAccountId)
      .single();

    if (bankError || !bankAccount) {
      return {
        isValid: false,
        errorMessage: "Bank account not found",
        vatAmount: 0,
        totalAmount: 0,
      };
    }

    // 5. Ensure user owns the bank account
    if (bankAccount.user_id !== userId) {
      return {
        isValid: false,
        errorMessage: "Bank account does not belong to user",
        vatAmount: 0,
        totalAmount: 0,
      };
    }

    return {
      isValid: true,
      vatAmount,
      totalAmount,
    };
  } catch (_error) {
    return {
      isValid: false,
      errorMessage: "Validation failed due to server error",
      vatAmount: 0,
      totalAmount: 0,
    };
  }
}

/**
 * Rate limiting check for financial operations
 * Prevents spam requests and abuse
 */
export async function checkRateLimit(
  userId: string,
  operationType: "withdrawal" | "deposit",
  maxRequestsPerDay: number = 5
): Promise<RateLimitCheck> {
  try {
    const supabase = await createClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count requests made today
    const { data: requests, error } = await supabase
      .from(
        operationType === "withdrawal"
          ? "withdrawal_requests"
          : "deposit_requests"
      )
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", today.toISOString());

    if (error) {
      return {
        isAllowed: false,
        remainingRequests: 0,
        resetTime: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      };
    }

    const requestsToday = requests?.length || 0;
    const remainingRequests = Math.max(0, maxRequestsPerDay - requestsToday);
    const isAllowed = remainingRequests > 0;

    // Calculate reset time (next day at midnight)
    const resetTime = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    return {
      isAllowed,
      remainingRequests,
      resetTime,
    };
  } catch (_error) {
    return {
      isAllowed: false,
      remainingRequests: 0,
      resetTime: new Date(),
    };
  }
}

/**
 * Secure balance check - validates user has sufficient funds
 * This prevents negative balance attacks
 */
export async function validateUserBalance(
  userId: string,
  requiredAmount: number
): Promise<{
  hasSufficientBalance: boolean;
  currentBalance: number;
  errorMessage?: string;
}> {
  try {
    const supabase = await createClient();

    const { data: user, error } = await supabase
      .from("users")
      .select("kor_coins")
      .eq("id", userId)
      .single();

    if (error || !user) {
      return {
        hasSufficientBalance: false,
        currentBalance: 0,
        errorMessage: "User not found",
      };
    }

    const currentBalance = user.kor_coins || 0;
    const hasSufficientBalance = currentBalance >= requiredAmount;

    return {
      hasSufficientBalance,
      currentBalance,
    };
  } catch (_error) {
    return {
      hasSufficientBalance: false,
      currentBalance: 0,
      errorMessage: "Balance check failed",
    };
  }
}
