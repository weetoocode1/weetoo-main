"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { ShieldIcon, Mail, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export function AdminVerificationClient() {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpExpiresAt, setOtpExpiresAt] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

  const { user, loading, computed, isAdmin } = useAuth();
  const router = useRouter();
  const redirecting = useRef(false);
  const checkingVerification = useRef(false);
  const t = useTranslations("adminVerification");

  // Check if user is admin and redirect if not, also check verification status
  useEffect(() => {
    if (redirecting.current) return;

    if (!loading) {
      if (!user) {
        redirecting.current = true;
        router.replace("/login?next=/admin-verification");
      } else if (!isAdmin) {
        redirecting.current = true;
        router.replace("/");
      } else {
        // User is admin and authenticated, check verification status
        checkVerificationStatus();
      }
    }
  }, [loading, user, isAdmin, router]);

  const checkVerificationStatus = async () => {
    if (checkingVerification.current) return;
    checkingVerification.current = true;

    try {
      const response = await fetch("/api/admin-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "check-status" }),
      });

      const data = await response.json();

      if (response.ok && data.verified) {
        toast.success(t("toast.alreadyVerified"));
        router.push("/admin");
      }
    } catch (error) {
      console.error("Error checking verification status:", error);
    } finally {
      checkingVerification.current = false;
    }
  };

  // Countdown timer for OTP expiration
  useEffect(() => {
    if (otpExpiresAt && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, otpExpiresAt]);

  // Format countdown display
  const formatCountdown = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const sendOTP = async () => {
    setIsSendingOtp(true);
    try {
      const response = await fetch("/api/admin-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "generate-otp" }),
      });

      const data = await response.json();

      if (response.ok) {
        setOtpSent(true);
        if (data.expiresAt) {
          setOtpExpiresAt(data.expiresAt);
          const timeLeft = Math.max(
            0,
            Math.floor((data.expiresAt - Date.now()) / 1000)
          );
          setCountdown(timeLeft);
        }
        toast.success(t("toast.otpSentSuccess"));
      } else {
        toast.error(data.error || t("toast.otpSentFailed"));
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast.error(t("toast.otpSentError"));
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error(t("toast.invalidOtpLength"));
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/admin-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "verify-otp", otpCode: otp }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(t("toast.otpVerifiedSuccess"));
        // Redirect to admin dashboard
        router.push("/admin");
      } else {
        toast.error(data.error || t("toast.invalidOtpCode"));
        setOtp("");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast.error(t("toast.otpVerifyError"));
    } finally {
      setIsLoading(false);
    }
  };

  const resendOTP = async () => {
    setOtp("");
    setOtpSent(false);
    setOtpExpiresAt(null);
    setCountdown(0);
    await sendOTP();
  };

  // Don't render anything while checking auth or redirecting
  if (loading || !user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5 md:px-0">
      <Card className="w-[400px]">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldIcon className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="space-y-1.5 text-center">
            <CardTitle className="text-xl">{t("title")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {otpSent
                ? t("description.enterCode")
                : t("description.clickToReceive")}
            </p>
            {otpSent && computed?.email && (
              <p className="text-xs text-muted-foreground">
                {t("sentTo")}{" "}
                <span className="font-medium text-foreground">
                  {computed.email}
                </span>
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!otpSent ? (
            <Button
              onClick={sendOTP}
              disabled={isSendingOtp}
              className="w-full"
            >
              {isSendingOtp ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t("buttons.sendingOtp")}
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  {t("buttons.sendVerificationCode")}
                </>
              )}
            </Button>
          ) : (
            <>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => setOtp(value)}
                  disabled={isLoading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {countdown > 0 && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">
                    {t("codeExpiresIn")}{" "}
                    <span className="font-mono font-medium text-foreground">
                      {formatCountdown(countdown)}
                    </span>
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={verifyOTP}
                  disabled={isLoading || otp.length !== 6}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("buttons.verifying")}
                    </>
                  ) : (
                    t("buttons.verifyAndAccess")
                  )}
                </Button>

                <Button
                  onClick={resendOTP}
                  variant="outline"
                  disabled={isSendingOtp || countdown > 0}
                  className="w-full"
                >
                  {isSendingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t("buttons.sending")}
                    </>
                  ) : (
                    t("buttons.resendCode")
                  )}
                </Button>
              </div>

              <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground">
                  {t("instructions.enterSixDigit")}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  {t("instructions.validFor24Hours")}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
