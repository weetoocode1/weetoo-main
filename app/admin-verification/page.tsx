"use client";

import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ShieldIcon } from "lucide-react";

export default function AdminVerification() {
  const router = useRouter();
  const [otp, setOtp] = useState("");

  useEffect(() => {
    if (otp.length === 6) {
      router.push("/admin/overview");
    }
  }, [otp, router]);

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
              We&apos;ve sent a verification code to{" "}
              <span className="font-medium text-foreground">
                shadcn@gmail.com
              </span>
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(value) => setOtp(value)}
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

          <div className="text-center space-y-1">
            <p className="text-xs text-muted-foreground">Demo Mode</p>
            <p className="text-xs text-muted-foreground/70">
              Enter any 6-digit code to continue
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
