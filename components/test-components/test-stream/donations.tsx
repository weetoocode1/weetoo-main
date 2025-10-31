"use client";

import { useEffect, useMemo, useRef, useState } from "react";
// Donate UI removed in stream panel
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";

interface DonationRow {
  id: string;
  user_id: string;
  amount: number;
  created_at: string;
  message?: string | null;
  users: {
    nickname?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  } | null;
}

export function Donations({
  roomId,
  creatorId,
  startedAt,
}: {
  roomId?: string;
  creatorId?: string;
  startedAt?: string | null;
}) {
  const supabase = useRef(createClient());
  const [, setUserId] = useState<string | null>(null);
  const [, setIsHost] = useState(false);
  const [donations, setDonations] = useState<DonationRow[]>([]);
  // donate UI not included here

  // Auth and role
  useEffect(() => {
    supabase.current.auth.getUser().then(({ data }) => {
      const uid = data?.user?.id || null;
      setUserId(uid);
      setIsHost(!!uid && uid === creatorId);
    });
  }, [creatorId]);

  // Fetch donations for this room
  useEffect(() => {
    if (!roomId) return;
    supabase.current
      .from("trading_room_donations")
      .select("*, users(nickname, first_name, last_name, email)")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setDonations((data as DonationRow[]) || []));
  }, [roomId]);

  // Realtime updates
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase.current
      .channel("room-donations-panel-" + roomId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trading_room_donations",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const { id, amount, created_at, user_id, message } =
            payload.new as DonationRow;
          let userInfo: DonationRow["users"] = null;
          try {
            const { data } = await supabase.current
              .from("users")
              .select("nickname, first_name, last_name, email")
              .eq("id", user_id)
              .single();
            userInfo = data as DonationRow["users"];
          } catch {}
          setDonations((prev) => [
            { id, amount, created_at, user_id, users: userInfo, message },
            ...prev,
          ]);
        }
      )
      .subscribe();
    return () => {
      supabase.current.removeChannel(channel);
    };
  }, [roomId]);

  const totalAllTime = useMemo(
    () => donations.reduce((s, d) => s + (d.amount || 0), 0),
    [donations]
  );
  const totalThisStream = useMemo(() => {
    if (!startedAt) return 0;
    const started = new Date(startedAt).getTime();
    return donations
      .filter((d) => new Date(d.created_at).getTime() >= started)
      .reduce((s, d) => s + d.amount, 0);
  }, [donations, startedAt]);

  const displayName = (u: DonationRow["users"], uid: string) => {
    if (!u) return uid.slice(0, 6) + "…";
    const nickname = u.nickname?.trim();
    const full = `${u.first_name || ""} ${u.last_name || ""}`.trim();
    return nickname || full || u.email || uid;
  };

  // no donation handler here
  const getDonationTierClasses = (amount: number) => {
    const tiers = [
      {
        min: 5000,
        badge: "bg-fuchsia-600 text-white",
        chip: "bg-fuchsia-500/10",
        accent: "bg-fuchsia-600",
      },
      {
        min: 2000,
        badge: "bg-pink-600 text-white",
        chip: "bg-pink-500/10",
        accent: "bg-pink-600",
      },
      {
        min: 1000,
        badge: "bg-red-600 text-white",
        chip: "bg-red-500/10",
        accent: "bg-red-600",
      },
      {
        min: 500,
        badge: "bg-orange-600 text-white",
        chip: "bg-orange-500/10",
        accent: "bg-orange-600",
      },
      {
        min: 200,
        badge: "bg-amber-500 text-black",
        chip: "bg-amber-400/15",
        accent: "bg-amber-500",
      },
      {
        min: 100,
        badge: "bg-emerald-600 text-white",
        chip: "bg-emerald-500/10",
        accent: "bg-emerald-600",
      },
    ];
    const matched = tiers.find((t) => amount >= t.min);
    return (
      matched || {
        badge: "bg-sky-600 text-white",
        chip: "bg-sky-500/10 text-sky-400",
        accent: "bg-sky-600",
      }
    );
  };

  return (
    <div className="p-4 w-full">
      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="border border-border p-3 bg-card/50">
          <div className="text-xs text-muted-foreground">This Stream</div>
          <div className="text-2xl font-semibold mt-1">
            {totalThisStream.toLocaleString()} KOR
          </div>
        </div>
        <div className="border border-border p-3 bg-card/50">
          <div className="text-xs text-muted-foreground">All-time</div>
          <div className="text-2xl font-semibold mt-1">
            {totalAllTime.toLocaleString()} KOR
          </div>
        </div>
      </div>

      {/* Donate box intentionally omitted (use room dialog) */}

      {/* List for host (and viewers) */}
      <div className="border border-border bg-card/50 rounded-md">
        <div className="text-sm p-3 border-b border-border">
          Recent donations
        </div>
        <ScrollArea className="h-80 w-full scrollbar-none px-2 py-2">
          {donations.length === 0 ? (
            <div className="text-xs text-muted-foreground p-6 text-center">
              No donations yet
            </div>
          ) : (
            <ul>
              {donations.map((d, idx) => {
                const cls = getDonationTierClasses(d.amount);
                const name = displayName(d.users, d.user_id);
                const initials =
                  name
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((s) => s[0]?.toUpperCase())
                    .join("") || name.slice(0, 2).toUpperCase();
                return (
                  <li key={d.id}>
                    <div
                      className={`relative overflow-hidden rounded-md border border-border bg-card/60 shadow-sm hover:shadow transition ${cls.chip}`}
                    >
                      <div
                        className={`absolute inset-y-0 left-0 w-1 ${cls.accent}`}
                      />
                      <div className="flex items-start justify-between gap-3 p-4">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div
                            className={`h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${cls.badge}`}
                          >
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {name}
                              </span>
                              <span className="text-[10px] text-muted-foreground/80">
                                {new Date(d.created_at).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-sm text-foreground/90 mt-1 leading-5 line-clamp-3">
                              {d.message && d.message.trim().length > 0
                                ? d.message
                                : "No message"}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`font-semibold text-xs whitespace-nowrap px-2 py-1 rounded-md ${cls.badge}`}
                        >
                          +{d.amount.toLocaleString()} KOR
                        </div>
                      </div>
                    </div>
                    {idx !== donations.length - 1 && (
                      <div className="border-t border-border mx-3" />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
