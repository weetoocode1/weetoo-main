"use client";

import { useCallback, useState } from "react";

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
  MessageSquareIcon,
  MoreVerticalIcon,
  SendHorizontalIcon,
  UsersIcon,
} from "lucide-react";

export function StreamChat() {
  const [message, setMessage] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = message.trim();
      if (!trimmed) return;
      console.log("send:", trimmed);
      setMessage("");
    },
    [message]
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

  return (
    <div className="w-[350px] h-full border border-border flex flex-col bg-card text-card-foreground">
      <div className="h-12 border-b border-border flex items-center justify-between px-3">
        <span>Live Chat</span>
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
            <DropdownMenuItem className="cursor-pointer h-10">
              <UsersIcon className="h-4 w-4" />
              Participant List
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer h-10">
              <MessageSquareIcon className="h-4 w-4" />
              Popup Chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex-1 overflow-y-auto"></div>
      <div className="border-t border-border p-3">
        <form
          className="mx-auto flex w-full max-w-md items-end gap-2"
          onSubmit={handleSubmit}
        >
          <Label htmlFor="chat" className="sr-only">
            Message
          </Label>
          <Textarea
            id="chat"
            placeholder="Type a message..."
            className="field-sizing-content max-h-29.5 min-h-0 resize-none py-1.75 rounded-none"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button type="submit" className="rounded-none">
            <SendHorizontalIcon className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
