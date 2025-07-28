"use client";

import { Icons } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Check, Copy, Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SharePostProps {
  post: {
    title: string;
    id: string;
    board: string;
  };
  className?: string;
}

export function SharePost({ post, className }: SharePostProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const postUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${post.board}/${post.id}`
      : "";

  const shareData = {
    title: post.title,
    url: postUrl,
    text: `Check out this post: ${post.title}`,
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
      setIsOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to copy link");
    }
  };

  const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(
    shareData.text
  )}&url=${encodeURIComponent(shareData.url)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareData.url
  )}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `${shareData.text} ${shareData.url}`
  )}`;

  const shareOptions = [
    {
      name: "Copy Link",
      icon: copied ? Check : Copy,
      onClick: handleCopyLink,
      color: "bg-blue-500 hover:bg-blue-600",
      description: "Copy the link",
      type: "button",
    },
    {
      name: "Twitter",
      icon: Icons.twitter,
      href: twitterUrl,
      color: "bg-black hover:bg-gray-800",
      description: "Share on Twitter/X",
      type: "link",
    },
    {
      name: "Facebook",
      icon: Icons.facebook,
      href: facebookUrl,
      color: "bg-blue-600 hover:bg-blue-700",
      description: "Share on Facebook",
      type: "link",
    },
    {
      name: "WhatsApp",
      icon: Icons.whatsapp,
      href: whatsappUrl,
      color: "bg-green-500 hover:bg-green-600",
      description: "Share on WhatsApp",
      type: "link",
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "flex items-center gap-1.5 hover:text-primary transition",
            className
          )}
        >
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Post
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Post Preview */}
          <div className="p-3 bg-muted/50 rounded-lg border">
            <h3 className="font-semibold text-sm line-clamp-2 mb-1">
              {post.title}
            </h3>
            <p className="text-xs text-muted-foreground">{postUrl}</p>
          </div>

          {/* Share Options Grid */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {shareOptions.map((option) =>
                option.type === "button" ? (
                  <button
                    key={option.name}
                    onClick={option.onClick}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all hover:shadow-md hover:-translate-y-0.5",
                      "bg-background hover:bg-muted/50"
                    )}
                  >
                    <div className={cn("p-2 rounded-md", option.color)}>
                      <option.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">{option.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {option.description}
                      </div>
                    </div>
                  </button>
                ) : (
                  <a
                    key={option.name}
                    href={option.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all hover:shadow-md hover:-translate-y-0.5",
                      "bg-background hover:bg-muted/50"
                    )}
                  >
                    <div className={cn("p-2 rounded-md", option.color)}>
                      <option.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium">{option.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {option.description}
                      </div>
                    </div>
                  </a>
                )
              )}
            </div>
          </div>

          {/* Quick Share Stats */}
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Share this post with your network</span>
              <Badge variant="secondary" className="text-xs">
                Public
              </Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
