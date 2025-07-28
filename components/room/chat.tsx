import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase/client";
import { Crown, MessageSquare, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  created_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string;
  };
  pending?: boolean;
  failed?: boolean;
}

interface ChatProps {
  roomId: string;
  creatorId: string;
}

export function Chat({ roomId, creatorId }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [isParticipant, setIsParticipant] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user as User | null);
    });
  }, []);

  // Check if user is a participant
  useEffect(() => {
    if (!user || !roomId) return;
    const supabase = createClient();
    supabase
      .from("trading_room_participants")
      .select("id")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .is("left_at", null)
      .maybeSingle()
      .then(({ data }) => {
        setIsParticipant(!!data);
      });
  }, [user, roomId]);

  useEffect(() => {
    if (!roomId) return;
    const supabase = createClient();
    async function fetchMessages() {
      // Fetch last 50 messages, newest last
      const { data: msgs, error } = await supabase
        .from("trading_room_messages")
        .select("*, user:users(id, first_name, last_name, avatar_url)")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(50);
      if (!error && msgs) {
        setMessages(msgs as ChatMessage[]);
        // Scroll to bottom
        setTimeout(() => {
          scrollRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }
    fetchMessages();
  }, [roomId]);

  // Send message (optimistic UI)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !user || !isParticipant) return;
    const tempId = "temp-" + uuidv4();
    const optimisticMsg: ChatMessage = {
      id: tempId,
      room_id: roomId,
      user_id: user.id,
      message: message.trim(),
      created_at: new Date().toISOString(),
      user: {
        id: user.id,
        first_name: user.user_metadata?.first_name || "",
        last_name: user.user_metadata?.last_name || "",
        avatar_url: user.user_metadata?.avatar_url || "",
      },
      pending: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setMessage("");
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    const supabase = createClient();
    const { error } = await supabase.from("trading_room_messages").insert({
      room_id: roomId,
      user_id: user.id,
      message: optimisticMsg.message,
    });
    if (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, pending: false, failed: true } : m
        )
      );
    }
  };

  // Subscribe to new messages
  useEffect(() => {
    if (!roomId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`room-messages-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trading_room_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          supabase
            .from("users")
            .select("id, first_name, last_name, avatar_url")
            .eq("id", newMsg.user_id)
            .single()
            .then(({ data: userData }) => {
              setMessages((prev) => {
                // Try to find a pending message from this user with same content
                const pendingIdx = prev.findIndex(
                  (m) =>
                    m.pending &&
                    m.user_id === newMsg.user_id &&
                    m.message === newMsg.message
                );
                if (pendingIdx !== -1) {
                  // Replace the pending message with the confirmed one
                  const updated = [...prev];
                  updated[pendingIdx] = {
                    ...newMsg,
                    user: userData || undefined,
                  };
                  return updated;
                }
                // Prevent duplicates
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, { ...newMsg, user: userData || undefined }];
              });
              setTimeout(() => {
                scrollRef.current?.scrollIntoView({ behavior: "smooth" });
              }, 100);
            });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-background sticky top-0 z-10 select-none">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Chat</span>
      </div>
      <ScrollArea className="flex-1 overflow-y-auto select-none">
        <div className="p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 items-center ${
                msg.pending ? "opacity-50" : ""
              } ${msg.failed ? "text-red-500" : ""}`}
            >
              <Avatar className="h-8 w-8 relative overflow-visible">
                <AvatarImage
                  className="rounded-full"
                  src={msg.user?.avatar_url || ""}
                  alt={
                    msg.user
                      ? `${msg.user.first_name} ${msg.user.last_name}`
                      : "User"
                  }
                />
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
                  <span className="text-sm font-medium">
                    {msg.user
                      ? `${msg.user.first_name} ${msg.user.last_name}`
                      : msg.user_id}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-[0.8rem] text-muted-foreground">
                  {msg.message}
                </p>
                {msg.failed && <span className="text-xs">Failed to send</span>}
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
      <form
        onSubmit={handleSendMessage}
        className="p-3 border-t border-border flex gap-2 bg-background sticky bottom-0"
      >
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            isParticipant ? "Type your message..." : "Join the room to chat"
          }
          className="flex-1 rounded-none"
          disabled={!isParticipant}
        />
        <Button
          type="submit"
          size="icon"
          className="rounded-none"
          disabled={!message.trim() || !isParticipant}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
