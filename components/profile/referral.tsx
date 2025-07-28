"use client";
import {
  generateReferralCode,
  getReferralCode,
  getReferralDashboardData,
  setCustomReferralCode,
} from "@/app/actions/generateReferralCode";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  reservedReferralCodes,
  reservedReferralPatterns,
} from "@/lib/reserved-referral-codes";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import leoProfanity from "leo-profanity";
import {
  CheckIcon,
  CopyIcon,
  PencilIcon,
  Share2Icon,
  UsersIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// Interface for referral dashboard row
interface ReferralDashboardRow {
  email: string;
  date: string;
  status: string;
  earnings: string;
}

// Placeholder for error reporting service
type ErrorWithMessage = { message: string } | Error | unknown;
function logErrorToService(error: ErrorWithMessage, context?: string) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[ReferralDashboard]", context, error);
  }
}

export function Referral() {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [customizing, setCustomizing] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const [referrals, setReferrals] = useState<ReferralDashboardRow[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const totalReferred = useMemo(() => referrals.length, [referrals]);
  const totalEarned = useMemo(
    () => referrals.reduce((sum, r) => sum + (parseInt(r.earnings) || 0), 0),
    [referrals]
  );
  const pendingPayout = useMemo(
    () => referrals.reduce((sum, r) => sum + (parseInt(r.earnings) || 0), 0),
    [referrals]
  );

  useEffect(() => {
    const fetchCodeAndUser = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getReferralCode();
        setCode(result.code);
        const supabase = createSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user && user.id) setUserId(user.id);
      } catch (err) {
        setError("Failed to fetch referral code. Please try again.");
        logErrorToService(err, "fetchCodeAndUser");
      }
      setLoading(false);
    };
    fetchCodeAndUser();
    const fetchDashboard = async () => {
      setDashboardLoading(true);
      setDashboardError(null);
      try {
        const rows = await getReferralDashboardData();
        setReferrals(rows);
      } catch (err) {
        setDashboardError("Failed to load referral dashboard.");
        logErrorToService(err, "fetchDashboard");
      }
      setDashboardLoading(false);
    };
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const supabase = createSupabaseClient();
    const channel = supabase
      .channel("referrals-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "referrals",
          filter: `referrer_user_id=eq.${userId}`,
        },
        (payload) => {
          (async () => {
            setDashboardLoading(true);
            try {
              const rows = await getReferralDashboardData();
              setReferrals(rows);
            } catch (err) {
              logErrorToService(err, "realtime update");
            }
            setDashboardLoading(false);
          })();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleGetCode = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateReferralCode();
      setCode(result.code);
    } catch (_err) {
      setError("Failed to get referral code. Please try again.");
    }
    setLoading(false);
  };

  const handleCopy = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Referral code copied!");
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleCustomize = () => {
    setCustomInput("");
    setCustomError(null);
    setCustomizeOpen(true);
    setPendingCode(null);
  };

  leoProfanity.add([""]);
  const customBadWordRegex =
    /(f+\W*u+\W*c+\W*k+|s+\W*h+\W*i+\W*t+|b+\W*i+\W*t+\W*c+\W*h+|a+\W*s+\W*s+|c+\W*u+\W*n+\W*t+)/i;

  // Validate input and return error message if invalid, or null if valid
  const validateInput = (input: string): string | null => {
    if (!input) {
      return null; // Empty input is valid (no error shown)
    }
    if (!/^[A-Z0-9]{4,12}$/.test(input)) {
      return "Code must be 4-12 characters, A-Z and 0-9 only.";
    }
    const reservedWordMatch = reservedReferralCodes.some((reserved) =>
      input.toLowerCase().includes(reserved.toLowerCase())
    );
    if (reservedWordMatch) {
      return "This code is reserved. Please choose another.";
    }
    const reservedPatternMatch = reservedReferralPatterns.some((pattern) =>
      pattern.test(input)
    );
    if (reservedPatternMatch) {
      return "This code is reserved. Please choose another.";
    }
    if (leoProfanity.check(input) || customBadWordRegex.test(input)) {
      return "This code is not allowed.";
    }
    if (input === code) {
      return "Don't use the same code as your current code.";
    }
    return null;
  };

  // Custom code input validation
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Synchronous validation
    const syncError = validateInput(customInput);
    setCustomError(syncError);

    if (syncError || !customInput) return;

    // Capture the value at debounce time (local variable, not state)
    const inputAtDebounce = customInput;

    debounceRef.current = setTimeout(async () => {
      // Only proceed if input hasn't changed and still passes sync validation
      if (customInput !== inputAtDebounce) return;
      if (validateInput(customInput)) return;

      try {
        const supabase = createSupabaseClient();
        const { data, error } = await supabase
          .from("referral_codes")
          .select("user_id")
          .eq("code", inputAtDebounce);

        // Only update error if input is still current and valid
        if (customInput !== inputAtDebounce) return;
        if (validateInput(customInput)) return;

        if (error) {
          setCustomError("Error checking code. Try again.");
          return;
        }
        if (data && data.length > 0 && data[0].user_id !== userId) {
          setCustomError("This code is already taken.");
        } else {
          setCustomError(null);
        }
      } catch (err) {
        setCustomError("Error checking code. Try again.");
        logErrorToService(err, "validateInput");
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [customInput, userId, code]);

  const handleCustomSave = async () => {
    // Re-validate input before submission
    const syncError = validateInput(customInput);
    if (syncError) {
      setCustomError(syncError);
      return;
    }

    // Ensure no async errors are pending
    if (customError) {
      return;
    }

    setCustomizing(true);
    setCustomError(null);
    setPendingCode(null);
    try {
      // Double-check availability in DB before saving
      const supabase = createSupabaseClient();
      const { data, error } = await supabase
        .from("referral_codes")
        .select("user_id")
        .eq("code", customInput);

      if (error) {
        setCustomError("Error checking code availability. Try again.");
        setCustomizing(false);
        return;
      }
      if (data && data.length > 0 && data[0].user_id !== userId) {
        setCustomError("This code is already taken.");
        setCustomizing(false);
        return;
      }

      const result = await setCustomReferralCode(customInput);
      if (result.error) {
        setCustomError(result.error);
      } else {
        setPendingCode(customInput);
        setCode(customInput);
        setCustomizeOpen(false);
        toast.success("Referral code updated!");
      }
    } catch (_err) {
      setCustomError("Failed to set custom code. Please try again.");
      logErrorToService(_err, "handleCustomSave");
    }
    setCustomizing(false);
  };

  const handleDialogClose = () => {
    setCustomizeOpen(false);
    setPendingCode(null);
    setCustomizing(false);
    setCustomInput("");
    setCustomError(null);
  };

  const shareUrl =
    typeof window !== "undefined" && code
      ? `${window.location.origin}/register?ref=${code}`
      : "";

  const handleShare = () => {
    setShareOpen(true);
  };
  const handleShareDialogClose = () => {
    setShareOpen(false);
  };

  const totalPages = Math.ceil(referrals.length / rowsPerPage);
  const paginatedReferrals = referrals.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );
  const handlePrev = () => setPage((p) => Math.max(1, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));

  return (
    <div className="p-4 select-none">
      <div className="flex items-center justify-between w-full">
        <h2 className="text-xl font-semibold">Referral Code</h2>
        <div className="flex gap-1 items-center">
          {loading && <Skeleton className="w-32 h-10" />}
          {code && !loading && (
            <div className="border-2 border-dotted px-10 h-10 flex items-center">
              <span className="select-none font-mono text-sm font-semibold">
                {code}
              </span>
            </div>
          )}
          {!code && !loading && (
            <Button
              variant="outline"
              className="bg-muted px-8 h-10 rounded-none font-semibold"
              onClick={handleGetCode}
              disabled={loading}
            >
              {loading ? "Generating..." : "Get your referral code"}
            </Button>
          )}
          {code && !loading && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="rounded-none h-10 px-5"
                onClick={handleCopy}
              >
                {copied ? (
                  <CheckIcon className="w-4 h-4 text-green-600" />
                ) : (
                  <CopyIcon className="w-4 h-4" />
                )}
                <span className="sr-only">Copy</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-none h-10 px-5"
                onClick={handleCustomize}
                aria-label="Customize Referral Code"
              >
                <PencilIcon className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-none h-10 px-5"
                onClick={handleShare}
                aria-label="Share Referral Code"
              >
                <Share2Icon className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>
      {error && <div className="text-red-500 mt-2">{error}</div>}

      {/* Referral Dashboard */}
      <div className="mt-8 w-full">
        {/* Stats Row */}
        <div className="flex flex-row gap-4 mb-4 w-full">
          <div className="flex-1 flex flex-col items-center justify-center py-7 bg-muted border rounded-none">
            <UsersIcon className="w-5 h-5 mb-1 text-primary" />
            <span className="text-lg font-bold">
              {dashboardLoading ? (
                <Skeleton className="h-6 w-16" />
              ) : (
                totalReferred
              )}
            </span>
            <span className="text-xs text-muted-foreground">
              Total Referred
            </span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center py-7 bg-muted border rounded-none">
            <Icons.coins className="w-5 h-5 mb-1 text-yellow-500" />
            <span className="text-lg font-bold">
              {dashboardLoading ? (
                <Skeleton className="h-6 w-24" />
              ) : (
                `${totalEarned} KORCOINS`
              )}
            </span>
            <span className="text-xs text-muted-foreground">Total Earned</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center py-7 bg-muted border rounded-none">
            <Icons.coins className="w-5 h-5 mb-1 text-yellow-500" />
            <span className="text-lg font-bold">
              {dashboardLoading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                `${pendingPayout} KORCOINS`
              )}
            </span>
            <span className="text-xs text-muted-foreground">
              Pending Payout
            </span>
          </div>
        </div>

        {/* Referral History Table */}
        <div className="w-full border rounded-none">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-6 py-3 text-left font-semibold">Joiner</th>
                <th className="px-6 py-3 text-left font-semibold">Join Date</th>
                <th className="px-6 py-3 text-left font-semibold">Status</th>
                <th className="px-6 py-3 text-left font-semibold">Earnings</th>
              </tr>
            </thead>
            <tbody>
              {dashboardLoading ? (
                Array.from({ length: rowsPerPage }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-6 py-3">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-6 py-3">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="px-6 py-3">
                      <Skeleton className="h-4 w-16" />
                    </td>
                  </tr>
                ))
              ) : dashboardError ? (
                <tr>
                  <td colSpan={4} className="text-center text-red-500 py-4">
                    {dashboardError}
                  </td>
                </tr>
              ) : paginatedReferrals.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center text-muted-foreground py-4"
                  >
                    No referrals yet.
                  </td>
                </tr>
              ) : (
                paginatedReferrals.map((row, i) => (
                  <tr
                    key={row.email + row.date + i}
                    className={
                      i !== paginatedReferrals.length - 1
                        ? "border-b"
                        : undefined
                    }
                  >
                    <td className="px-6 py-3">{row.email}</td>
                    <td className="px-6 py-3">{row.date}</td>
                    <td className="px-6 py-3">{row.status}</td>
                    <td className="px-6 py-3">{row.earnings}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="flex justify-end items-center gap-2 px-6 py-3 border-t rounded-none">
            <button
              className="px-3 py-1 border bg-muted rounded-none text-xs"
              onClick={handlePrev}
              disabled={page === 1 || dashboardLoading}
            >
              Prev
            </button>
            <span className="text-xs">
              Page {page} of {totalPages || 1}
            </span>
            <button
              className="px-3 py-1 border bg-muted rounded-none text-xs"
              onClick={handleNext}
              disabled={page === totalPages || dashboardLoading}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Customize Referral Code Dialog */}
      <Dialog open={customizeOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md rounded-none">
          <DialogTitle className="mb-4">Customize Referral Code</DialogTitle>
          <div className="mb-4">
            <div className="text-xs text-muted-foreground mb-2">
              Current Code
            </div>
            <div className="border-2 border-dotted px-10 py-3 text-2xl font-mono font-bold text-center select-none rounded-none bg-background">
              {customizing ? (
                <Skeleton className="w-32 h-8 mx-auto" />
              ) : (
                pendingCode || code
              )}
            </div>
          </div>
          <div className="mb-2 text-sm text-muted-foreground">
            Enter a new code (4-12 characters, A-Z and 0-9 only).
            <br />
            <span className="block">
              Your old code will be replaced and cannot be used again.
            </span>
            <span className="block mt-2 font-semibold text-destructive-foreground text-sm">
              Note:
            </span>
            <span className="block text-xs text-destructive-foreground mb-1">
              Do not use vulgar, offensive, or reserved words in your referral
              code. If you do, your code may be removed and your account may be{" "}
              <span className="font-bold">permanently banned</span>.
            </span>
          </div>
          <Input
            className="w-full border h-10 mb-2 rounded-none !bg-transparent font-mono text-base"
            placeholder="Enter custom code"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value.toUpperCase())}
            maxLength={12}
            disabled={customizing}
            autoFocus
          />
          {customError && (
            <div className="text-red-500 text-sm mb-2">{customError}</div>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <Button
              variant="outline"
              className="rounded-none"
              onClick={handleDialogClose}
              disabled={customizing}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="rounded-none"
              onClick={handleCustomSave}
              disabled={customizing || !customInput || !!customError}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Referral Code Dialog */}
      <Dialog open={shareOpen} onOpenChange={handleShareDialogClose}>
        <DialogContent className="max-w-md rounded-none">
          <DialogTitle className="mb-4">Share Your Referral Code</DialogTitle>
          <div className="mb-4">
            <div className="text-xs text-muted-foreground mb-2">
              Your Referral Code
            </div>
            <div className="flex items-center justify-center gap-2 border-2 border-dotted px-6 py-3 text-2xl font-mono font-bold text-center select-none rounded-none bg-background">
              <span className="truncate">{code}</span>
            </div>
          </div>
          <div className="mb-2 text-sm text-muted-foreground text-center">
            Share your code and invite friends to join!
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 w-full">
            <Button
              variant="outline"
              className="w-full flex items-center justify-center rounded-none h-10"
              onClick={() => {
                if (!shareUrl) return;
                navigator.clipboard.writeText(shareUrl);
                setShareCopied(true);
                toast.success("Referral link copied!");
                setTimeout(() => setShareCopied(false), 1500);
              }}
            >
              {shareCopied ? (
                <CheckIcon className="w-5 h-5 text-green-500" />
              ) : (
                <CopyIcon className="w-5 h-5 grayscale" />
              )}
              <span className="text-xs truncate sr-only">Copy Link</span>
            </Button>
            <Button
              variant="outline"
              className="w-full flex items-center justify-center rounded-none h-10"
              onClick={() =>
                window.open(
                  `https://www.threads.net/intent/post?text=${encodeURIComponent(
                    `Join Weetoo with my referral code: ${code}\n${shareUrl}`
                  )}`,
                  "_blank"
                )
              }
            >
              <Icons.threads className="w-5 h-5 grayscale" />
              <span className="text-xs truncate sr-only">Threads</span>
            </Button>
            <Button
              variant="outline"
              className="w-full flex items-center justify-center rounded-none h-10"
              onClick={() =>
                window.open(
                  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                    shareUrl
                  )}`,
                  "_blank"
                )
              }
            >
              <Icons.facebook className="w-5 h-5 grayscale" />
              <span className="text-xs truncate sr-only">Facebook</span>
            </Button>
            <Button
              variant="outline"
              className="w-full flex items-center justify-center rounded-none h-10"
              onClick={() =>
                window.open(
                  `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                    `Join Weetoo with my referral code: ${code}\n${shareUrl}`
                  )}`,
                  "_blank"
                )
              }
            >
              <Icons.twitter className="w-5 h-5 grayscale" />
              <span className="text-xs truncate sr-only">X</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
