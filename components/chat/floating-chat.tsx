"use client";

import Link from "next/link";
import type React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRoomStore } from "@/lib/store/room-store";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { GradientAvatar } from "@/utils/gradient-avatar";
import {
  ChevronUp,
  Coins,
  MessageSquare,
  MinusIcon,
  SendIcon,
  Star,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { ChatMessage } from "./chat-message";

// Add UserData interface for user state
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
}

// Add Message interface for chat messages
interface Message {
  id: string;
  sender: {
    id: string;
    name: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  isCurrentUser: boolean;
  pending?: boolean;
  failed?: boolean;
}

// Add this at the very top of the file, outside the component
const handledMessageIds = new Set<string>();

// Add a hook to calculate time until next UTC midnight
function getTimeUntilNextUTCMidnight() {
  const now = new Date();
  const nextMidnight = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1, // next day
      0,
      0,
      0,
      0
    )
  );
  return nextMidnight.getTime() - now.getTime();
}

function useTimeUntilReset() {
  const [timeLeft, setTimeLeft] = useState(getTimeUntilNextUTCMidnight());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeUntilNextUTCMidnight());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format as HH:MM:SS
  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft / (1000 * 60)) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function FloatingChat() {
  const isRoomOpen = useRoomStore(
    (state: { isRoomOpen: boolean }) => state.isRoomOpen
  );
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem("chatState");
      return savedState ? JSON.parse(savedState).isOpen : false;
    }
    return false;
  });
  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem("chatState");
      return savedState ? JSON.parse(savedState).isMinimized : false;
    }
    return false;
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const lastSessionId = useRef<string | null>(null);
  const [lastSeenMessageId, setLastSeenMessageId] = useState<string | null>(
    null
  );
  const lastSeenMessageIdRef = useRef(lastSeenMessageId);
  useEffect(() => {
    lastSeenMessageIdRef.current = lastSeenMessageId;
  }, [lastSeenMessageId]);

  const EXP_PER_LEVEL = 10000;
  const exp = user?.exp ?? 0;
  const level = Math.floor(exp / EXP_PER_LEVEL);
  const expThisLevel = exp - level * EXP_PER_LEVEL;
  const progress = Math.max(
    0,
    Math.min(100, (expThisLevel / EXP_PER_LEVEL) * 100)
  );

  const isOpenRef = useRef(isOpen);
  const isMinimizedRef = useRef(isMinimized);
  const userRef = useRef(user);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);
  useEffect(() => {
    isMinimizedRef.current = isMinimized;
  }, [isMinimized]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "chatState",
        JSON.stringify({
          isOpen,
          isMinimized,
        })
      );
    }
  }, [isOpen, isMinimized]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isMinimized]);

  // Reset unread count when opening chat
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setUnreadCount(0);
    }
  }, [isOpen, isMinimized]);

  // Update lastSeenMessageId when chat is opened and messages are available
  useEffect(() => {
    if (isOpen && !isMinimized && messages.length > 0) {
      setLastSeenMessageId(messages[messages.length - 1].id);
    }
  }, [isOpen, isMinimized, messages]);

  const timeUntilReset = useTimeUntilReset();

  // Fetch messages from Supabase on mount
  useEffect(() => {
    const supabase = createClient();
    async function fetchMessages() {
      // Calculate today's UTC midnight
      const todayMidnightUTC = new Date();
      todayMidnightUTC.setUTCHours(0, 0, 0, 0);
      const { data: msgs } = await supabase
        .from("global_chat_messages")
        .select("*, user:users(id, first_name, last_name, avatar_url)")
        .gte("created_at", todayMidnightUTC.toISOString())
        .order("created_at", { ascending: true })
        .limit(50);
      setMessages(
        (msgs || []).map(
          (msg): Message => ({
            id: msg.id,
            sender: {
              id: msg.user?.id || msg.user_id,
              name:
                `${msg.user?.first_name || ""} ${
                  msg.user?.last_name || ""
                }`.trim() || "User",
              avatar: msg.user?.avatar_url || "",
            },
            content: msg.content,
            timestamp: msg.created_at,
            isCurrentUser: !!(user && msg.user_id === user.id),
          })
        )
      );
    }
    fetchMessages();
  }, [user]);

  // Real-time subscription to new messages
  useEffect(() => {
    console.log("Subscribed!");
    const supabase = createClient();
    const channel = supabase
      .channel("global-chat")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "global_chat_messages",
        },
        (payload) => {
          console.log(
            "Subscription handler fired for message:",
            payload.new.id
          );
          const newMsg = payload.new;
          // GUARD: Only process if not already handled (move to top, before async)
          if (handledMessageIds.has(newMsg.id)) {
            console.log("Already handled message:", newMsg.id);
            return;
          }
          handledMessageIds.add(newMsg.id);
          console.log("New message event:", newMsg);
          supabase
            .from("users")
            .select("id, first_name, last_name, avatar_url")
            .eq("id", newMsg.user_id)
            .single()
            .then(({ data: userData }) => {
              setMessages((prev) => {
                // Find pending optimistic message
                const pendingIdx = prev.findIndex(
                  (m) =>
                    m.pending &&
                    m.sender.id === newMsg.user_id &&
                    m.content === newMsg.content
                );
                let isCurrentUser: boolean = false;
                if (pendingIdx !== -1) {
                  // If replacing a pending message, it must be from the current user
                  isCurrentUser = true;
                } else {
                  // For new messages, use the standard check
                  isCurrentUser = Boolean(
                    userRef.current && newMsg.user_id === userRef.current.id
                  );
                }
                const msgObj: Message = {
                  id: newMsg.id,
                  sender: {
                    id: userData?.id || newMsg.user_id,
                    name:
                      `${userData?.first_name || ""} ${
                        userData?.last_name || ""
                      }`.trim() || "User",
                    avatar: userData?.avatar_url || "",
                  },
                  content: newMsg.content,
                  timestamp: newMsg.created_at,
                  isCurrentUser,
                  pending: false, // real message is never pending
                };
                let updated;
                let isNewMessage = false;
                if (pendingIdx !== -1) {
                  // Replace optimistic with real
                  updated = [...prev];
                  updated[pendingIdx] = msgObj;
                } else {
                  // Guard: Only process if message is not already in state
                  if (prev.some((m) => m.id === newMsg.id)) return prev;
                  updated = [...prev, msgObj];
                  isNewMessage = true;
                }
                // Calculate if message is from another user
                const isFromOtherUser =
                  !!userRef.current && newMsg.user_id !== userRef.current.id;
                const isChatInactive =
                  !isOpenRef.current || isMinimizedRef.current;
                // Only increment unreadCount for real (non-pending) messages from others, not already seen, and not already in the array
                if (isFromOtherUser && isChatInactive && isNewMessage) {
                  setUnreadCount((prevCount) => prevCount + 1);
                }
                // Deduplicate messages by id (final safety net)
                const unique = [];
                const seen = new Set();
                for (const m of updated) {
                  if (!seen.has(m.id)) {
                    unique.push(m);
                    seen.add(m.id);
                  }
                }
                return unique;
              });
            });
        }
      )
      .subscribe();
    return () => {
      console.log("Unsubscribed!");
      supabase.removeChannel(channel);
    };
  }, []); // <--- subscribe only once on mount

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      const sessionId = data.session?.user?.id || null;
      if (lastSessionId.current === sessionId && user) {
        setUserLoading(false);
        setAuthChecked(true);
        return;
      }
      lastSessionId.current = sessionId;
      if (!sessionId) {
        if (mounted) setUser(null);
        setUserLoading(false);
        setAuthChecked(true);
        return;
      }
      setUserLoading(true);
      supabase
        .from("users")
        .select(
          "id, first_name, last_name, nickname, email, avatar_url, level, exp, kor_coins"
        )
        .eq("id", sessionId)
        .single()
        .then(
          ({ data, error }: { data: UserData | null; error: Error | null }) => {
            if (mounted) {
              setUser(error ? null : data);
              setUserLoading(false);
              setAuthChecked(true);
            }
          }
        );
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const sessionId = session?.user?.id || null;
        if (lastSessionId.current === sessionId && user) {
          setUserLoading(false);
          setAuthChecked(true);
          return;
        }
        lastSessionId.current = sessionId;
        if (!sessionId) {
          setUser(null);
          setUserLoading(false);
          setAuthChecked(true);
          return;
        }
        setUserLoading(true);
        supabase
          .from("users")
          .select(
            "id, first_name, last_name, nickname, email, avatar_url, level, exp, kor_coins"
          )
          .eq("id", sessionId)
          .single()
          .then(
            ({
              data,
              error,
            }: {
              data: UserData | null;
              error: Error | null;
            }) => {
              setUser(error ? null : data);
              setUserLoading(false);
              setAuthChecked(true);
            }
          );
      }
    );
    return () => {
      mounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;
    const tempId = "temp-" + uuidv4();
    const optimisticMsg = {
      id: tempId,
      sender: {
        id: user.id,
        name:
          `${user.first_name || ""} ${user.last_name || ""}`.trim() || "User",
        avatar: user.avatar_url || "",
      },
      content: newMessage.trim(),
      timestamp: new Date().toISOString(),
      isCurrentUser: true,
      pending: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setNewMessage("");
    setTimeout(
      () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      100
    );
    const supabase = createClient();
    const { error } = await supabase.from("global_chat_messages").insert({
      user_id: user.id,
      content: optimisticMsg.content,
    });
    if (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, pending: false, failed: true } : m
        )
      );
    }
  };

  const toggleChat = () => {
    if (!isOpen) {
      setIsOpen(true);
      setIsMinimized(false);
      setUnreadCount(0);
    } else {
      if (isMinimized) {
        setIsMinimized(false);
        setUnreadCount(0);
      } else {
        setIsOpen(false);
      }
    }
  };

  // Add this function to always close the chat
  const closeChat = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const minimizeChat = () => {
    setIsMinimized(true);
  };

  if (!authChecked) {
    return null;
  }

  return (
    <>
      {/* Chat Button */}
      <AnimatePresence>
        {!isOpen && !isRoomOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[98vw] max-w-[420px] p-0 sm:bottom-12 sm:left-6 sm:translate-x-0 sm:w-auto sm:max-w-none sm:p-0"
          >
            <div className="flex items-center gap-2">
              <Button
                onClick={toggleChat}
                className="rounded-full shadow-lg bg-gradient-to-br from-[#549BCC] to-[#63b3e4] hover:from-[#63b3e4] hover:to-[#549BCC] relative transition-all duration-300 h-11 px-2 text-xs flex items-center justify-center space-x-1 whitespace-nowrap cursor-pointer sm:h-12 sm:px-3 sm:text-sm"
              >
                <MessageSquare className="h-4 w-4 text-white sm:h-5 sm:w-5" />
                <span className="font-medium text-white">Chat</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 h-5 w-5 rounded-full border-2 border-background" />
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && !isRoomOpen && (
          <motion.div
            ref={chatRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={
              isMinimized
                ? { opacity: 1, y: 0, scale: 1, height: "auto" }
                : { opacity: 1, y: 0, scale: 1, height: "90vh" }
            }
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              // Mobile: bottom center, full width, max height. Desktop: bottom left, fixed size.
              "fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-background rounded-md shadow-lg border border-border overflow-hidden flex flex-col w-[98vw] max-w-[420px] h-[90vh] p-0 m-0 right-auto min-w-0 sm:bottom-12 sm:left-6 sm:translate-x-0 sm:w-[380px] sm:max-w-none sm:h-[90vh] sm:rounded-lg sm:shadow-xl sm:border sm:p-0 sm:m-0",
              isMinimized
                ? "w-[90vw] max-w-[340px] h-auto sm:w-[300px] sm:max-w-none sm:h-auto"
                : "w-[98vw] max-w-[420px] h-[90vh] sm:w-[380px] sm:max-w-none sm:h-[90vh]"
            )}
          >
            {/* Chat Header */}
            <div className="bg-[#549BCC]/10 border-b border-border p-2 flex items-center justify-between gap-1 min-w-0 sm:p-3">
              <div className="flex items-center gap-1 min-w-0 flex-1 sm:gap-2">
                <MessageSquare className="h-4 w-4 text-[#549BCC] sm:h-5 sm:w-5" />
                <h3 className="font-medium text-xs truncate sm:text-sm">
                  Global Chat
                </h3>
                <span className="ml-2 flex items-center gap-1 text-[0.8rem] font-semibold text-primary">
                  <span className="opacity-60 font-normal">|</span>
                  <span>Resets in {timeUntilReset} (UTC)</span>
                </span>
              </div>
              <div className="flex items-center gap-1 min-w-0 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 sm:h-7 sm:w-7"
                  onClick={minimizeChat}
                >
                  <MinusIcon className="h-3.5 w-3.5 text-muted-foreground sm:h-4 sm:w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 sm:h-7 sm:w-7"
                  onClick={closeChat}
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Profile Section or Login/Register */}
                {authChecked && user ? (
                  <div className="bg-gradient-to-r from-[#549BCC]/5 to-[#63b3e4]/5 border-b border-border p-2 sm:p-3">
                    <div className="flex items-center gap-2 min-w-0 sm:gap-3">
                      <Avatar className="h-8 w-8 ring-2 ring-[#549BCC]/20 sm:h-12 sm:w-12">
                        {user.avatar_url ? (
                          <AvatarImage
                            src={user.avatar_url}
                            alt={user.nickname || user.email || "User"}
                          />
                        ) : user.id ? (
                          <GradientAvatar id={user.id} />
                        ) : (
                          <AvatarFallback className="bg-gradient-to-br from-[#549BCC] to-[#63b3e4] text-white text-xs sm:text-base">
                            {user.nickname?.[0] || user.email?.[0] || "U"}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-xs truncate sm:text-sm">
                          {user.first_name || user.last_name
                            ? `${user.first_name || ""} ${
                                user.last_name || ""
                              }`.trim()
                            : user.nickname || user.email || "User"}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 sm:gap-4 sm:mt-1">
                          <div className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 text-yellow-500 sm:h-4 sm:w-4" />
                            <span className="text-[10px] text-muted-foreground sm:text-xs">
                              {(user.exp ?? 0).toLocaleString()} XP
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Coins className="h-3.5 w-3.5 text-amber-500 sm:h-4 sm:w-4" />
                            <span className="text-[10px] text-muted-foreground sm:text-xs">
                              {(user.kor_coins ?? 0).toLocaleString()} KOR
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Experience Level - Redesigned for minimal and clean look */}
                    <div className="w-full flex flex-col gap-y-0.5 mt-1 sm:mt-2 sm:gap-y-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground sm:text-xs">
                        <span>Level {level}</span>
                        <span>Level {level + 1}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1 dark:bg-gray-700 sm:h-1.5">
                        <div
                          className="bg-red-500 h-1 rounded-full sm:h-1.5"
                          style={{
                            width: `${progress}%`,
                          }}
                        ></div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground sm:text-xs">
                        <span>{`${progress.toFixed(0)}% Complete`}</span>
                        <span className="text-red-500">{`${expThisLevel.toLocaleString()} / ${EXP_PER_LEVEL} EXP`}</span>
                      </div>
                    </div>
                  </div>
                ) : userLoading ? (
                  <div className="bg-gradient-to-r from-[#549BCC]/5 to-[#63b3e4]/5 border-b border-border p-2 sm:p-3">
                    <div className="flex items-center gap-2 min-w-0 sm:gap-3">
                      <Skeleton className="h-8 w-8 rounded-full sm:h-12 sm:w-12" />
                      <div className="flex-1 min-w-0">
                        <Skeleton className="h-4 w-20 mb-1" />
                        <div className="flex items-center gap-2 mt-0.5 sm:gap-4 sm:mt-1">
                          <Skeleton className="h-3 w-10" />
                          <Skeleton className="h-3 w-10" />
                        </div>
                      </div>
                    </div>
                    <div className="w-full flex flex-col gap-y-0.5 mt-1 sm:mt-2 sm:gap-y-1">
                      <Skeleton className="h-2 w-full" />
                      <Skeleton className="h-2 w-1/2" />
                    </div>
                  </div>
                ) : authChecked && !user ? (
                  <div className="bg-gradient-to-r from-[#549BCC]/5 to-[#63b3e4]/5 border-b border-border p-2 sm:p-3 flex items-center gap-2 justify-between">
                    <span className="text-xs sm:text-sm">Please </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 py-1 text-xs sm:h-9 sm:px-4 sm:text-sm"
                      asChild
                    >
                      <Link href="/login">Login</Link>
                    </Button>
                    <span className="text-xs sm:text-sm">or</span>
                    <Button
                      size="sm"
                      className="h-7 px-3 py-1 text-xs sm:h-9 sm:px-4 sm:text-sm"
                      asChild
                    >
                      <Link href="/register">Register</Link>
                    </Button>
                  </div>
                ) : null}

                {/* Chat Body with Messages */}
                <div className="relative flex-1 min-h-0 min-w-0">
                  <div className="absolute inset-0 overflow-y-auto p-2 space-y-2 scrollbar-thin min-w-0 sm:p-3 sm:space-y-3">
                    {messages.map((message) => (
                      <ChatMessage key={message.id} message={message} />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Chat Input */}
                <div className="p-2 border-t border-border bg-background/80 backdrop-blur-sm sm:p-4">
                  <form
                    onSubmit={handleSendMessage}
                    className="flex items-center gap-2 min-w-0 sm:gap-3"
                  >
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 h-9 text-xs rounded-md px-2 min-w-0 sm:h-12 sm:text-sm sm:px-4"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="h-9 w-9 rounded-md bg-[#549BCC] hover:bg-[#63b3e4] flex items-center justify-center sm:h-12 sm:w-12"
                    >
                      <SendIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </form>
                </div>
              </>
            )}

            {/* Minimized View */}
            {isMinimized && (
              <div className="p-2 flex items-center justify-between gap-1 min-w-0 sm:p-3">
                <div className="flex items-center gap-1 min-w-0 flex-1 sm:gap-2">
                  <span className="text-xs truncate sm:text-sm">
                    Global Chat
                  </span>
                </div>
                <div className="flex items-center gap-1 min-w-0 flex-shrink-0">
                  {/* Wrap the red dot and Button in a fragment to fix linter error */}
                  <>
                    {unreadCount > 0 && (
                      <span className="bg-red-500 h-5 w-5 rounded-full border-2 border-background mr-1" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsMinimized(false)}
                      className="h-6 w-6 p-0 sm:h-7 sm:w-7"
                    >
                      <ChevronUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
