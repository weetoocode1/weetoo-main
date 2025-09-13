"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  AlertTriangle,
  Book,
  FileText,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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

interface DeletePostDialogProps {
  post: Post;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostDeleted: () => void;
}

export function DeletePostDialog({
  post,
  open,
  onOpenChange,
  onPostDeleted,
}: DeletePostDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const getBoardConfig = (board: string) => {
    const configs = {
      free: {
        label: "Free Board",
        color: "bg-blue-50/80 text-blue-700 border border-blue-200/60",
        icon: FileText,
      },
      education: {
        label: "Education Board",
        color: "bg-green-50/80 text-green-700 border border-green-200/60",
        icon: Book,
      },
      profit: {
        label: "Profit Board",
        color: "bg-purple-50/80 text-purple-700 border border-purple-200/60",
        icon: TrendingUp,
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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const supabase = createClient();

      const { error } = await supabase.from("posts").delete().eq("id", post.id);

      if (error) {
        throw error;
      }

      toast.success("Post deleted successfully!");
      onPostDeleted();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full lg:max-w-[45rem] h-[70vh] bg-background p-0 flex flex-col gap-0">
        <DialogTitle asChild>
          <VisuallyHidden>Delete Post</VisuallyHidden>
        </DialogTitle>

        {/* Fixed Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-border/30">
          {/* Title Display */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground leading-tight">
              {post.title}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span>This post will be permanently deleted</span>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-none">
          <div className="space-y-6">
            {/* Warning Section */}
            <div className="bg-red-50/80 border border-red-200/60 rounded-none p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-700">
                  <strong className="text-sm">Warning:</strong>
                  <p className="mt-1 text-xs">
                    Deleting this post will permanently remove all content,
                    metadata, likes, comments, images, tags, and analytics. This
                    action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            {/* Post Preview */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                Post Preview
              </h3>
              <div className="bg-muted/20 border border-border/30 rounded-none p-4">
                <div className="space-y-4 text-sm">
                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-medium w-20">
                          Author:
                        </span>
                        <span className="font-medium">
                          {post.author &&
                          post.author.first_name &&
                          post.author.last_name
                            ? `${post.author.first_name} ${post.author.last_name}`
                            : "Unknown"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-medium w-20">
                          Board:
                        </span>
                        <span className="font-medium">{boardConfig.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-medium w-20">
                          Created:
                        </span>
                        <span className="font-medium">
                          {new Date(post.created_at).toLocaleDateString(
                            "en-GB",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-medium w-20">
                          Views:
                        </span>
                        <span className="font-medium">{post.views}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-medium w-20">
                          ID:
                        </span>
                        <span className="font-medium font-mono text-xs break-all">
                          {post.id}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-medium w-20">
                          Likes:
                        </span>
                        <span className="font-medium">{post.likes}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground font-medium w-20">
                          Comments:
                        </span>
                        <span className="font-medium">{post.comments}</span>
                      </div>
                    </div>
                  </div>

                  {/* Content Preview - Full Width */}
                  <div className="space-y-2 pt-2 border-t border-border/30">
                    <span className="text-muted-foreground font-medium">
                      Content Preview:
                    </span>
                    <div className="pl-0">
                      <span className="font-medium">
                        {post.content.length > 100
                          ? `${post.content.substring(0, 100)}...`
                          : post.content}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 p-6 pt-4 border-t border-border/30 bg-muted/10">
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isDeleting}
              className="rounded-none h-10"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-none h-10"
            >
              {isDeleting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Post
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
