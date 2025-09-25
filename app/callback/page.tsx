"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export default function AuthCallback() {
  const router = useRouter();
  const t = useTranslations("auth.callback");
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Memoized session check function
  const checkSession = useCallback(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        setStatus("error");
        setErrorMsg(error?.message || t("errors.noUser"));
        toast.error(error?.message || t("toast.failed"), {
          position: "top-center",
        });
      } else {
        setStatus("success");
        toast.success(t("toast.success"), {
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
        <div className="text-lg font-semibold">{t("status.checking")}</div>
      )}
      {status === "success" && (
        <div className="text-green-600 text-lg font-semibold">
          {t("status.success")}
        </div>
      )}
      {status === "error" && (
        <div className="text-red-600 text-lg font-semibold">
          {t("status.error", { message: errorMsg || "" })}
        </div>
      )}
    </div>
  );
}
