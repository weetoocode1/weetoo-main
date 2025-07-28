"use server";
import { customAlphabet } from "nanoid";
import { createClient } from "@/lib/supabase/server";
import leoProfanity from "leo-profanity";
import {
  reservedReferralCodes,
  reservedReferralPatterns,
} from "@/lib/reserved-referral-codes";

const generateCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8); // No O/0/I/1 for clarity

// Interface for referral dashboard row
interface ReferralDashboardRow {
  email: string;
  date: string;
  status: string;
  earnings: string;
}

export async function generateReferralCode() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error("Not authenticated");

  // 1. Check if code exists
  const { data: existing } = await supabase
    .from("referral_codes")
    .select("code")
    .eq("user_id", user.id)
    .single();

  if (existing) return { code: existing.code };

  // 2. Generate a unique code
  let code,
    unique = false;
  while (!unique) {
    code = generateCode();
    const { data: codeExists } = await supabase
      .from("referral_codes")
      .select("id")
      .eq("code", code)
      .single();
    if (!codeExists) unique = true;
  }

  // 3. Insert the code
  const { error } = await supabase
    .from("referral_codes")
    .insert([{ user_id: user.id, code }]);
  if (error) throw error;

  return { code };
}

// Fetch the current user's referral code (no generation)
export async function getReferralCode() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("referral_codes")
    .select("code")
    .eq("user_id", user.id)
    .single();

  if (existing) return { code: existing.code };
  return { code: null };
}

export async function setCustomReferralCode(customCode: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");

  // 1. Format validation
  const code = customCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(code)) {
    return { error: "Code must be 4-12 characters, A-Z and 0-9 only." };
  }

  // 2. Reserved words (substring match, case-insensitive)
  for (const reserved of reservedReferralCodes) {
    if (code.toLowerCase().includes(reserved.toLowerCase())) {
      return { error: "This code is reserved. Please choose another." };
    }
  }
  for (const pattern of reservedReferralPatterns) {
    if (pattern.test(code)) {
      return { error: "This code is reserved. Please choose another." };
    }
  }

  // 3. Profanity check
  if (leoProfanity.check(code)) {
    return { error: "This code is not allowed." };
  }
  // Extra regex for common bad words
  const customBadWordRegex =
    /(f+\W*u+\W*c+\W*k+|s+\W*h+\W*i+\W*t+|b+\W*i+\W*t+\W*c+\W*h+|a+\W*s+\W*s+|c+\W*u+\W*n+\W*t+)/i;
  if (customBadWordRegex.test(code)) {
    return { error: "This code is not allowed." };
  }

  // 4. Uniqueness check
  const { data: exists } = await supabase
    .from("referral_codes")
    .select("id")
    .eq("code", code)
    .single();
  if (exists) {
    return { error: "This code is already taken. Please choose another." };
  }

  // 5. Upsert new code (replace old code atomically)
  const { error } = await supabase
    .from("referral_codes")
    .upsert([{ user_id: user.id, code }], { onConflict: "user_id" });
  if (error) {
    return { error: error.message || "Failed to set referral code." };
  }
  return { code };
}

// Fetch all referrals where the current user is the referrer
export async function getReferralDashboardData() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated");

  // Join referrals with users (referred) and referral_codes
  const { data, error } = await supabase
    .from("referrals")
    .select(
      `
      id,
      created_at,
      referred_user_id,
      referral_code_id,
      referred:referred_user_id(email),
      code:referral_code_id(code)
    `
    )
    .eq("referrer_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;

  // Map to dashboard row format
  const rows: ReferralDashboardRow[] = (data || []).map((row) => ({
    email: (row as { referred?: { email?: string } }).referred?.email || "-",
    date: row.created_at
      ? new Date(row.created_at).toISOString().slice(0, 10)
      : "-",
    status: "Verified", // Placeholder, update if you have a real status field
    earnings: "0 KORCOINS", // Placeholder, update if you have a real earnings field
  }));
  return rows;
}
