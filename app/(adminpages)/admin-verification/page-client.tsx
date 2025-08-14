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
        toast.success("Already verified! Redirecting to admin dashboard...");
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
        toast.success("OTP sent to your email successfully!");
      } else {
        toast.error(data.error || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast.error("Failed to send OTP. Please try again.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error("Please enter a 6-digit OTP code");
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
        toast.success("OTP verified successfully!");
        // Redirect to admin dashboard
        router.push("/admin");
      } else {
        toast.error(data.error || "Invalid OTP code");
        setOtp("");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast.error("Failed to verify OTP. Please try again.");
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
            <CardTitle className="text-xl">Admin Verification</CardTitle>
            <p className="text-sm text-muted-foreground">
              {otpSent
                ? "Enter the verification code sent to your email"
                : "Click the button below to receive a verification code"}
            </p>
            {otpSent && computed?.email && (
              <p className="text-xs text-muted-foreground">
                Sent to:{" "}
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
                  Sending OTP...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Verification Code
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
                    Code expires in:{" "}
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
                      Verifying...
                    </>
                  ) : (
                    "Verify & Access Dashboard"
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
                      Sending...
                    </>
                  ) : (
                    "Resend Code"
                  )}
                </Button>
              </div>

              <div className="text-center space-y-1">
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code sent to your email
                </p>
                <p className="text-xs text-muted-foreground/70">
                  The code is valid for 24 hours
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
