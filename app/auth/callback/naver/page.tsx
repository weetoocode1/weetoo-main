"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

function NaverCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth.naver");
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
        toast.error(t("toast.invalidStateOrCode"));
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
        toast.error(tokenData.error || t("toast.naverFailed"));
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
        toast.error(naverUserData.error || t("toast.naverFailed"));
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
        toast.error(error.message || t("toast.supabaseFailed"));
        return;
      }

      setStatus("success");
      toast.success(t("toast.success"));
      router.push("/");
    }

    handleNaverCallback();
  }, [router, searchParams]);

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center">
      {status === "loading" && <div>{t("status.loading")}</div>}
      {status === "error" && (
        <div className="text-red-600">{t("status.error")}</div>
      )}
      {status === "success" && (
        <div className="text-green-600">{t("status.success")}</div>
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
