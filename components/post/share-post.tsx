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
import { useTranslations } from "next-intl";

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
  const t = useTranslations("post");

  const postUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${post.board}/${post.id}`
      : "";

  const shareData = {
    title: post.title,
    url: postUrl,
    text: `${post.title}`,
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      toast.success(t("linkCopied"));
      // Try to award share reward and show toast
      try {
        const res = await fetch(`/api/posts/${post.id}/share`, {
          method: "POST",
        });
        const data = await res.json();
        if (data?.reward) {
          const exp = data.reward.exp_delta ?? 0;
          const kor = data.reward.kor_delta ?? 0;
          if (exp > 0 || kor > 0) {
            toast.success(t("rewardEarned", { exp, kor }));
          }
        } else if (data?.error) {
          toast.error(data.error);
        }
      } catch (err: Error | unknown) {
        toast.error(err instanceof Error ? err.message : t("failedAwardShare"));
      }
      setTimeout(() => setCopied(false), 2000);
      setIsOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("failedCopyLink"));
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
      name: t("copyLink"),
      icon: copied ? Check : Copy,
      onClick: handleCopyLink,
      color: "bg-blue-500 hover:bg-blue-600",
      description: t("copyLinkDesc"),
      type: "button",
    },
    {
      name: t("twitter"),
      icon: Icons.twitter,
      href: twitterUrl,
      color: "bg-black hover:bg-gray-800",
      description: t("twitterDesc"),
      type: "link",
    },
    {
      name: t("facebook"),
      icon: Icons.facebook,
      href: facebookUrl,
      color: "bg-blue-600 hover:bg-blue-700",
      description: t("facebookDesc"),
      type: "link",
    },
    {
      name: t("whatsapp"),
      icon: Icons.whatsapp,
      href: whatsappUrl,
      color: "bg-green-500 hover:bg-green-600",
      description: t("whatsappDesc"),
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
          {t("share")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            {t("sharePost")}
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
                    onClick={async () => {
                      setIsOpen(false);
                      try {
                        const res = await fetch(`/api/posts/${post.id}/share`, {
                          method: "POST",
                        });
                        const data = await res.json();
                        if (data?.reward) {
                          const exp = data.reward.exp_delta ?? 0;
                          const kor = data.reward.kor_delta ?? 0;
                          if (exp > 0 || kor > 0) {
                            toast.success(
                              `Reward earned: +${exp} EXP, +${kor} KOR`
                            );
                          }
                        } else if (data?.error) {
                          toast.error(data.error);
                        }
                      } catch (err: Error | unknown) {
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : "Failed to award share"
                        );
                      }
                    }}
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
              <span>{t("shareThisPost")}</span>
              <Badge variant="secondary" className="text-xs">
                {t("public")}
              </Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
