"use client";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCurrentUser,
  useGenerateReferralCode,
  useReferralCode,
  useReferralDashboard,
  useReferralRealtimeUpdates,
  useSetCustomReferralCode,
} from "@/hooks/use-referral";
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

// Placeholder for error reporting service
type ErrorWithMessage = { message: string } | Error | unknown;
function logErrorToService(error: ErrorWithMessage, context?: string) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[ReferralDashboard]", context, error);
  }
}

export function Referral() {
  // State for UI interactions
  const [copied, setCopied] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [customizing, setCustomizing] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // TanStack Query hooks
  const {
    data: referralCodeData,
    isLoading: codeLoading,
    error: codeError,
  } = useReferralCode();
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
  } = useReferralDashboard();
  const { data: user } = useCurrentUser();
  const generateCodeMutation = useGenerateReferralCode();
  const setCustomCodeMutation = useSetCustomReferralCode();

  // Extract data from queries
  const code = referralCodeData?.code || null;
  const referrals = dashboardData || [];
  const userId = user?.id || null;

  // Set up real-time updates
  useReferralRealtimeUpdates(userId);

  // Computed values
  const totalReferred = useMemo(() => referrals.length, [referrals]);
  const totalEarned = useMemo(
    () => referrals.reduce((sum, r) => sum + (parseInt(r.earnings) || 0), 0),
    [referrals]
  );
  const pendingPayout = useMemo(
    () => referrals.reduce((sum, r) => sum + (parseInt(r.earnings) || 0), 0),
    [referrals]
  );

  const handleGetCode = async () => {
    try {
      await generateCodeMutation.mutateAsync();
    } catch (err) {
      toast.error("Failed to get referral code. Please try again.");
      logErrorToService(err, "handleGetCode");
    }
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

  // Custom code input validation with debouncing
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

      const result = await setCustomCodeMutation.mutateAsync(customInput);
      if (result.error) {
        setCustomError(result.error);
      } else {
        setPendingCode(customInput);
        setCustomizeOpen(false);
        toast.success("Referral code updated!");
      }
    } catch (err) {
      setCustomError("Failed to set custom code. Please try again.");
      logErrorToService(err, "handleCustomSave");
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

  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    if (code) {
      setShareUrl(`${window.location.origin}/register?ref=${code}`);
    }
  }, [code]);

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
    <div className="p-2 sm:p-4 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-4">
        <h2 className="text-lg sm:text-xl font-semibold">Referral Code</h2>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-1 items-stretch sm:items-center">
          {codeLoading && <Skeleton className="w-full sm:w-32 h-10" />}
          {code && !codeLoading && (
            <div className="border-2 border-dotted px-4 sm:px-10 h-10 flex items-center justify-center">
              <span className="select-none font-mono text-sm font-semibold truncate">
                {code}
              </span>
            </div>
          )}
          {!code && !codeLoading && (
            <Button
              variant="outline"
              className="bg-muted px-4 sm:px-8 h-10 rounded-none font-semibold w-full sm:w-auto"
              onClick={handleGetCode}
              disabled={generateCodeMutation.isPending}
            >
              {generateCodeMutation.isPending
                ? "Generating..."
                : "Get your referral code"}
            </Button>
          )}
          {code && !codeLoading && (
            <div className="flex gap-1 items-center">
              <Button
                variant="outline"
                size="icon"
                className="rounded-none h-10 px-3 sm:px-5 flex-1 sm:flex-none"
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
                className="rounded-none h-10 px-3 sm:px-5 flex-1 sm:flex-none"
                onClick={handleCustomize}
                aria-label="Customize Referral Code"
              >
                <PencilIcon className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-none h-10 px-3 sm:px-5 flex-1 sm:flex-none"
                onClick={handleShare}
                aria-label="Share Referral Code"
              >
                <Share2Icon className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
      {codeError && (
        <div className="text-red-500 mt-2">
          Failed to fetch referral code. Please try again.
        </div>
      )}

      {/* Referral Dashboard */}
      <div className="mt-8 w-full">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-1 sm:gap-4 mb-4 w-full">
          <div className="flex flex-col items-center justify-center py-3 sm:py-7 bg-muted border rounded-none">
            <UsersIcon className="w-3 h-3 sm:w-5 sm:h-5 mb-1 text-primary" />
            <span className="text-sm sm:text-lg font-bold">
              {dashboardLoading ? (
                <Skeleton className="h-4 sm:h-6 w-8 sm:w-16" />
              ) : (
                totalReferred
              )}
            </span>
            <span className="text-xs text-muted-foreground text-center leading-tight">
              <span className="sm:hidden">Referred</span>
              <span className="hidden sm:inline">Total Referred</span>
            </span>
          </div>
          <div className="flex flex-col items-center justify-center py-3 sm:py-7 bg-muted border rounded-none">
            <Icons.coins className="w-3 h-3 sm:w-5 sm:h-5 mb-1 text-yellow-500" />
            <span className="text-sm sm:text-lg font-bold text-center">
              {dashboardLoading ? (
                <Skeleton className="h-4 sm:h-6 w-12 sm:w-24" />
              ) : (
                <span className="truncate text-xs sm:text-base">
                  <span className="sm:hidden">{totalEarned}</span>
                  <span className="hidden sm:inline">
                    {totalEarned} KORCOINS
                  </span>
                </span>
              )}
            </span>
            <span className="text-xs text-muted-foreground text-center leading-tight">
              <span className="sm:hidden">Earned</span>
              <span className="hidden sm:inline">Total Earned</span>
            </span>
          </div>
          <div className="flex flex-col items-center justify-center py-3 sm:py-7 bg-muted border rounded-none">
            <Icons.coins className="w-3 h-3 sm:w-5 sm:h-5 mb-1 text-yellow-500" />
            <span className="text-sm sm:text-lg font-bold text-center">
              {dashboardLoading ? (
                <Skeleton className="h-4 sm:h-6 w-10 sm:w-20" />
              ) : (
                <span className="truncate text-xs sm:text-base">
                  <span className="sm:hidden">{pendingPayout}</span>
                  <span className="hidden sm:inline">
                    {pendingPayout} KORCOINS
                  </span>
                </span>
              )}
            </span>
            <span className="text-xs text-muted-foreground text-center leading-tight">
              <span className="sm:hidden">Pending</span>
              <span className="hidden sm:inline">Pending Payout</span>
            </span>
          </div>
        </div>

        {/* Referral History Table */}
        <div className="w-full border rounded-none">
          <div className="flex items-center justify-between px-3 sm:px-6 py-3 border-b">
            <h3 className="font-semibold text-sm sm:text-base">
              Referral History
            </h3>
            {dashboardLoading && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-primary"></div>
                <span className="hidden sm:inline">Loading...</span>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm min-w-[400px]">
              <thead>
                <tr className="border-b">
                  <th className="px-3 sm:px-6 py-3 text-left font-semibold">
                    Joiner
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left font-semibold">
                    Join Date
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left font-semibold">
                    Status
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left font-semibold">
                    Earnings
                  </th>
                </tr>
              </thead>
              <tbody>
                {dashboardLoading ? (
                  Array.from({ length: rowsPerPage }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-3 sm:px-6 py-3">
                        <Skeleton className="h-3 sm:h-4 w-20 sm:w-24" />
                      </td>
                      <td className="px-3 sm:px-6 py-3">
                        <Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
                      </td>
                      <td className="px-3 sm:px-6 py-3">
                        <Skeleton className="h-3 sm:h-4 w-12 sm:w-16" />
                      </td>
                      <td className="px-3 sm:px-6 py-3">
                        <Skeleton className="h-3 sm:h-4 w-12 sm:w-16" />
                      </td>
                    </tr>
                  ))
                ) : dashboardError ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 sm:py-8">
                      <div className="flex flex-col items-center gap-2 px-4">
                        <div className="text-red-500 text-xs sm:text-sm">
                          Failed to load referral dashboard.
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.reload()}
                          className="rounded-none text-xs"
                        >
                          Retry
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : paginatedReferrals.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="text-center text-muted-foreground py-6 sm:py-8"
                    >
                      <div className="flex flex-col items-center gap-2 px-4">
                        <UsersIcon className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground/50" />
                        <div className="text-sm sm:text-base">
                          No referrals yet.
                        </div>
                        <div className="text-xs text-muted-foreground text-center">
                          Share your referral code to get started!
                        </div>
                      </div>
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
                      <td className="px-3 sm:px-6 py-3 truncate max-w-[120px] sm:max-w-none">
                        {row.email}
                      </td>
                      <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm">
                        {row.date}
                      </td>
                      <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm">
                        {row.status}
                      </td>
                      <td className="px-3 sm:px-6 py-3 text-xs sm:text-sm">
                        {row.earnings}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="flex justify-center sm:justify-end items-center gap-2 px-3 sm:px-6 py-3 border-t rounded-none">
                <button
                  className="px-2 sm:px-3 py-1 border bg-muted rounded-none text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handlePrev}
                  disabled={page === 1 || dashboardLoading}
                >
                  Prev
                </button>
                <span className="text-xs">
                  Page {page} of {totalPages || 1}
                </span>
                <button
                  className="px-2 sm:px-3 py-1 border bg-muted rounded-none text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleNext}
                  disabled={page === totalPages || dashboardLoading}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customize Referral Code Dialog */}
      <Dialog open={customizeOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md mx-4 sm:mx-auto rounded-none">
          <DialogTitle className="mb-4 text-base sm:text-lg">
            Customize Referral Code
          </DialogTitle>
          <div className="mb-4">
            <div className="text-xs text-muted-foreground mb-2">
              Current Code
            </div>
            <div className="border-2 border-dotted px-4 sm:px-10 py-3 text-lg sm:text-2xl font-mono font-bold text-center select-none rounded-none bg-background">
              {customizing ? (
                <Skeleton className="w-24 sm:w-32 h-6 sm:h-8 mx-auto" />
              ) : (
                <span className="truncate">{pendingCode || code}</span>
              )}
            </div>
          </div>
          <div className="mb-2 text-xs sm:text-sm text-muted-foreground">
            Enter a new code (4-12 characters, A-Z and 0-9 only).
            <br />
            <span className="block">
              Your old code will be replaced and cannot be used again.
            </span>
            <span className="block mt-2 font-semibold text-destructive-foreground text-xs sm:text-sm">
              Note:
            </span>
            <span className="block text-xs text-destructive-foreground mb-1">
              Do not use vulgar, offensive, or reserved words in your referral
              code. If you do, your code may be removed and your account may be{" "}
              <span className="font-bold">permanently banned</span>.
            </span>
          </div>
          <Input
            className="w-full border h-10 mb-2 rounded-none !bg-transparent font-mono text-sm sm:text-base"
            placeholder="Enter custom code"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value.toUpperCase())}
            maxLength={12}
            disabled={customizing}
            autoFocus
          />
          {customError && (
            <div className="text-red-500 text-xs sm:text-sm mb-2">
              {customError}
            </div>
          )}
          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-2">
            <Button
              variant="outline"
              className="rounded-none w-full sm:w-auto"
              onClick={handleDialogClose}
              disabled={customizing}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              className="rounded-none w-full sm:w-auto"
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
        <DialogContent className="max-w-md mx-4 sm:mx-auto rounded-none">
          <DialogTitle className="mb-4 text-base sm:text-lg">
            Share Your Referral Code
          </DialogTitle>
          <div className="mb-4">
            <div className="text-xs text-muted-foreground mb-2">
              Your Referral Code
            </div>
            <div className="flex items-center justify-center gap-2 border-2 border-dotted px-4 sm:px-6 py-3 text-lg sm:text-2xl font-mono font-bold text-center select-none rounded-none bg-background">
              <span className="truncate">{code}</span>
            </div>
          </div>
          <div className="mb-2 text-xs sm:text-sm text-muted-foreground text-center">
            Share your code and invite friends to join!
          </div>
          <div className="grid grid-cols-2 gap-2 w-full">
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
                <CheckIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
              ) : (
                <CopyIcon className="w-4 h-4 sm:w-5 sm:h-5 grayscale" />
              )}
              <span className="text-xs truncate ml-1">Copy Link</span>
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
              <Icons.threads className="w-4 h-4 sm:w-5 sm:h-5 grayscale" />
              <span className="text-xs truncate ml-1">Threads</span>
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
              <Icons.facebook className="w-4 h-4 sm:w-5 sm:h-5 grayscale" />
              <span className="text-xs truncate ml-1">Facebook</span>
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
              <Icons.twitter className="w-4 h-4 sm:w-5 sm:h-5 grayscale" />
              <span className="text-xs truncate ml-1">X</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
