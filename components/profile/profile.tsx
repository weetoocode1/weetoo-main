"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { PhoneInput } from "../ui/phone-input";

interface UserData {
  id: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  email?: string;
  avatar_url?: string;
  level?: number;
  exp?: number;
  kor_coins?: number;
  role?: string;
  mobile_number?: string;
}

export function Profile() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      const sessionId = data.session?.user?.id || null;
      if (!sessionId) {
        if (mounted) setLoading(false);
        return;
      }
      setLoading(true);
      supabase
        .from("users")
        .select(
          "id, first_name, last_name, nickname, email, avatar_url, level, exp, kor_coins, role, mobile_number"
        )
        .eq("id", sessionId)
        .single()
        .then(({ data, error }) => {
          if (mounted) {
            setUser(error ? null : data);
            setPhoneNumber(error ? "" : data?.mobile_number || "");
            setLoading(false);
          }
        });
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="border-b flex flex-shrink-0">
          <div className="p-4 border-r space-y-2">
            {/* Avatar image or fallback */}
            {loading ? (
              <Skeleton className="h-[250px] w-[250px] border" />
            ) : user?.avatar_url && user.avatar_url !== "" ? (
              <Image
                src={user.avatar_url}
                alt="Profile Picture"
                className="object-cover h-[250px] w-[300px] border"
                width={300}
                height={250}
              />
            ) : (
              <div
                id="profile-avatar-fallback"
                className="object-cover h-[250px] w-[300px] border flex items-center justify-center text-5xl font-bold text-gray-400"
                style={{ position: "absolute" }}
              >
                {(user?.first_name?.slice(0, 2) || "?").toUpperCase()}
              </div>
            )}

            <Button variant="outline" className="rounded-none w-full">
              Upload Image
            </Button>
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
                  <PhoneInput
                    value={phoneNumber}
                    onChange={setPhoneNumber}
                    international
                    defaultCountry="KR"
                    className="rounded-none"
                    id="phone"
                    readOnly
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
