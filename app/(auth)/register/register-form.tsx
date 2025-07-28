"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

const NAVER_CLIENT_ID = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;
const NAVER_REDIRECT_URI =
  typeof window !== "undefined"
    ? window.location.origin + "/api/auth/naver"
    : "";

function getNaverOAuthUrl() {
  const state = Math.random().toString(36).substring(2);
  if (typeof window !== "undefined") {
    localStorage.setItem("naver_oauth_state", state);
  }
  const params = new URLSearchParams({
    response_type: "code",
    client_id: NAVER_CLIENT_ID || "",
    redirect_uri: NAVER_REDIRECT_URI,
    state,
  });
  return `https://nid.naver.com/oauth2.0/authorize?${params.toString()}`;
}

// Referral reward amount (KORCOINS)
const REFERRAL_REWARD_KORCOINS = 500;

export function RegisterForm({ referralCode = "" }: { referralCode?: string }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, startTransition] = useTransition();
  const [lastUsed, setLastUsed] = useState<string | null>(null);
  const [referralCodeState, setReferralCodeState] = useState(referralCode);
  const [referrer, setReferrer] = useState<{
    first_name: string;
    last_name: string;
  } | null>(null);
  const [referralError, setReferralError] = useState<string | null>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastLookupValue = useRef("");
  const router = useRouter();
  const supabase = createClient();

  // Only read from localStorage once on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setLastUsed(localStorage.getItem("weetoo-last-sign-in-method"));
    }
  }, []);

  // On mount, if referralCode prop is provided, trigger lookup for referred by
  useEffect(() => {
    if (referralCode && referralCode.trim()) {
      const code = referralCode.trim().toUpperCase();
      // Lookup referral code
      (async () => {
        const { data: codeRow, error: codeError } = await supabase
          .from("referral_codes")
          .select("user_id")
          .eq("code", code)
          .single();
        if (codeError || !codeRow) {
          setReferrer(null);
          setReferralError("Referral code not found.");
          return;
        }
        // Lookup user by user_id
        const { data: userRow, error: userError } = await supabase
          .from("users")
          .select("first_name, last_name")
          .eq("id", codeRow.user_id)
          .single();
        if (userError || !userRow) {
          setReferrer(null);
          setReferralError("Referrer not found.");
          return;
        }
        setReferralError(null);
        setReferrer({
          first_name: userRow.first_name,
          last_name: userRow.last_name,
        });
      })();
    }
  }, [referralCode, supabase]);

  // Memoized email/password register handler
  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!agree) {
        toast.error(
          "You must agree to the Terms of Service and Privacy Policy."
        );
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Passwords do not match.");
        return;
      }
      startTransition(async () => {
        // Register user with Supabase Auth
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              nickname,
              role: "user",
            },
          },
        });
        if (error) {
          toast.error(error.message || "Registration failed");
        } else {
          // Insert into public.users with role 'user' (if not handled by trigger)
          // This is a fallback; ideally, your DB trigger sets the role.
          localStorage.setItem("weetoo-last-sign-in-method", "email");
          // --- Referral reward logic ---
          if (referrer && referralCodeState.trim()) {
            // Get the new user (should be logged in after signUp)
            const {
              data: { user: newUser },
            } = await supabase.auth.getUser();
            if (newUser) {
              // 1. Get the referral_codes row for the code
              const { data: codeRow } = await supabase
                .from("referral_codes")
                .select("id, user_id")
                .eq("code", referralCodeState.trim().toUpperCase())
                .single();
              if (codeRow) {
                // 2. Insert into referrals table
                await supabase.from("referrals").insert({
                  referrer_user_id: codeRow.user_id,
                  referred_user_id: newUser.id,
                  referral_code_id: codeRow.id,
                });
                // 3. Credit KORCOINS to the new user (add to any existing balance)
                // Fetch current kor_coins
                const { data: userRow } = await supabase
                  .from("users")
                  .select("kor_coins")
                  .eq("id", newUser.id)
                  .single();
                const currentKorCoins = userRow?.kor_coins || 0;
                await supabase
                  .from("users")
                  .update({
                    kor_coins: currentKorCoins + REFERRAL_REWARD_KORCOINS,
                  })
                  .eq("id", newUser.id);
                // 4. Show toast
                toast.success(
                  `You received ${REFERRAL_REWARD_KORCOINS} KORCOINS for signing up with a referral code!`
                );
              }
            }
          }
          toast.success("Registration successful! Please log in.");
          router.push("/");
        }
      });
    },
    [
      email,
      password,
      confirmPassword,
      firstName,
      lastName,
      nickname,
      agree,
      router,
      supabase,
      referrer,
      referralCodeState,
    ]
  );

  // Memoized social register handler
  const handleSocialRegister = useCallback(
    (provider: "google" | "kakao") => {
      startTransition(async () => {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: window.location.origin + "/callback",
          },
        });
        if (error) {
          toast.error(error.message || `Register with ${provider} failed`, {
            position: "top-center",
          });
        } else {
          localStorage.setItem("weetoo-last-sign-in-method", provider);
          toast.success(`Redirecting to ${provider}...`, {
            position: "top-center",
          });
        }
      });
    },
    [supabase]
  );

  // Memoized Naver register handler
  const handleNaverRegister = useCallback(() => {
    const url = getNaverOAuthUrl();
    localStorage.setItem("weetoo-last-sign-in-method", "naver");
    window.location.href = url;
  }, []);

  // Debounced referral code lookup
  const handleReferralCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    setReferralCodeState(rawInput); // keep original for input display
    setReferrer(null);
    setReferralError(null);
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    if (!rawInput.trim()) return;
    debounceTimeout.current = setTimeout(async () => {
      const code = rawInput.trim().toUpperCase();
      lastLookupValue.current = rawInput;
      // Lookup referral code
      const { data: codeRow, error: codeError } = await supabase
        .from("referral_codes")
        .select("user_id")
        .eq("code", code)
        .single();
      // Only update if input hasn't changed
      if (lastLookupValue.current !== rawInput) return;
      if (codeError || !codeRow) {
        setReferrer(null);
        setReferralError("Referral code not found.");
        return;
      }
      // Lookup user by user_id
      const { data: userRow, error: userError } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("id", codeRow.user_id)
        .single();
      if (lastLookupValue.current !== rawInput) return;
      if (userError || !userRow) {
        setReferrer(null);
        setReferralError("Referrer not found.");
        return;
      }
      setReferralError(null);
      setReferrer({
        first_name: userRow.first_name,
        last_name: userRow.last_name,
      });
    }, 300);
  };

  return (
    <div className="w-full h-full flex items-center justify-center flex-col">
      <div className="flex flex-col w-full max-w-md gap-4">
        <div className="flex gap-0.5 flex-col items-center select-none">
          <h3 className="text-[1.3rem] font-semibold">Create your account</h3>
          <p className="text-muted-foreground text-sm">
            Register to Weetoo to start trading cryptocurrencies and more.
          </p>
        </div>

        <div className="max-w-md w-full mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 mt-4">
            <button
              type="button"
              className="border w-full h-12 flex items-center justify-center rounded-lg cursor-pointer hover:bg-accent relative"
              onClick={() => handleSocialRegister("google")}
              disabled={loading}
              aria-label="Register with Google"
            >
              <svg
                className="w-5 h-5 "
                viewBox="0 0 256 262"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid"
              >
                <path
                  d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                  fill="#4285F4"
                />
                <path
                  d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                  fill="#34A853"
                />
                <path
                  d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
                  fill="#FBBC05"
                />
                <path
                  d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                  fill="#EB4335"
                />
              </svg>
              {lastUsed === "google" && (
                <span
                  className="absolute -top-1.5 -right-1.5 bg-gray-700 text-white text-[10px] px-1.5 py-0.5 rounded-full z-10 shadow-sm"
                  style={{ minWidth: "44px", textAlign: "center" }}
                >
                  Last used
                </span>
              )}
            </button>
            <button
              type="button"
              className="border w-full h-12 flex items-center justify-center rounded-lg bg-[#FFCD00] cursor-pointer hover:bg-[#FFB900] relative"
              onClick={() => handleSocialRegister("kakao")}
              disabled={loading}
              aria-label="Register with Kakao"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 22"
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 0C5.37 0 0 4.21 0 9.4C0 12.65 2.19 15.53 5.56 17.12C5.31 18.05 4.69 20.29 4.56 20.89C4.4 21.61 4.82 21.6 5.13 21.39C5.36 21.22 8.07 19.38 9.35 18.51C10.21 18.67 11.09 18.76 12 18.76C18.63 18.76 24 14.55 24 9.4C24 4.21 18.63 0 12 0Z"
                  fill="#000000"
                ></path>
              </svg>
              {lastUsed === "kakao" && (
                <span
                  className="absolute -top-1.5 -right-1.5 bg-gray-700 text-white text-[10px] px-1.5 py-0.5 rounded-full z-10 shadow-sm"
                  style={{ minWidth: "44px", textAlign: "center" }}
                >
                  Last used
                </span>
              )}
            </button>
            <button
              type="button"
              className="border w-full h-12 flex items-center justify-center rounded-lg bg-[#03C75A] cursor-pointer hover:bg-[#03B94D] relative"
              onClick={handleNaverRegister}
              disabled={loading}
              aria-label="Register with Naver"
            >
              <svg
                role="img"
                className="w-4 h-4 fill-current"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <title>Naver</title>
                <path d="M16.273 12.845 7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845Z" />
              </svg>
              {lastUsed === "naver" && (
                <span
                  className="absolute -top-1.5 -right-1.5 bg-gray-700 text-white text-[10px] px-1.5 py-0.5 rounded-full z-10 shadow-sm"
                  style={{ minWidth: "44px", textAlign: "center" }}
                >
                  Last used
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span
              className="w-full border-t border-border"
              aria-hidden="true"
            ></span>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-primary">
              or continue with email
            </span>
          </div>
        </div>
      </div>

      <form className="space-y-4 w-full max-w-md mt-6" onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Input
            type="text"
            id="firstName"
            placeholder="First name"
            className="h-12 bg-transparent"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={loading}
          />

          <Input
            type="text"
            id="lastName"
            placeholder="Last name"
            className="h-12 bg-transparent"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Input
            type="text"
            id="nickname"
            placeholder="Nickname"
            className="h-12 bg-transparent"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="flex flex-col gap-1 relative">
          <Input
            type="email"
            id="email"
            placeholder="Email address"
            className="h-12 bg-transparent"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={loading}
          />
          {lastUsed === "email" && (
            <span
              className="absolute -top-1.5 -right-1.5 bg-gray-700 text-white text-[10px] px-1.5 py-0.5 rounded-full z-10 shadow-sm"
              style={{ minWidth: "44px", textAlign: "center" }}
            >
              Last used
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1 relative">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              id="password"
              placeholder="Password"
              className="h-12 bg-transparent pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            <button
              type="button"
              className="absolute cursor-pointer right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1 relative">
          <div className="relative">
            <Input
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              placeholder="Confirm password"
              className="h-12 bg-transparent pr-10"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
            />
            <button
              type="button"
              className="absolute cursor-pointer right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={loading}
              aria-label={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Referral Code Input */}
        <div className="flex flex-col gap-1 relative">
          <Input
            type="text"
            id="referralCode"
            placeholder="Referral Code (optional)"
            className="h-12 bg-transparent"
            value={referralCodeState}
            onChange={handleReferralCodeChange}
            disabled={loading}
          />
          {referrer && !referralError && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-md bg-green-900/20 border border-green-700 text-green-400 text-sm font-medium">
              <svg
                className="w-4 h-4 text-green-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Referred by:{" "}
              <span className="font-semibold">
                {referrer.first_name} {referrer.last_name}
              </span>
            </div>
          )}
          {referralError && !referrer && (
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-md bg-red-900/20 border border-red-700 text-red-400 text-sm font-medium">
              <svg
                className="w-4 h-4 text-red-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              {referralError}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 w-full">
          <Checkbox
            id="agree"
            checked={agree}
            onCheckedChange={(v) => setAgree(!!v)}
            disabled={loading}
          />
          <Label className="text-xs text-muted-foreground" htmlFor="agree">
            I agree to the
            <Link
              href="#"
              className="text-xs text-primary hover:text-primary/80 transition-colors duration-200 ease-in-out"
            >
              Terms of Service
            </Link>
            and
            <Link
              href="#"
              className="text-xs text-primary hover:text-primary/80 transition-colors duration-200 ease-in-out"
            >
              Privacy Policy
            </Link>
          </Label>
        </div>

        <Button
          type="submit"
          className="w-full h-12"
          disabled={loading || !agree}
        >
          {loading ? "Registering..." : "Register"}
        </Button>
        <p className="text-sm text-muted-foreground text-center">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-sm text-primary hover:text-primary/80 transition-colors duration-200 ease-in-out"
          >
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
