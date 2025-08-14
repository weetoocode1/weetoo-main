"use client";

import { IdentityVerificationButton } from "@/components/identity-verification-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { BadgeCheckIcon } from "lucide-react";
import { toast } from "sonner";

export function Profile() {
  const { user, loading } = useAuth();

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="border-b flex flex-shrink-0">
          <div className="p-4 border-r space-y-2">
            {/* Avatar image or fallback */}
            {loading ? (
              <Skeleton className="h-[250px] w-[250px] border" />
            ) : (
              <Avatar className="h-[250px] w-[250px] border rounded-none">
                <AvatarImage
                  src={user?.avatar_url || ""}
                  alt="Profile Picture"
                  className="rounded-none"
                />
                <AvatarFallback className="text-5xl font-bold text-gray-400 rounded-none">
                  {(user?.first_name?.slice(0, 2) || "?").toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}

            {/* <Button variant="outline" className="rounded-none w-full">
              Upload Image
            </Button> */}

            {/* Verification Status */}
            {!loading && (
              <>
                {/* Verified Badge */}
                {user?.identity_verified && (
                  <div className="flex items-center justify-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-none">
                    <BadgeCheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      Identity Verified
                    </span>
                  </div>
                )}

                {/* Verification Needed Badge */}
                {!user?.identity_verified && (
                  <div className="w-full">
                    <IdentityVerificationButton
                      isFormValid={true} // Always true in profile context
                      mobileNumber={user?.mobile_number || ""}
                      text="Verification Needed"
                      className="flex items-center justify-center gap-2 h-10 rounded-none text-primary border border-destructive bg-destructive hover:bg-destructive/90"
                      onVerificationSuccess={(verificationData, userData) => {
                        toast.success(
                          "Identity verification completed successfully!"
                        );
                        window.location.reload();
                      }}
                      onVerificationFailure={() => {
                        toast.error(
                          "Identity verification failed. Please try again."
                        );
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
          <div className="p-4 w-full space-y-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 w-full gap-2">
              <div className="space-y-2">
                <Label htmlFor="first-name" className="text-sm font-semibold">
                  First Name
                </Label>
                {loading ? (
                  <Skeleton className="rounded-none h-10 w-full" />
                ) : (
                  <Input
                    placeholder="First Name"
                    className="rounded-none h-10"
                    value={user?.first_name || ""}
                    readOnly
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="last-name" className="text-sm font-semibold">
                  Last Name
                </Label>
                {loading ? (
                  <Skeleton className="rounded-none h-10 w-full" />
                ) : (
                  <Input
                    placeholder="Last Name"
                    className="rounded-none h-10"
                    value={user?.last_name || ""}
                    readOnly
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nickname" className="text-sm font-semibold">
                  Nickname
                </Label>
                {loading ? (
                  <Skeleton className="rounded-none h-10 w-full" />
                ) : (
                  <Input
                    placeholder="Nickname"
                    className="rounded-none h-10"
                    value={user?.nickname || ""}
                    readOnly
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">
                  Email
                </Label>
                {loading ? (
                  <Skeleton className="rounded-none h-10 w-full" />
                ) : (
                  <Input
                    placeholder="Email"
                    className="rounded-none h-10"
                    value={user?.email || ""}
                    readOnly
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold">
                  Phone
                </Label>
                {loading ? (
                  <Skeleton className="rounded-none h-10 w-full" />
                ) : (
                  <Input
                    type="tel"
                    placeholder="Phone Number"
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
