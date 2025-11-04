"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Donation } from "@/components/room/donation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/client";
import {
  Crown,
  MessageSquareIcon,
  MoreVertical,
  MoreVerticalIcon,
  SendHorizontalIcon,
  Trash2Icon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

// ===== DONATION RENDERING HELPERS =====
type DonationTierClasses = {
  badge: string;
  chip: string;
  accent: string;
};

const getDonationTierClasses = (amount: number): DonationTierClasses => {
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

type ChatUser = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
};

type ChatMessage = {
  id: string;
  room_id: string;
  user_id: string;
  message: string;
  created_at: string;
  user?: ChatUser | null;
  // Donation-specific (optional)
  donationAmount?: number;
  donationMessage?: string | null;
};

export function StreamChat({
  roomId: roomIdProp,
  showDonation,
  disablePopout = false,
}: {
  roomId?: string;
  showDonation?: boolean;
  disablePopout?: boolean;
}) {
  const t = useTranslations("stream.chat");
  const locale = useLocale();
  const [message, setMessage] = useState("");
  const [isPoppedOut, setIsPoppedOut] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const monitorRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Resolve room id: prefer prop, else infer from URL /trading-room/{id}/...
  const roomId = useMemo(() => {
    if (roomIdProp) return roomIdProp;
    try {
      const match = window.location.pathname.match(/\/trading-room\/([^/]+)/);
      return match?.[1] || "";
    } catch {
      return "";
    }
  }, [roomIdProp]);

  const supabase = useRef(createClient());
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const optimisticMessageIdsRef = useRef<Set<string>>(new Set());

  const [isThisWindowPopout, setIsThisWindowPopout] = useState(false);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setIsThisWindowPopout(Boolean(sp.get("is_popout")));
  }, []);

  // Auth
  useEffect(() => {
    supabase.current.auth.getUser().then(async ({ data }) => {
      setUserId(data.user?.id ?? null);
      if (data.user?.id) {
        const { data: userData } = await supabase.current
          .from("users")
          .select("role")
          .eq("id", data.user.id)
          .single();
        setUserRole(userData?.role || null);
      }
    });
  }, []);

  // Initial load
  useEffect(() => {
    if (!roomId) return;
    // Clear optimistic message IDs when room changes
    optimisticMessageIdsRef.current.clear();
    // fetch creator id once for host highlighting
    (async () => {
      try {
        const { data } = await supabase.current
          .from("trading_rooms")
          .select("creator_id")
          .eq("id", roomId)
          .single();
        setCreatorId((data as { creator_id?: string })?.creator_id || null);
      } catch {}
    })();
    const fetchMessages = async () => {
      // Regular chat messages
      const { data: chatData, error: chatError } = await supabase.current
        .from("trading_room_messages")
        .select(
          "id, room_id, user_id, message, created_at, user:users!trading_room_messages_user_id_fkey(id, first_name, last_name, avatar_url)"
        )
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

      if (chatError) {
        console.error("chat fetch error", chatError);
      }

      // Donation entries (hydrate into chat list so they persist after refresh)
      const { data: donationData, error: donationError } =
        await supabase.current
          .from("trading_room_donations")
          .select(
            "id, room_id, user_id, amount, message, created_at, user:users(id, first_name, last_name, avatar_url)"
          )
          .eq("room_id", roomId)
          .order("created_at", { ascending: true });
      if (donationError) {
        console.error("donation fetch error", donationError);
      }

      const baseMessages: ChatMessage[] =
        (chatData as unknown as ChatMessage[]) || [];
      type DonationRow = {
        id: string;
        room_id: string;
        user_id: string;
        amount: number;
        created_at: string;
        message?: string | null;
        user?: ChatUser | null;
      };
      const donationRows: DonationRow[] =
        (donationData as unknown as DonationRow[]) || [];
      const donationMessages: ChatMessage[] = donationRows.map((d) => ({
        id: `donation-${d.id}`,
        room_id: d.room_id,
        user_id: d.user_id,
        message: "",
        created_at: d.created_at,
        user: d.user ?? null,
        donationAmount: d.amount,
        donationMessage: d.message ?? null,
      }));

      const merged = [...baseMessages, ...donationMessages].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      setMessages(merged);
    };
    fetchMessages();
  }, [roomId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // UI helpers
  const formatTime = useCallback((iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }, []);

  const handleDeleteMessage = useCallback(
    async (messageId: string, messageUserId: string) => {
      if (!userId || !messageId) return;

      const isMessageOwner = userId === messageUserId;
      const isHost = userId === creatorId;
      const isAdmin = userRole === "admin";
      const isSuperAdmin = userRole === "super_admin";

      const canDelete = isSuperAdmin || isAdmin || isHost || isMessageOwner;

      if (!canDelete) return;

      try {
        const deletedByRole = isHost
          ? "HOST"
          : isSuperAdmin
          ? "SUPER_ADMIN"
          : isAdmin
          ? "ADMIN"
          : "USER";

        const { error } = await supabase.current
          .from("trading_room_messages")
          .update({
            message: `[DELETED_BY_${deletedByRole}]`,
          })
          .eq("id", messageId);

        if (error) {
          console.error("Error deleting message:", error);
          return;
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, message: `[DELETED_BY_${deletedByRole}]` }
              : msg
          )
        );
      } catch (error) {
        console.error("Error deleting message:", error);
      }
    },
    [userId, creatorId, userRole]
  );

  const MessageList = useMemo(
    () => (
      <div className="px-3 py-2 space-y-2">
        {messages.map((m) => {
          const isDonation =
            typeof m.donationAmount === "number" && m.donationAmount! > 0;
          const fullName = m.user
            ? `${m.user.first_name || ""} ${m.user.last_name || ""}`.trim()
            : "";
          const name = fullName || t("labels.user");
          const initials = fullName
            ? fullName
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((s) => s[0]?.toUpperCase())
                .join("") || name.slice(0, 2).toUpperCase()
            : name.slice(0, 1).toUpperCase();
          const isHost = creatorId && m.user_id === creatorId;
          const isMessageOwner = userId === m.user_id;
          const isUserAdmin =
            userRole === "admin" || userRole === "super_admin";
          const canDelete = isUserAdmin || isHost || isMessageOwner;
          const isDeleted = m.message?.includes("[DELETED_BY_");
          // Donation card rendering
          if (isDonation) {
            const cls = getDonationTierClasses(m.donationAmount || 0);
            return (
              <div
                key={m.id}
                className={`relative overflow-hidden rounded-md border border-border bg-card/60 ${cls.chip}`}
              >
                <div
                  className={`absolute inset-y-0 left-0 w-1 ${cls.accent}`}
                />
                <div className="flex items-center justify-between gap-3 p-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${cls.badge}`}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {name}
                      </div>
                      {m.donationMessage &&
                        m.donationMessage.trim().length > 0 && (
                          <div className="text-sm text-foreground/90 mt-1 leading-5 break-words">
                            {m.donationMessage}
                          </div>
                        )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div
                      className={`font-semibold text-xs whitespace-nowrap px-2 py-1 rounded-md ${cls.badge}`}
                    >
                      +{(m.donationAmount || 0).toLocaleString()} KOR
                    </div>
                    <div className="text-[10px] text-muted-foreground/80">
                      {formatTime(m.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            );
          }
          return (
            <div
              key={m.id}
              className={`group flex items-start gap-2.5 px-2 py-1.5 rounded-md transition-colors ${
                isHost ? "bg-amber-500/10" : "hover:bg-muted/40"
              }`}
            >
              <Avatar
                className={`h-7 w-7 shrink-0 ${
                  isHost
                    ? "ring-2 ring-amber-500 ring-offset-1 ring-offset-background"
                    : ""
                }`}
              >
                <AvatarImage src={m.user?.avatar_url || undefined} alt={name} />
                <AvatarFallback
                  className={`text-xs font-semibold ${
                    isHost
                      ? "bg-linear-to-br from-amber-400 to-amber-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`text-sm font-semibold truncate ${
                      isHost ? "text-amber-500" : "text-foreground"
                    }`}
                  >
                    {name}
                  </span>
                  {isHost && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center">
                          <Crown className="h-3.5 w-3.5 text-amber-500" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t("labels.streamHost")}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <span className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
                    {formatTime(m.created_at)}
                    {canDelete && !isDeleted && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                          >
                            <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32">
                          <DropdownMenuItem
                            className="text-xs py-2 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20"
                            onClick={() => handleDeleteMessage(m.id, m.user_id)}
                          >
                            <Trash2Icon className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              {t("menu.delete")}
                            </span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </span>
                </div>
                <div
                  className={`text-sm leading-5 wrap-break-word whitespace-pre-wrap ${
                    isHost
                      ? "text-foreground font-medium"
                      : "text-foreground/90"
                  }`}
                >
                  {m.message?.includes("[DELETED_BY_") ? (
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground/70 italic">
                      <MessageSquareIcon className="h-3.5 w-3.5" />
                      {m.message?.includes("[DELETED_BY_HOST]")
                        ? t("deleted.byHost")
                        : m.message?.includes("[DELETED_BY_SUPER_ADMIN]")
                        ? t("deleted.bySuperAdmin")
                        : m.message?.includes("[DELETED_BY_ADMIN]")
                        ? t("deleted.byAdmin")
                        : t("deleted.generic")}
                    </span>
                  ) : (
                    m.message
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    ),
    [messages, creatorId, userId, userRole, formatTime, handleDeleteMessage]
  );

  // Realtime subscription
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase.current
      .channel(`stream-room-messages-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trading_room_messages",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const msg = payload.new as ChatMessage;

          // Skip if this message was already added optimistically
          if (optimisticMessageIdsRef.current.has(msg.id)) {
            optimisticMessageIdsRef.current.delete(msg.id);
            // Still fetch user data to update the optimistic message
            try {
              const { data: u } = await supabase.current
                .from("users")
                .select("id, first_name, last_name, avatar_url")
                .eq("id", msg.user_id)
                .single();
              const user = (u as unknown as ChatUser) || null;
              setMessages((prev) =>
                prev.map((m) => (m.id === msg.id ? { ...m, user } : m))
              );
            } catch {}
            return;
          }

          // Check if message already exists to prevent duplicates
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) {
              return prev;
            }
            return [...prev, msg];
          });

          // Fetch user data asynchronously and update message
          try {
            const { data: u } = await supabase.current
              .from("users")
              .select("id, first_name, last_name, avatar_url")
              .eq("id", msg.user_id)
              .single();
            const user = (u as unknown as ChatUser) || null;

            setMessages((prev) =>
              prev.map((m) => (m.id === msg.id ? { ...m, user } : m))
            );
          } catch {}
        }
      )
      .subscribe();
    return () => {
      supabase.current.removeChannel(channel);
    };
  }, [roomId]);

  // Realtime donation highlights
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase.current
      .channel(`stream-room-donations-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trading_room_donations",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const d = payload.new as {
            id: string;
            user_id: string;
            amount: number;
            created_at: string;
            message?: string | null;
          };
          try {
            const { data: u } = await supabase.current
              .from("users")
              .select("id, first_name, last_name, avatar_url")
              .eq("id", d.user_id)
              .single();
            const user = (u as unknown as ChatUser) || null;
            setMessages((prev) => [
              ...prev,
              {
                id: `donation-${d.id}`,
                room_id: roomId,
                user_id: d.user_id,
                message: "",
                created_at: d.created_at,
                user,
                donationAmount: d.amount,
                donationMessage: d.message ?? null,
              },
            ]);
          } catch {
            setMessages((prev) => [
              ...prev,
              {
                id: `donation-${d.id}`,
                room_id: roomId,
                user_id: d.user_id,
                message: "",
                created_at: d.created_at,
                donationAmount: d.amount,
                donationMessage: d.message ?? null,
              },
            ]);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.current.removeChannel(channel);
    };
  }, [roomId]);

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = message.trim();
      if (!trimmed) return;
      (async () => {
        try {
          if (!roomId || !userId) return;
          const response = await fetch(`/api/trading-room/${roomId}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: trimmed }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to send message");
          }

          const data = await response.json();

          let currentUser: ChatUser | null = null;
          try {
            const { data: u } = await supabase.current
              .from("users")
              .select("id, first_name, last_name, avatar_url")
              .eq("id", userId)
              .single();
            currentUser = (u as unknown as ChatUser) || null;
          } catch {}

          // Mark this message ID as optimistically added
          optimisticMessageIdsRef.current.add(data.id);

          setMessage("");
          setMessages((prev) => {
            // Double-check it doesn't already exist
            if (prev.some((m) => m.id === data.id)) {
              return prev;
            }
            return [
              ...prev,
              {
                id: data.id,
                room_id: roomId,
                user_id: userId,
                message: trimmed,
                created_at: data.created_at,
                user: currentUser,
              },
            ];
          });
        } catch (error) {
          console.error("Failed to send chat message:", error);
          toast.error(
            error instanceof Error ? error.message : "Failed to send message"
          );
        }
      })();
    },
    [message, roomId, userId]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        e.currentTarget.form?.requestSubmit();
      }
    },
    []
  );

  const openPopout = useCallback(() => {
    if (typeof window === "undefined") return;
    // Build a URL that can render chat standalone
    const url = new URL(window.location.href);
    const popoutId =
      window.crypto && "randomUUID" in window.crypto
        ? (window.crypto as Crypto).randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    url.searchParams.set("is_popout", popoutId);
    const w = window.open(
      url.toString(),
      "stream-chat-popout",
      "width=420,height=720,menubar=no,toolbar=no,location=no,status=no"
    );
    if (w) {
      popupRef.current = w;
      setIsPoppedOut(true);
      // Monitor when user closes the popout and auto-restore
      monitorRef.current = window.setInterval(() => {
        if (popupRef.current && popupRef.current.closed) {
          window.clearInterval(monitorRef.current!);
          monitorRef.current = null;
          popupRef.current = null;
          setIsPoppedOut(false);
        }
      }, 800);
    }
  }, []);

  const restoreFromPopout = useCallback(() => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }
    popupRef.current = null;
    if (monitorRef.current) {
      window.clearInterval(monitorRef.current);
      monitorRef.current = null;
    }
    setIsPoppedOut(false);
  }, []);

  // When this window is the popout, always render chat body (no popout controls)
  if (isThisWindowPopout) {
    return (
      <div
        key={locale}
        className="w-full h-full border border-border flex flex-col bg-card text-card-foreground min-w-0 overflow-hidden"
      >
        <div className="h-12 border-b border-border flex items-center justify-between px-3">
          <span>{t("titlePopout")}</span>
        </div>
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto">
          {MessageList}
        </div>
        <div className="border-t border-border p-3">
          <form
            className="mx-auto flex w-full items-end gap-2 min-w-0"
            onSubmit={handleSubmit}
          >
            <Label htmlFor="chat" className="sr-only">
              {t("form.messageLabel")}
            </Label>
            <Textarea
              id="chat"
              placeholder={t("form.placeholder")}
              className="flex-1 w-full max-h-24 min-h-0 resize-none py-1.75 rounded-none break-all whitespace-pre-wrap overflow-x-hidden"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button type="submit" className="rounded-none">
              <SendHorizontalIcon className="h-4 w-4" />
            </Button>
          </form>
          {showDonation && roomId && (
            <div className="mt-2">
              <Donation roomId={roomId} creatorId={creatorId || ""} />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      key={locale}
      className="w-[425px] h-full border border-border flex flex-col bg-card text-card-foreground min-w-0 overflow-hidden"
    >
      <div className="h-12 border-b border-border flex items-center justify-between px-3">
        <span>{t("title")}</span>
        {!disablePopout && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer h-7 w-7 rounded-none"
              >
                <MoreVerticalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="end" className="w-48">
              {!isPoppedOut && (
                <DropdownMenuItem
                  className="cursor-pointer h-10"
                  onClick={openPopout}
                >
                  <MessageSquareIcon className="h-4 w-4" />
                  {t("menu.popup")}
                </DropdownMenuItem>
              )}
              {isPoppedOut && (
                <DropdownMenuItem
                  className="cursor-pointer h-10"
                  onClick={restoreFromPopout}
                >
                  <MessageSquareIcon className="h-4 w-4" />
                  {t("menu.restore")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      {!isPoppedOut ? (
        <>
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto">
            {MessageList}
          </div>
          <div className="border-t border-border p-3">
            <form
              className="mx-auto flex w-full items-end gap-2 min-w-0"
              onSubmit={handleSubmit}
            >
              <Label htmlFor="chat" className="sr-only">
                {t("form.messageLabel")}
              </Label>
              <Textarea
                id="chat"
                placeholder={t("form.placeholder")}
                className="flex-1 w-full max-h-24 min-h-0 resize-none py-1.75 rounded-none scrollbar-none break-all whitespace-pre-wrap overflow-x-hidden"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <Button type="submit" className="rounded-none">
                <SendHorizontalIcon className="h-4 w-4" />
              </Button>
            </form>
            {showDonation && roomId && (
              <div className="mt-2">
                <Donation
                  roomId={roomId}
                  creatorId={creatorId || ""}
                  fullWidth
                />
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 grid place-content-center text-muted-foreground">
          <div className="text-center space-y-2">
            <div className="text-sm">{t("poppedOut.title")}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={restoreFromPopout}
              className="rounded-none"
            >
              {t("poppedOut.restore")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
