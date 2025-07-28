import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const QUICK_AMOUNTS = [100, 500, 1000, 5000, 10000];

interface Donation {
  id: string;
  user_id: string;
  amount: number;
  created_at: string;
  users: {
    nickname?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

export function Donation({
  roomId,
  creatorId,
}: {
  roomId: string;
  creatorId: string;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [korCoins, setKorCoins] = useState<number | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = useRef(createClient());

  useEffect(() => {
    supabase.current.auth.getUser().then(({ data }) => {
      const uid = data?.user?.id || null;
      setUserId(uid);
      setIsHost(uid === creatorId);
      if (uid) {
        supabase.current
          .from("users")
          .select("kor_coins")
          .eq("id", uid)
          .single()
          .then(({ data }) => setKorCoins(data?.kor_coins ?? 0));
      }
    });
  }, [creatorId]);

  useEffect(() => {
    if (isHost && roomId) {
      supabase.current
        .from("trading_room_donations")
        .select("*, users(nickname, first_name, last_name, email)")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .then(({ data }) => setDonations(data || []));
    }
  }, [isHost, roomId, open]);

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase.current
      .channel("room-donations-" + roomId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trading_room_donations",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const { user_id, amount, id, created_at } = payload.new;
          // Always fetch user info before updating the list or showing toast
          let userInfo = {
            nickname: undefined,
            first_name: undefined,
            last_name: undefined,
            email: undefined,
          };
          let name = "Someone";
          try {
            const { data } = await supabase.current
              .from("users")
              .select("nickname, first_name, last_name, email")
              .eq("id", user_id)
              .single();
            if (data) {
              userInfo = data;
              name =
                data.nickname ||
                (
                  (data.first_name || "") +
                  " " +
                  (data.last_name || "")
                ).trim() ||
                data.email ||
                user_id;
              name = name.trim();
            }
          } catch {}
          toast.success(`${name} donated ${amount} kor-coins!`);

          if (isHost) {
            setDonations((prev) => [
              {
                id,
                user_id,
                amount,
                created_at,
                users: userInfo,
              },
              ...prev,
            ]);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.current.removeChannel(channel);
    };
  }, [roomId, isHost]);

  useEffect(() => {
    if (open && userId) {
      supabase.current
        .from("users")
        .select("kor_coins")
        .eq("id", userId)
        .single()
        .then(({ data }) => setKorCoins(data?.kor_coins ?? 0));
    }
  }, [open, userId]);

  const handleDonate = async () => {
    if (!amount || amount <= 0) return toast.error("Enter a valid amount");
    if (korCoins !== null && amount > korCoins)
      return toast.error("Insufficient kor-coins");
    setLoading(true);
    const res = await fetch("/api/rooms/donate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, amount }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Donation successful!");
      setAmount(0);
      setOpen(false);
      // Refetch user's kor-coins after donation
      if (userId) {
        const { data } = await supabase.current
          .from("users")
          .select("kor_coins")
          .eq("id", userId)
          .single();
        setKorCoins(data?.kor_coins ?? 0);
      }
      router.refresh();
    } else {
      const { error } = await res.json();
      toast.error(error || "Donation failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Donation</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Donation</DialogTitle>
        {isHost ? (
          <div className="space-y-2">
            <DialogDescription>
              Donations received in this room:
            </DialogDescription>
            <div className="border rounded p-2 bg-card/80">
              <ScrollArea className="h-60 w-full pr-2">
                {donations.length === 0 ? (
                  <div className="text-muted-foreground text-sm text-center py-8">
                    No donations yet.
                  </div>
                ) : (
                  <ul>
                    {donations.map((d, idx) => {
                      let name =
                        d.users?.nickname ||
                        (
                          (d.users?.first_name || "") +
                          " " +
                          (d.users?.last_name || "")
                        ).trim() ||
                        d.users?.email ||
                        d.user_id;
                      name = name.trim();
                      return (
                        <li key={d.id}>
                          <div className="flex items-center justify-between gap-4 py-3 px-1">
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="font-medium text-base text-zinc-900 dark:text-zinc-100 truncate">
                                {name}
                              </span>
                            </div>
                            <div className="flex flex-col items-end min-w-0">
                              <span className="font-bold text-base text-amber-600 flex items-center gap-1">
                                +{d.amount}
                                <Icons.coins className="w-4 h-4 text-amber-400" />
                                <span className="text-xs font-semibold ml-1">
                                  KOR
                                </span>
                              </span>
                              <span className="text-xs text-muted-foreground mt-1 text-right">
                                {new Date(d.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          {idx !== donations.length - 1 && (
                            <div className="border-t border-border mx-1" />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </ScrollArea>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <DialogDescription>
              Support the host by donating kor-coins!
            </DialogDescription>
            <div className="flex flex-col gap-1">
              <Input
                type="number"
                min={1}
                value={amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="Enter amount"
                className="w-full no-spinner"
              />
              <span className="text-xs text-muted-foreground mt-1">
                Your balance:{" "}
                <span className="font-semibold">{korCoins ?? "-"} KOR</span>
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2 w-full">
              {QUICK_AMOUNTS.map((amt) => (
                <Button
                  key={amt}
                  size="sm"
                  variant={amount === amt ? "default" : "outline"}
                  className="w-full"
                  onClick={() => setAmount(amt)}
                >
                  {amt}
                </Button>
              ))}
            </div>
            <DialogFooter>
              <Button
                onClick={handleDonate}
                disabled={
                  loading || !amount || (korCoins !== null && amount > korCoins)
                }
                className="w-full"
              >
                {loading ? "Donating..." : "Donate"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
