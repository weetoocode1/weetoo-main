"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoreVertical, Search, Send } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "../ui/scroll-area";

const MESSAGES = [
  {
    id: 1,
    sender: "Alice Johnson",
    subject: "Project Update Required",
    preview:
      "Hi there! I wanted to follow up on the project status and see if you need any additional resources...",
    time: "2h ago",
    unread: true,
    avatar: "AJ",
  },
  {
    id: 2,
    sender: "Bob Smith",
    subject: "Meeting Confirmation",
    preview:
      "Just confirming our meeting scheduled for tomorrow at 3 PM. Please let me know if you need to reschedule...",
    time: "5h ago",
    unread: true,
    avatar: "BS",
  },
  {
    id: 3,
    sender: "Carol Davis",
    subject: "Welcome to the team!",
    preview:
      "Welcome aboard! We're excited to have you join our team. Here's everything you need to get started...",
    time: "1d ago",
    unread: false,
    avatar: "CD",
  },
  {
    id: 4,
    sender: "David Wilson",
    subject: "Budget Review Meeting",
    preview:
      "Let's schedule a meeting to review the quarterly budget and discuss upcoming expenses...",
    time: "3d ago",
    unread: false,
    avatar: "DW",
  },
  {
    id: 5,
    sender: "Emma Thompson",
    subject: "Design System Updates",
    preview:
      "I've made some updates to our design system. Please review the changes when you have time...",
    time: "1w ago",
    unread: false,
    avatar: "ET",
  },
];

const CONVERSATION_MESSAGES = [
  {
    id: 1,
    sender: "Alice Johnson",
    message:
      "Hi there! I wanted to follow up on the project status and see if you need any additional resources for the upcoming deadline.",
    time: "2:30 PM",
    isUser: false,
    avatar: "AJ",
  },
  {
    id: 2,
    sender: "You",
    message:
      "Thanks for checking in! The project is progressing well. We're currently on track to meet the deadline.",
    time: "2:45 PM",
    isUser: true,
    avatar: "JD",
  },
  {
    id: 3,
    sender: "Alice Johnson",
    message:
      "That's great to hear! Do you need any help with the final testing phase? I have some bandwidth this week.",
    time: "2:47 PM",
    isUser: false,
    avatar: "AJ",
  },
  {
    id: 4,
    sender: "You",
    message:
      "Actually, yes! Some help with testing would be fantastic. Could you review the user authentication flow?",
    time: "2:50 PM",
    isUser: true,
    avatar: "JD",
  },
  {
    id: 5,
    sender: "Alice Johnson",
    message:
      "I'll start on that tomorrow morning and have feedback by end of day. I'll also check the mobile responsiveness.",
    time: "2:52 PM",
    isUser: false,
    avatar: "AJ",
  },
  {
    id: 6,
    sender: "You",
    message:
      "Perfect! That would be really helpful. Let me know if you need access to any specific environments.",
    time: "2:55 PM",
    isUser: true,
    avatar: "JD",
  },
  {
    id: 7,
    sender: "Alice Johnson",
    message:
      "I should have access to everything, but I'll reach out if I run into any issues. Thanks!",
    time: "2:57 PM",
    isUser: false,
    avatar: "AJ",
  },
  {
    id: 8,
    sender: "You",
    message: "Sounds good! Looking forward to your feedback.",
    time: "3:00 PM",
    isUser: true,
    avatar: "JD",
  },
];

export function Messages() {
  const [selectedMessage, setSelectedMessage] = useState(MESSAGES[0]);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMessages = MESSAGES.filter(
    (message) =>
      message.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-5 gap-2">
      {/* Messages List */}
      <div className="lg:col-span-2 h-full">
        <div className="bg-card border-r border-border h-full flex flex-col">
          <div className="border-b border-border p-4 flex gap-2 ">
            <div className="relative flex w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full bg-background border-border focus:border-primary/50 focus:ring-primary/20 h-10 rounded-none"
              />
            </div>
            {/* <Button className="font-medium h-10 rounded-none">
              <Plus className="mr-2 h-4 w-4" />
              New Message
            </Button> */}
          </div>
          <ScrollArea className="overflow-y-auto h-[700px]">
            {filteredMessages.map((message) => (
              <div
                key={message.id}
                onClick={() => setSelectedMessage(message)}
                className={`p-4 border-b border-border cursor-pointer transition-all duration-200 hover:bg-accent/50 ${
                  selectedMessage.id === message.id
                    ? "bg-accent/30 border-l-2 border-l-primary"
                    : ""
                } ${message.unread ? "bg-primary/5" : ""}`}
              >
                <div className="flex items-start space-x-3">
                  <Avatar className="h-11 w-11 border border-border">
                    <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-sm">
                      {message.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p
                        className={`font-medium truncate text-foreground ${
                          message.unread ? "font-semibold" : ""
                        }`}
                      >
                        {message.sender}
                      </p>
                      <div className="flex items-center space-x-2 ml-2">
                        {message.unread && (
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        )}
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {message.time}
                        </span>
                      </div>
                    </div>
                    <p
                      className={`text-sm mb-2 truncate text-foreground ${
                        message.unread ? "font-medium" : ""
                      }`}
                    >
                      {message.subject}
                    </p>
                    <p className="text-sm text-muted-foreground truncate leading-relaxed">
                      {message.preview}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>
      </div>

      {/* Message View */}
      <div className="lg:col-span-3 h-full">
        <div className="bg-card border-l border-border h-full flex flex-col">
          {/* Fixed Header */}
          <div className="border-b border-border p-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12 border border-border">
                  <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                    {selectedMessage.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-xl text-card-foreground">
                    {selectedMessage.sender}
                  </h3>
                  <div className="flex items-center space-x-3 mt-1">
                    <p className="text-sm text-muted-foreground">
                      {selectedMessage.subject}
                    </p>
                    <span className="text-xs text-muted-foreground">•</span>
                    <p className="text-sm text-muted-foreground">
                      {selectedMessage.time}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Scrollable Conversation Messages */}
          <ScrollArea className="p-4 overflow-y-auto h-[700px]">
            <div className="space-y-4">
              {CONVERSATION_MESSAGES.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`flex items-start space-x-3 max-w-[80%] ${
                      msg.isUser ? "flex-row-reverse space-x-reverse" : ""
                    }`}
                  >
                    <Avatar className="h-8 w-8 border border-border flex-shrink-0">
                      <AvatarFallback className="bg-muted text-muted-foreground font-medium text-xs">
                        {msg.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`${msg.isUser ? "text-right" : "text-left"}`}
                    >
                      <div
                        className={`rounded-lg p-4 ${
                          msg.isUser
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 border border-border text-foreground"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.message}</p>
                      </div>
                      <div
                        className={`flex items-center space-x-2 mt-2 ${
                          msg.isUser ? "justify-end" : "justify-start"
                        }`}
                      >
                        <p className="text-xs text-muted-foreground">
                          {msg.sender}
                        </p>
                        <span className="text-xs text-muted-foreground">•</span>
                        <p className="text-xs text-muted-foreground">
                          {msg.time}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Fixed Reply Input */}
          <div className="border-t flex items-center gap-2  border-border p-4">
            <Input className="rounded-none h-10" />
            <Button className="h-10 rounded-none">
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
