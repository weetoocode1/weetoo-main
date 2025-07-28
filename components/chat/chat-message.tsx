"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

interface ChatMessageProps {
  message: {
    id: string;
    sender: {
      id: string;
      name: string;
      avatar: string;
    };
    content: string;
    timestamp: string;
    pending?: boolean;
    failed?: boolean;
    isCurrentUser?: boolean;
  };
}

export function ChatMessage({ message }: ChatMessageProps) {
  const formattedTime = format(new Date(message.timestamp), "hh:mm a");

  return (
    <div className="flex items-start mb-3">
      <Avatar className="h-10 w-10 flex-shrink-0 mr-2">
        <AvatarImage
          className="rounded-full"
          src={message.sender.avatar || ""}
          alt={message.sender.name}
        />
        <AvatarFallback className="bg-muted text-muted-foreground">
          {message.sender.name[0]}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
          {message.sender.name}
          {message.isCurrentUser && (
            <span className="bg-primary text-[10px] text-muted rounded px-2 ml-1">
              You
            </span>
          )}
        </div>
        <div className="flex items-center justify-between rounded">
          <span
            className={`text-sm break-words ${
              message.isCurrentUser
                ? "text-primary font-medium"
                : "text-foreground"
            }`}
          >
            {message.content}
          </span>
          <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">
            {formattedTime}
          </span>
        </div>
      </div>
    </div>
  );
}
