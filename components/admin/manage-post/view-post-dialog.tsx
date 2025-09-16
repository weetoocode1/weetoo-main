"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { AlertTriangle, Calendar, FileText, TrendingUp } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

interface Post {
  id: string;
  board: string;
  title: string;
  excerpt: string | null;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  views: number;
  likes: number;
  comments: number;
  images: string[] | null;
  tags: string[] | null;
  author?: {
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
}

interface ViewPostDialogProps {
  post: Post;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewPostDialog({
  post,
  open,
  onOpenChange,
}: ViewPostDialogProps) {
  const t = useTranslations("admin.managePosts.viewDialog");
  const getBoardConfig = (board: string) => {
    const configs = {
      "free-board": {
        label: "Free Board",
        color: "bg-blue-50/80 text-blue-700 border border-blue-200/60",
        icon: FileText,
      },
      "education-board": {
        label: "Education Board",
        color: "bg-green-50/80 text-green-700 border border-green-200/60",
        icon: TrendingUp,
      },
      "profit-board": {
        label: "Profit Board",
        color: "bg-purple-50/80 text-purple-700 border border-purple-200/60",
        icon: AlertTriangle,
      },
    };
    return (
      configs[board as keyof typeof configs] || {
        label: board,
        color: "bg-muted/80 text-muted-foreground border border-border/60",
        icon: FileText,
      }
    );
  };

  const boardConfig = getBoardConfig(post.board);
  // const BoardIcon = boardConfig.icon;
  const authorName =
    post.author && post.author.first_name && post.author.last_name
      ? `${post.author.first_name} ${post.author.last_name}`
      : t("unknownAuthor");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full lg:max-w-[45rem] h-[90vh] bg-background p-0 flex flex-col gap-0">
        <DialogTitle asChild>
          <VisuallyHidden>{t("aria.title")}</VisuallyHidden>
        </DialogTitle>
        {/* Fixed Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-border/30">
          {/* Title */}
          <h1 className="text-3xl font-bold text-foreground leading-tight mb-4">
            {post.title}
          </h1>

          {/* Author Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author?.avatar_url} />
              <AvatarFallback className="bg-muted text-muted-foreground">
                {post.author?.first_name?.[0]}
                {post.author?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium text-foreground">{authorName}</div>
              <div className="text-sm text-muted-foreground">
                {new Date(post.created_at).toLocaleDateString("en-GB", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-none">
          <div className="space-y-4">
            {/* Images */}
            {post.images && post.images.length > 0 && (
              <div className="w-full ">
                <div className="grid grid-cols-1 gap-4 w-full">
                  {post.images.map((image, index) => (
                    <div
                      key={index}
                      className="relative aspect-video overflow-hidden bg-muted/20 w-full h-[300px]"
                    >
                      <Image
                        src={image}
                        alt={`Post image ${index + 1}`}
                        fill
                        className="object-cover"
                        placeholder="blur"
                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXXGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                        priority={index === 0}
                        loading={index === 0 ? "eager" : "lazy"}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="rounded-none bg-muted text-foreground border border-border hover:bg-muted/80"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Content */}
            <div>
              <div className="prose prose-lg max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {post.content}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 p-6 pt-4 border-t border-border/30 bg-muted/10">
          <div className="w-full space-y-4 text-sm">
            {/* Row 1: Board | Created | ID */}
            <div className="grid grid-cols-3 gap-6">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {t("footer.board")}:
                </span>
                <span className="font-medium">{boardConfig.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {t("footer.created")}:
                </span>
                <span className="font-medium">
                  {new Date(post.created_at).toLocaleDateString("en-GB", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{t("footer.id")}:</span>
                <span className="font-medium font-mono text-xs">{post.id}</span>
              </div>
            </div>

            {/* Row 2: Views | Likes | Comments */}
            <div className="grid grid-cols-3 gap-6">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {t("footer.views")}:
                </span>
                <span className="font-medium">{post.views}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {t("footer.likes")}:
                </span>
                <span className="font-medium">{post.likes}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {t("footer.comments")}:
                </span>
                <span className="font-medium">{post.comments}</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
