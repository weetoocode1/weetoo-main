import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { useOnClickOutside } from "@/hooks/use-click-outside";
import { useRoomParticipant } from "@/hooks/use-room-participant";
import { createClient } from "@/lib/supabase/client";
import { Crown, MessageSquare, MoreVertical, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import useSWR from "swr";
import { v4 as uuidv4 } from "uuid";

interface User {
  id: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  message: string;
  masked_message?: string; // New field for masked text
  created_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string;
  };
  pending?: boolean;
  failed?: boolean;
  deleted?: boolean;
  deleted_by?: string;
  deleted_at?: string;
  deleted_by_role?: "host" | "admin" | "super_admin" | "user";
}

interface ChatProps {
  roomId: string;
  creatorId: string;
}

export function Chat({ roomId, creatorId }: ChatProps) {
  const t = useTranslations("room.chat");
  const safeT = useCallback(
    (key: string, fallback: string) => {
      try {
        return (t as unknown as (k: string) => string)(key);
      } catch {
        return fallback;
      }
    },
    [] // Remove t dependency to prevent re-creation
  );
  const { isAdmin, isSuperAdmin } = useAuth();
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [profanityWarning, setProfanityWarning] = useState<string | null>(null);
  // const [keywordList, setKeywordList] = useState<string[]>([]);
  // Remove hardcoded keywords - let the server handle all masking
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<
    ReturnType<typeof createClient>["channel"]
  > | null>(null);

  // Optimized user fetching with stable reference
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user as unknown as User);
      }
      setUserLoaded(true);
    });
  }, []);

  // Memoize user to prevent unnecessary re-renders
  const stableUser = useMemo(() => user, [user?.id]);

  const {
    isParticipant,
    isLoading: isParticipantLoading,
    error: participantError,
    joinRoom,
  } = useRoomParticipant(roomId, userLoaded ? stableUser : null);

  // Cache for Perspective API results to prevent rate limiting
  const perspectiveCache = useRef<
    Map<
      string,
      {
        result: {
          isProfane: boolean;
          severity: "low" | "medium" | "high";
          maskedText?: string;
        };
        timestamp: number;
      }
    >
  >(new Map());
  const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes - longer cache to reduce API calls
  const lastApiCall = useRef<number>(0);
  const MIN_API_INTERVAL = 50; // Ultra-fast - 50ms between calls

  // Server-backed profanity detection via Perspective API proxy with smart caching
  const detectWithPerspective = useCallback(async (text: string) => {
    const cacheKey = text.toLowerCase().trim();
    const cached = perspectiveCache.current.get(cacheKey);

    // Return cached result if available and not expired
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.result;
    }

    // Advanced fuzzy matching - check words, substrings, and character patterns
    const words = cacheKey.split(/\s+/);
    for (const word of words) {
      if (word.length > 2) {
        // Reduced threshold for more aggressive matching
        // Check exact word match
        const wordCached = perspectiveCache.current.get(word);
        if (
          wordCached &&
          wordCached.result.isProfane &&
          Date.now() - wordCached.timestamp < CACHE_DURATION
        ) {
          const result = {
            isProfane: true,
            severity: wordCached.result.severity,
            maskedText: undefined,
          };
          perspectiveCache.current.set(cacheKey, {
            result,
            timestamp: Date.now(),
          });
          return result;
        }

        // Check character-level patterns for obfuscated words
        if (word.length > 3) {
          // Check 3-character substrings (catches obfuscated patterns)
          for (let i = 0; i <= word.length - 3; i++) {
            const substring = word.substring(i, i + 3);
            const subCached = perspectiveCache.current.get(substring);
            if (
              subCached &&
              subCached.result.isProfane &&
              Date.now() - subCached.timestamp < CACHE_DURATION
            ) {
              const result = {
                isProfane: true,
                severity: subCached.result.severity,
                maskedText: undefined,
              };
              perspectiveCache.current.set(cacheKey, {
                result,
                timestamp: Date.now(),
              });
              return result;
            }
          }

          // Check character frequency patterns (catches repeated chars like "fuuuuck")
          const charPattern = word.replace(/(.)\1+/g, "$1"); // Remove repeated chars
          if (charPattern !== word) {
            const patternCached = perspectiveCache.current.get(charPattern);
            if (
              patternCached &&
              patternCached.result.isProfane &&
              Date.now() - patternCached.timestamp < CACHE_DURATION
            ) {
              const result = {
                isProfane: true,
                severity: patternCached.result.severity,
                maskedText: undefined,
              };
              perspectiveCache.current.set(cacheKey, {
                result,
                timestamp: Date.now(),
              });
              return result;
            }
          }
        }
      }
    }

    try {
      // Rate limiting: ensure minimum interval between API calls
      const now = Date.now();
      const timeSinceLastCall = now - lastApiCall.current;
      if (timeSinceLastCall < MIN_API_INTERVAL) {
        // Wait for the minimum interval
        await new Promise((resolve) =>
          setTimeout(resolve, MIN_API_INTERVAL - timeSinceLastCall)
        );
      }
      lastApiCall.current = Date.now();

      const res = await fetch("/api/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          languages: ["en", "ko", "es", "fr", "ja", "zh"],
        }),
      });

      let result;
      if (!res.ok) {
        console.warn("Perspective API degraded:", res.status, res.statusText);
        result = { isProfane: false, severity: "low" as const };
      } else {
        const data = await res.json();
        result = {
          isProfane: !!data.isProfane,
          severity: (data.severity as "low" | "medium" | "high") || "low",
          maskedText: (data.maskedText as string) || undefined,
        };
      }

      // Cache the result for the full text
      perspectiveCache.current.set(cacheKey, {
        result,
        timestamp: Date.now(),
      });

      // Advanced caching - store words, substrings, and patterns
      const words = cacheKey.split(/\s+/);
      for (const word of words) {
        if (word.length > 2) {
          // Cache the full word
          perspectiveCache.current.set(word, {
            result,
            timestamp: Date.now(),
          });

          // Cache substrings for longer words
          if (word.length > 3) {
            for (let i = 0; i <= word.length - 3; i++) {
              const substring = word.substring(i, i + 3);
              perspectiveCache.current.set(substring, {
                result,
                timestamp: Date.now(),
              });
            }

            // Cache character pattern (removes repeated chars)
            const charPattern = word.replace(/(.)\1+/g, "$1");
            if (charPattern !== word) {
              perspectiveCache.current.set(charPattern, {
                result,
                timestamp: Date.now(),
              });
            }
          }
        }
      }

      return result;
    } catch (error) {
      console.warn("Perspective API request failed (network/server):", error);
      const result = { isProfane: false, severity: "low" as const };
      // Cache even errors to prevent repeated failed requests
      perspectiveCache.current.set(cacheKey, {
        result,
        timestamp: Date.now(),
      });
      return result;
    }
  }, []);

  // Optimized typing detection with optimistic updates
  useEffect(() => {
    let cancelled = false;
    if (!message.trim()) {
      setProfanityWarning(null);
      return;
    }

    // Advanced optimistic check using all cached patterns
    const words = message.toLowerCase().trim().split(/\s+/);
    let optimisticProfane = false;

    for (const word of words) {
      if (word.length > 2) {
        // Check exact word
        const wordCached = perspectiveCache.current.get(word);
        if (
          wordCached &&
          wordCached.result.isProfane &&
          Date.now() - wordCached.timestamp < CACHE_DURATION
        ) {
          optimisticProfane = true;
          break;
        }

        // Check substrings and patterns
        if (word.length > 3) {
          // Check 3-char substrings
          for (let i = 0; i <= word.length - 3; i++) {
            const substring = word.substring(i, i + 3);
            const subCached = perspectiveCache.current.get(substring);
            if (
              subCached &&
              subCached.result.isProfane &&
              Date.now() - subCached.timestamp < CACHE_DURATION
            ) {
              optimisticProfane = true;
              break;
            }
          }

          if (optimisticProfane) break;

          // Check character pattern
          const charPattern = word.replace(/(.)\1+/g, "$1");
          if (charPattern !== word) {
            const patternCached = perspectiveCache.current.get(charPattern);
            if (
              patternCached &&
              patternCached.result.isProfane &&
              Date.now() - patternCached.timestamp < CACHE_DURATION
            ) {
              optimisticProfane = true;
              break;
            }
          }
        }
      }
    }

    // Show optimistic result immediately
    if (optimisticProfane) {
      setProfanityWarning(t("profanity.inappropriateDetected"));
    } else {
      setProfanityWarning(null);
    }

    // Fast API call for accurate detection
    const handle = setTimeout(async () => {
      const detection = await detectWithPerspective(message);
      if (cancelled) return;

      // Only update if result differs from optimistic
      if (detection.isProfane !== optimisticProfane) {
        if (detection.isProfane) {
          setProfanityWarning(t("profanity.inappropriateDetected"));
        } else {
          setProfanityWarning(null);
        }
      }
    }, 50); // Ultra-fast debounce - 50ms

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [message, detectWithPerspective]);

  // SWR fetcher for messages with role-based masking
  const fetcher = useCallback(
    async (url: string) => {
      const supabase = createClient();
      const { data: msgs, error } = await supabase
        .from("trading_room_messages")
        .select(
          "*, user:users!trading_room_messages_user_id_fkey(id, first_name, last_name, avatar_url)"
        )
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        throw error;
      }

      // Add default values for deleted columns (they don't exist yet)
      const processedMsgs = (msgs || []).map((msg) => ({
        ...msg,
        deleted: false,
        deleted_by: null,
        deleted_at: null,
        deleted_by_role: null,
      }));

      return processedMsgs as ChatMessage[];
    },
    [roomId]
  );

  // Message display component with role-based masking
  const MessageContent = React.memo(function MessageContent({
    message,
    maskedMessage,
    isModerator,
  }: {
    message: string;
    maskedMessage?: string;
    isModerator: boolean;
  }) {
    const [displayText, setDisplayText] = useState(message);

    useEffect(() => {
      if (isModerator) {
        // Moderators always see original text
        setDisplayText(message);
        return;
      }

      // For regular users, use masked message from database if available
      if (maskedMessage) {
        console.log("Using masked message from database:", maskedMessage);
        setDisplayText(maskedMessage);
        return;
      }

      // Fallback: check cache for older messages without masked_message
      const cacheKey = message.toLowerCase().trim();
      const cached = perspectiveCache.current.get(cacheKey);

      console.log("MessageContent - checking cache for:", message);
      console.log("Cache key:", cacheKey);
      console.log("Cached result:", cached);

      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        // Use cached masked result
        const maskedText = cached.result.maskedText || message;
        console.log("Using cached masked text:", maskedText);
        setDisplayText(maskedText);
      } else {
        // No cache found - show original text (this should be rare for new messages)
        console.log("No cache found, showing original:", message);
        setDisplayText(message);
      }
    }, [message, maskedMessage, isModerator]);

    return <span>{displayText}</span>;
  });

  // Use SWR for message caching with optimized configuration
  const { data: messages = [], mutate: mutateMessages } = useSWR(
    roomId ? `chat-messages-${roomId}` : null,
    fetcher,
    {
      fallbackData: [],
      revalidateOnFocus: false,
      revalidateOnReconnect: true, // Re-enabled for proper data fetching
      dedupingInterval: 2000, // Reduced to 2 seconds for better responsiveness
      refreshInterval: 0,
      errorRetryCount: 1, // Allow one retry
      errorRetryInterval: 2000,
      keepPreviousData: true, // Keep previous data during revalidation
      revalidateIfStale: true, // Re-enabled for proper data updates
    }
  );

  // Handle join room when user is not a participant
  const handleJoinRoom = useCallback(async () => {
    if (!user) return;
    await joinRoom();
  }, [user, joinRoom]);

  // Auto-join if user is the host and not a participant
  useEffect(() => {
    if (
      userLoaded &&
      user &&
      user.id === creatorId &&
      !isParticipant &&
      !isParticipantLoading
    ) {
      console.log("Auto-joining room as host:", {
        userId: user.id,
        creatorId,
        isParticipant,
        isParticipantLoading,
      });
      joinRoom();
    }
  }, [
    userLoaded,
    user,
    creatorId,
    isParticipant,
    isParticipantLoading,
    joinRoom,
  ]);

  // Auto-scroll to bottom when messages change - optimized to prevent flashing
  const scrollToBottom = useCallback(() => {
    // Use requestAnimationFrame for smoother scrolling
    requestAnimationFrame(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  // Auto-scroll when messages list changes (initial load and updates)
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Send message (optimistic UI with SWR)
  const handleSendMessage = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!message.trim() || !user || !isParticipant) return;

      // Moderate and mask if needed (do not block sending)
      const detection = await detectWithPerspective(message.trim());

      const tempId = "temp-" + uuidv4();
      const originalText = message.trim();
      const canModerate = isAdmin || isSuperAdmin;

      // Always store original text in DB
      const dbText = originalText;

      // For optimistic UI, show original text for moderators, masked for regular users
      const messageText = canModerate
        ? originalText
        : detection.maskedText || originalText;

      // Debug logging
      console.log("Message sending - Detection result:", detection);
      console.log("Original text:", originalText);
      console.log("DB text:", dbText);
      console.log("Message text:", messageText);
      console.log("Cache key:", originalText.toLowerCase().trim());
      console.log(
        "Cache populated:",
        perspectiveCache.current.has(originalText.toLowerCase().trim())
      );

      const optimisticMsg: ChatMessage = {
        id: tempId,
        room_id: roomId,
        user_id: user.id,
        message: messageText,
        masked_message: detection.isProfane ? detection.maskedText : undefined,
        created_at: new Date().toISOString(),
        user: {
          id: user.id,
          first_name: user.user_metadata?.first_name || "",
          last_name: user.user_metadata?.last_name || "",
          avatar_url: user.user_metadata?.avatar_url || "",
        },
        pending: true,
      };

      // Optimistic update with SWR - remove any existing pending messages from this user first
      mutateMessages((prev = []) => {
        const filteredPrev = prev.filter(
          (m) => !(m.pending && m.user_id === user.id)
        );
        return [...filteredPrev, optimisticMsg];
      }, false);
      if (!canModerate && detection.isProfane && messageText !== originalText) {
        setProfanityWarning(
          safeT(
            "profanity.maskedNotice",
            "Message was sent with sensitive words masked."
          )
        );
      } else {
        setProfanityWarning(null);
      }
      setMessage("");
      // Debounce scroll to prevent flashing
      setTimeout(() => scrollToBottom(), 100);

      try {
        const supabase = createClient();
        const { error } = await supabase.from("trading_room_messages").insert({
          room_id: roomId,
          user_id: user.id,
          message: dbText,
          masked_message: detection.isProfane ? detection.maskedText : null,
        });

        if (error) {
          // Mark as failed and remove from list
          mutateMessages(
            (prev = []) => prev.filter((m) => m.id !== tempId),
            false
          );
        }
      } catch (_error) {
        // Remove failed message from list
        mutateMessages(
          (prev = []) => prev.filter((m) => m.id !== tempId),
          false
        );
      }
    },
    [
      message,
      user,
      isParticipant,
      roomId,
      mutateMessages,
      scrollToBottom,
      detectWithPerspective,
      isAdmin,
      isSuperAdmin,
      safeT,
    ]
  );

  // Delete message function (soft delete by updating message content)
  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!user) return;

      try {
        const supabase = createClient();

        // Determine the role of the deleter with host priority
        const isHost = user.id === creatorId;
        const deletedByRole = isHost
          ? "host"
          : isSuperAdmin
          ? "super_admin"
          : isAdmin
          ? "admin"
          : "user";

        // Soft delete by updating the message content
        const { error } = await supabase
          .from("trading_room_messages")
          .update({
            message: `[DELETED_BY_${deletedByRole.toUpperCase()}]`, // Mark as deleted with role
          })
          .eq("id", messageId);

        if (error) {
          console.error("Error deleting message:", error);
          return;
        }

        // Update local state to show deleted message
        mutateMessages(
          (prev = []) =>
            prev.map((msg) => {
              if (msg.id === messageId) {
                return {
                  ...msg,
                  message: `[DELETED_BY_${deletedByRole.toUpperCase()}]`,
                  deleted: true,
                  deleted_by: user.id,
                  deleted_at: new Date().toISOString(),
                  deleted_by_role: deletedByRole,
                };
              }
              return msg;
            }),
          false
        );
      } catch (error) {
        console.error("Error deleting message:", error);
      }
    },
    [user, creatorId, isAdmin, isSuperAdmin, mutateMessages]
  );

  // Memoized event handlers for real-time subscriptions
  const handleNewMessage = useCallback(
    async (payload: { new: ChatMessage }) => {
      const newMsg = payload.new as ChatMessage;
      const supabase = createClient();

      try {
        const { data: userData } = await supabase
          .from("users")
          .select("id, first_name, last_name, avatar_url")
          .eq("id", newMsg.user_id)
          .single();

        // For real-time messages, use masked_message from database if available
        const canModerate = isAdmin || isSuperAdmin;
        let displayMessage = newMsg.message;

        if (!canModerate && newMsg.masked_message) {
          displayMessage = newMsg.masked_message;
        } else if (!canModerate) {
          // Fallback: check cache for older messages
          const cacheKey = newMsg.message.toLowerCase().trim();
          const cached = perspectiveCache.current.get(cacheKey);

          if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            displayMessage = cached.result.maskedText || newMsg.message;
          }
        }

        mutateMessages((prev = []) => {
          // Remove any pending messages from the same user with similar content
          const filteredPrev = prev.filter((m) => {
            if (m.pending && m.user_id === newMsg.user_id) {
              // Remove pending messages from the same user
              return false;
            }
            return true;
          });

          // Prevent duplicates by checking if message already exists
          if (filteredPrev.some((m) => m.id === newMsg.id)) {
            return filteredPrev;
          }

          // Add the new real-time message
          const next = [
            ...filteredPrev,
            {
              ...newMsg,
              message: displayMessage,
              user: userData || undefined,
            },
          ];

          // Sort by created_at to maintain order
          next.sort((a, b) => a.created_at.localeCompare(b.created_at));
          return next;
        }, false);

        // Debounce scroll to prevent excessive scrolling
        setTimeout(() => scrollToBottom(), 50);
      } catch (error) {
        console.error("Error fetching user data for new message:", error);
      }
    },
    [mutateMessages, scrollToBottom, isAdmin, isSuperAdmin]
  );

  const handleMessageUpdate = useCallback(
    async (payload: { new: ChatMessage }) => {
      const updatedMsg = payload.new as ChatMessage;

      // For updated messages, we'll let the MessageContent component handle masking
      const displayMessage = updatedMsg.message;

      mutateMessages(
        (prev = []) =>
          prev.map((msg) => {
            if (msg.id === updatedMsg.id) {
              return {
                ...msg,
                ...updatedMsg,
                message: displayMessage,
              };
            }
            return msg;
          }),
        false
      );
    },
    [mutateMessages]
  );

  const handleMessageDelete = useCallback(
    (payload: { old: { id: string } }) => {
      const deletedMsgId = payload.old.id;

      mutateMessages(
        (prev = []) => prev.filter((msg) => msg.id !== deletedMsgId),
        false
      );
    },
    [mutateMessages]
  );

  // Subscribe to new messages with SWR integration
  useEffect(() => {
    if (!roomId) return;
    const supabase = createClient();

    const setupChannel = () => {
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch {}
        channelRef.current = null;
      }

      type PostgresPayload = { new: ChatMessage; old: { id: string } };
      type ChannelLike = {
        on: (
          event: string,
          filter: Record<string, unknown>,
          cb: (payload: PostgresPayload) => void
        ) => ChannelLike;
        subscribe: () => unknown;
      };

      const rawChannel = supabase.channel(`room-messages-${roomId}`);
      const ch = rawChannel as unknown as ChannelLike;
      ch.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trading_room_messages",
          filter: `room_id=eq.${roomId}`,
        },
        handleNewMessage as (p: PostgresPayload) => void
      )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "trading_room_messages",
            filter: `room_id=eq.${roomId}`,
          },
          handleMessageUpdate as (p: PostgresPayload) => void
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "trading_room_messages",
            filter: `room_id=eq.${roomId}`,
          },
          handleMessageDelete as (p: PostgresPayload) => void
        );
      rawChannel.subscribe();

      channelRef.current = rawChannel;
    };

    setupChannel();

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        setupChannel();
        // Revalidate messages when tab becomes visible
        mutateMessages();
      }
    };
    const onOnline = () => {
      setupChannel();
      // Revalidate messages when coming back online
      mutateMessages();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch {}
        channelRef.current = null;
      }
    };
  }, [
    roomId,
    mutateMessages,
    scrollToBottom,
    handleNewMessage,
    handleMessageUpdate,
    handleMessageDelete,
  ]);

  // Message item component (hooks allowed) - memoized to prevent re-renders
  const MessageItem = React.memo(
    function MessageItem({ msg }: { msg: ChatMessage }) {
      const [showMenu, setShowMenu] = useState(false);
      const menuRef = useRef<HTMLDivElement>(null);
      const avatarUrl = msg.user?.avatar_url;

      useOnClickOutside(menuRef as React.RefObject<HTMLElement>, () =>
        setShowMenu(false)
      );

      const isDeleted = msg.deleted || msg.message?.includes("[DELETED_BY_");
      const canModerate = isAdmin || isSuperAdmin;

      const deletionMessage = useMemo(() => {
        if (msg.message?.includes("[DELETED_BY_")) {
          if (msg.message.includes("[DELETED_BY_HOST]"))
            return t("deleted.byHost");
          if (msg.message.includes("[DELETED_BY_ADMIN]"))
            return t("deleted.byAdmin");
          if (msg.message.includes("[DELETED_BY_SUPER_ADMIN]"))
            return t("deleted.bySuperAdmin");
          if (msg.message.includes("[DELETED_BY_USER]"))
            return t("deleted.byUser");
        }
        if (msg.deleted && msg.deleted_by_role) {
          switch (msg.deleted_by_role) {
            case "host":
              return t("deleted.byHost");
            case "admin":
              return t("deleted.byAdmin");
            case "super_admin":
              return t("deleted.bySuperAdmin");
            case "user":
              return t("deleted.byUser");
            default:
              return t("deleted.byUser");
          }
        }
        return "";
      }, [msg.message, msg.deleted, msg.deleted_by_role, t]);

      const userDisplayName = useMemo(
        () =>
          msg.user
            ? `${msg.user.first_name} ${msg.user.last_name}`
            : msg.user_id,
        [msg.user, msg.user_id]
      );
      const formattedTime = useMemo(
        () =>
          new Date(msg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        [msg.created_at]
      );

      return (
        <div
          key={msg.id}
          className={`flex gap-3 items-center group ${
            msg.pending ? "opacity-50" : ""
          } ${msg.failed ? "text-red-500" : ""} ${
            isDeleted ? "opacity-60" : ""
          }`}
        >
          <Avatar className="h-8 w-8 relative overflow-visible">
            {avatarUrl ? (
              <AvatarImage
                className="rounded-full"
                src={avatarUrl}
                alt={userDisplayName || t("labels.user")}
              />
            ) : null}
            <AvatarFallback className="bg-muted text-muted-foreground">
              {msg.user?.first_name?.charAt(0) || "?"}
            </AvatarFallback>
            {msg.user_id === creatorId && (
              <span className="absolute -top-1 -right-0.5 z-10">
                <Crown className="h-3 w-3 text-amber-400 drop-shadow" />
              </span>
            )}
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{userDisplayName}</span>
              <span className="text-xs text-muted-foreground">
                {formattedTime}
              </span>
            </div>
            {isDeleted ? (
              <p className="text-[0.8rem] text-muted-foreground italic">
                {deletionMessage}
              </p>
            ) : (
              <p className="text-[0.8rem] text-muted-foreground">
                <MessageContent
                  message={msg.message || ""}
                  maskedMessage={msg.masked_message}
                  isModerator={isAdmin || isSuperAdmin}
                />
              </p>
            )}
            {msg.failed && <span className="text-xs">{t("failedToSend")}</span>}
          </div>

          {canModerate && !isDeleted && (
            <div className="relative" ref={menuRef}>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                onClick={() => setShowMenu(!showMenu)}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
              {showMenu && (
                <div className="absolute right-0 top-6 z-50 bg-background border border-border rounded-md shadow-lg min-w-[120px]">
                  <div className="p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs"
                      onClick={() => {
                        handleDeleteMessage(msg.id);
                        setShowMenu(false);
                      }}
                    >
                      {t("menu.deleteMessage")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    },
    (prevProps, nextProps) => {
      // Proper comparison - re-render if essential properties change
      const prev = prevProps.msg;
      const next = nextProps.msg;

      return (
        prev.id === next.id &&
        prev.message === next.message &&
        prev.deleted === next.deleted &&
        prev.pending === next.pending &&
        prev.failed === next.failed &&
        prev.user?.avatar_url === next.user?.avatar_url &&
        prev.deleted_by_role === next.deleted_by_role
      );
    }
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background sticky top-0 z-10 select-none">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{t("title")}</span>
      </div>
      <ScrollArea className="flex-1 overflow-y-auto select-none">
        <div className="p-4 space-y-4">
          {messages.map((msg) => (
            <MessageItem key={msg.id} msg={msg} />
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
      {!isParticipant ? (
        <div className="p-3 border-t border-border bg-background sticky bottom-0">
          <Button
            onClick={handleJoinRoom}
            disabled={isParticipantLoading}
            className="w-full"
          >
            {isParticipantLoading
              ? t("join.joining")
              : t("join.joinRoomToChat")}
          </Button>
          {participantError && (
            <p className="text-xs text-red-500 mt-1 text-center">
              {participantError}
            </p>
          )}
        </div>
      ) : (
        <div className="border-t border-border bg-background sticky bottom-0">
          {profanityWarning && (
            <div className="px-3 py-2 bg-red-50 border-b border-red-200 text-red-700 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>{profanityWarning}</span>
              </div>
            </div>
          )}
          <form onSubmit={handleSendMessage} className="p-3 flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("input.placeholder")}
              className={`flex-1 rounded-none ${
                profanityWarning ? "border-red-300 focus:border-red-500" : ""
              }`}
              disabled={isParticipantLoading}
            />
            <Button
              type="submit"
              size="icon"
              className="rounded-none"
              disabled={!message.trim() || isParticipantLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
