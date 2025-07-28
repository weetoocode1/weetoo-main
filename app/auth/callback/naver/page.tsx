"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

function NaverCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "error" | "success">(
    "loading"
  );

  useEffect(() => {
    async function handleNaverCallback() {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const storedState = localStorage.getItem("naver_oauth_state");

      if (!code || !state || state !== storedState) {
        setStatus("error");
        toast.error("Invalid Naver OAuth state or code.");
        return;
      }

      // Exchange code for Naver access token and profile (server-side)
      const tokenRes = await fetch("/api/naver/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, state }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        setStatus("error");
        toast.error(tokenData.error || "Naver login failed.");
        return;
      }

      // Send Naver user info to /api/naver to create/update Supabase user
      const naverUserRes = await fetch("/api/naver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tokenData),
      });
      const naverUserData = await naverUserRes.json();
      if (!naverUserData.success) {
        setStatus("error");
        toast.error(naverUserData.error || "Naver login failed.");
        return;
      }

      // Sign in with Supabase
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: naverUserData.email,
        password: naverUserData.password,
      });
      if (error) {
        setStatus("error");
        toast.error(error.message || "Supabase login failed.");
        return;
      }

      setStatus("success");
      toast.success("Logged in with Naver!");
      router.push("/");
    }

    handleNaverCallback();
  }, [router, searchParams]);

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center">
      {status === "loading" && <div>Logging in with Naver...</div>}
      {status === "error" && (
        <div className="text-red-600">
          Naver login failed. Please try again.
        </div>
      )}
      {status === "success" && (
        <div className="text-green-600">Login successful! Redirecting...</div>
      )}
    </div>
  );
}

export default function NaverCallback() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NaverCallbackInner />
    </Suspense>
  );
}
