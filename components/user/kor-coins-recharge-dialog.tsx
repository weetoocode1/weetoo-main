import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { Icons } from "../icons";

export function KorCoinsRechargeDialog() {
  const [korCoinsAmount, setKorCoinsAmount] = useState("");
  const [userKorCoins, setUserKorCoins] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const lastSessionId = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    setLoading(true);
    supabase.auth.getSession().then(({ data }) => {
      const sessionId = data.session?.user?.id || null;
      if (lastSessionId.current === sessionId && userKorCoins !== null) {
        setLoading(false);
        return;
      }
      lastSessionId.current = sessionId;
      if (!sessionId) {
        if (mounted) setLoading(false);
        setUserKorCoins(null);
        return;
      }
      supabase
        .from("users")
        .select("id, kor_coins")
        .eq("id", sessionId)
        .single()
        .then(({ data, error }) => {
          if (mounted) {
            setUserKorCoins(error ? 0 : data?.kor_coins ?? 0);
            setLoading(false);
          }
        });
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const sessionId = session?.user?.id || null;
        if (lastSessionId.current === sessionId && userKorCoins !== null) {
          setLoading(false);
          return;
        }
        lastSessionId.current = sessionId;
        if (!sessionId) {
          setUserKorCoins(null);
          setLoading(false);
          return;
        }
        setLoading(true);
        supabase
          .from("users")
          .select("id, kor_coins")
          .eq("id", sessionId)
          .single()
          .then(({ data, error }) => {
            setUserKorCoins(error ? 0 : data?.kor_coins ?? 0);
            setLoading(false);
          });
      }
    );
    return () => {
      mounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  // Define threshold for low balance (easy to change in the future)
  const LOW_BALANCE_THRESHOLD = 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-lg">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-2">
                  {loading ? (
                    <Skeleton className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="relative">
                      {(userKorCoins ?? 0) <= LOW_BALANCE_THRESHOLD ? (
                        <Icons.lowCoins className="w-6 h-6" />
                      ) : (
                        <Icons.coins className="w-6 h-6 text-yellow-400 drop-shadow-[0_0_2px_rgba(255,215,0,0.5)]" />
                      )}
                      {(userKorCoins ?? 0) <= LOW_BALANCE_THRESHOLD && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      )}
                    </div>
                  )}
                  <span className="whitespace-nowrap sr-only">
                    KOR Coins Recharge
                  </span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {loading
                  ? "Loading..."
                  : `KOR Coins: ${(userKorCoins ?? 0).toLocaleString()}`}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md p-0">
        <div className="flex flex-col max-h-[80vh]">
          <div className="overflow-y-auto px-6 pt-6 pb-2 flex-1">
            <DialogHeader className="flex gap-0">
              <DialogTitle className="text-lg font-bold flex items-center gap-1.5">
                {/* Icon and balance inside dialog */}
                {loading ? (
                  <Skeleton className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="relative">
                    {(userKorCoins ?? 0) <= LOW_BALANCE_THRESHOLD ? (
                      <Icons.lowCoins className="w-5 h-5 mr-1" />
                    ) : (
                      <Icons.coins className="w-5 h-5 mr-1 text-yellow-400 drop-shadow-[0_0_2px_rgba(255,215,0,0.5)]" />
                    )}
                    {(userKorCoins ?? 0) <= LOW_BALANCE_THRESHOLD && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </div>
                )}
                KOR Coins Recharge
              </DialogTitle>
              <DialogDescription>
                Recharge your KOR Coins to participate in trading and
                competitions.
              </DialogDescription>
            </DialogHeader>
            <Separator className="my-3" />
            <div className="space-y-4">
              <div className="space-y-1">
                <Label
                  htmlFor="kor-coins-amount"
                  className="font-semibold text-sm text-muted-foreground"
                >
                  Amount of KOR Coins
                </Label>
                <Input
                  id="kor-coins-amount"
                  type="number"
                  placeholder="Enter amount..."
                  value={korCoinsAmount}
                  onChange={(e) => setKorCoinsAmount(e.target.value)}
                  className={cn(
                    "w-full no-spinner h-10 border border-border bg-muted/60 focus:bg-background shadow-sm focus:shadow-md transition-all text-base"
                  )}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[...Array(9)].map((_, i) => {
                  const value = (i + 1) * 10000;
                  const isSelected = Number(korCoinsAmount) === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setKorCoinsAmount(String(value))}
                      className={cn(
                        "py-2 text-sm h-10 font-medium border transition-colors rounded-md cursor-pointer",
                        isSelected
                          ? "bg-yellow-400/90 border-yellow-500 text-black shadow-sm"
                          : "bg-background border-border text-foreground hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                      )}
                      style={{ minWidth: 0 }}
                    >
                      {value.toLocaleString()}
                    </button>
                  );
                })}
              </div>
              {/* Nicer Summary Section */}
              <div>
                <div className="rounded-xl bg-muted/60 border border-border p-3 flex flex-col gap-1.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">
                      Deposit Amount (incl. VAT)
                    </span>
                    <span className="flex flex-col items-end text-right min-w-[100px]">
                      <span className="text-lg font-bold text-primary tabular-nums">
                        {korCoinsAmount && !isNaN(Number(korCoinsAmount))
                          ? (Number(korCoinsAmount) * 1.1).toLocaleString()
                          : "-"}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground ml-1">
                        KOR Coins
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      (10% VAT included
                      {korCoinsAmount &&
                      !isNaN(Number(korCoinsAmount)) &&
                      Number(korCoinsAmount) > 0
                        ? `, +${Math.round(
                            Number(korCoinsAmount) * 0.1
                          ).toLocaleString()} KOR Coins`
                        : ""}
                      )
                    </span>
                    <span className="min-w-[100px]" />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground font-medium">
                      Cash to be Charged
                    </span>
                    <span className="flex flex-col items-end text-right min-w-[100px]">
                      <span className="text-base font-semibold tabular-nums">
                        {korCoinsAmount && !isNaN(Number(korCoinsAmount))
                          ? Number(korCoinsAmount).toLocaleString()
                          : "-"}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground ml-1">
                        KOR Coins
                      </span>
                    </span>
                  </div>
                  <div className="my-2 border-t border-dashed border-border" />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground font-medium">
                      Bank Info
                    </span>
                    <span className="font-medium text-sm tracking-wide">
                      Hana Bank{" "}
                      <span className="font-mono">830501-04-245285</span> Kornet
                      Co., Ltd.
                    </span>
                  </div>
                </div>
              </div>
              {/* Depositor's Name and Mobile Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <div className="space-y-1">
                  <Label
                    htmlFor="depositor-name"
                    className="font-semibold text-sm"
                  >
                    Depositor&apos;s Name{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="depositor-name"
                    type="text"
                    placeholder="Enter depositor's name"
                    required
                    className={cn("w-full h-10")}
                  />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor="mobile-number"
                    className="font-semibold text-sm"
                  >
                    Mobile Number{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="mobile-number"
                    type="tel"
                    placeholder="Enter mobile number"
                    className={cn("w-full h-10")}
                  />
                </div>
              </div>
              {/* Caution Section Placeholder */}
              <div className="mt-2">
                <p className="text-xs text-red-500 font-medium text-center">
                  No refunds after deposit is processed.
                </p>
              </div>
            </div>
          </div>
          {/* Action Button OUTSIDE scrollable area */}
          <div className="px-6 pb-4 pt-2 bg-background/95 border-t border-border">
            <Button
              type="submit"
              className={cn(
                "w-full h-10 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-lg py-2.5 text-base transition-colors shadow-sm"
              )}
            >
              Recharge Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
