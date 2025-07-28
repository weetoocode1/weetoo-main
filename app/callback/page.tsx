"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Memoized session check function
  const checkSession = useCallback(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session) {
        setStatus("error");
        setErrorMsg(
          error?.message || "No session found. Please try logging in again."
        );
        toast.error(error?.message || "Login failed. Please try again.", {
          position: "top-center",
        });
      } else {
        setStatus("success");
        toast.success("Login successful! Redirecting...", {
          position: "top-center",
        });
        setTimeout(() => {
          router.push("/");
        }, 1500);
      }
    });
  }, [router]);

  // Only check session once on mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center">
      {status === "loading" && (
        <div className="text-lg font-semibold">Checking login status...</div>
      )}
      {status === "success" && (
        <div className="text-green-600 text-lg font-semibold">
          Login successful! Redirecting...
        </div>
      )}
      {status === "error" && (
        <div className="text-red-600 text-lg font-semibold">
          Login failed: {errorMsg}
        </div>
      )}
    </div>
  );
}
