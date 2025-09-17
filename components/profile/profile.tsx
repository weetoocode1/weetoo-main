"use client";

import { IdentityVerificationButton } from "@/components/identity-verification-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { BadgeCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export function Profile() {
  const { user, loading } = useAuth();
  const [, setForceUpdate] = useState(false);
  const t = useTranslations("profile");

  // Listen for identity verification completion
  useEffect(() => {
    const handleIdentityVerified = (event: Event) => {
      // Force a re-render to update verification status
      // This will update the user.identity_verified status instantly
      // The useAuth hook will have updated the user data, so we just need to trigger a re-render
      // We can use a state variable to force re-render
      setForceUpdate((prev) => !prev);
    };

    window.addEventListener("identity-verified", handleIdentityVerified);
    return () =>
      window.removeEventListener("identity-verified", handleIdentityVerified);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="border-b flex flex-col lg:flex-row flex-shrink-0">
          {/* Avatar Section - Mobile: Full width, Desktop: Fixed width */}
          <div className="p-4 lg:border-r space-y-2 flex flex-col items-center lg:items-start">
            {/* Avatar image or fallback */}
            {loading ? (
              <Skeleton className="h-[150px] w-[150px] sm:h-[200px] sm:w-[200px] lg:h-[250px] lg:w-[250px] border" />
            ) : (
              <Avatar className="h-[150px] w-[150px] sm:h-[200px] sm:w-[200px] lg:h-[250px] lg:w-[250px] border rounded-none">
                <AvatarImage
                  src={user?.avatar_url || ""}
                  alt={t("form.profilePictureAlt")}
                  className="rounded-none"
                />
                <AvatarFallback className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-400 rounded-none">
                  {(user?.first_name?.slice(0, 2) || "?").toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}

            {/* Verification Status */}
            {!loading && (
              <>
                {/* Verified Badge */}
                {user?.identity_verified && (
                  <div className="flex items-center justify-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-none w-full">
                    <BadgeCheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      {t("form.identityVerified")}
                    </span>
                  </div>
                )}

                {/* Verification Needed Badge */}
                {!user?.identity_verified && (
                  <div className="w-full lg:w-auto">
                    <IdentityVerificationButton
                      isFormValid={true} // Always true in profile context
                      mobileNumber={user?.mobile_number || ""}
                      text={t("form.verificationNeeded")}
                      className="flex items-center justify-center gap-2 h-10 rounded-none text-primary border border-destructive bg-destructive hover:bg-destructive/90 w-full lg:w-auto"
                      onVerificationSuccess={(verificationData, userData) => {
                        toast.success(t("verification.successMessage"));
                        window.location.reload();
                      }}
                      onVerificationFailure={() => {
                        toast.error(t("verification.errorMessage"));
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Form Section - Mobile: Full width, Desktop: Flexible */}
          <div className="p-4 w-full space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 w-full gap-2">
              <div className="space-y-2">
                <Label htmlFor="first-name" className="text-sm font-semibold">
                  {t("form.firstName")}
                </Label>
                {loading ? (
                  <Skeleton className="rounded-none h-10 w-full" />
                ) : (
                  <Input
                    placeholder={t("form.firstNamePlaceholder")}
                    className="rounded-none h-10"
                    value={user?.first_name || ""}
                    readOnly
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last-name" className="text-sm font-semibold">
                  {t("form.lastName")}
                </Label>
                {loading ? (
                  <Skeleton className="rounded-none h-10 w-full" />
                ) : (
                  <Input
                    placeholder={t("form.lastNamePlaceholder")}
                    className="rounded-none h-10"
                    value={user?.last_name || ""}
                    readOnly
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nickname" className="text-sm font-semibold">
                  {t("form.nickname")}
                </Label>
                {loading ? (
                  <Skeleton className="rounded-none h-10 w-full" />
                ) : (
                  <Input
                    placeholder={t("form.nicknamePlaceholder")}
                    className="rounded-none h-10"
                    value={user?.nickname || ""}
                    readOnly
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">
                  {t("form.email")}
                </Label>
                {loading ? (
                  <Skeleton className="rounded-none h-10 w-full" />
                ) : (
                  <Input
                    placeholder={t("form.emailPlaceholder")}
                    className="rounded-none h-10"
                    value={user?.email || ""}
                    readOnly
                  />
                )}
              </div>

              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="phone" className="text-sm font-semibold">
                  {t("form.phone")}
                </Label>
                {loading ? (
                  <Skeleton className="rounded-none h-10 w-full" />
                ) : (
                  <Input
                    type="tel"
                    placeholder={t("form.phonePlaceholder")}
                    className="rounded-none h-10"
                    value={user?.mobile_number || ""}
                    readOnly
                    id="phone"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
