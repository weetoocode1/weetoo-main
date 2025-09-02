"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Book, Calendar, FileText, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
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

interface EditPostDialogProps {
  post: Post;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostUpdated: () => void;
}

export function EditPostDialog({
  post,
  open,
  onOpenChange,
  onPostUpdated,
}: EditPostDialogProps) {
  const [editFormData, setEditFormData] = useState({
    title: post.title || "",
    excerpt: post.excerpt || "",
    content: post.content || "",
    board: post.board || "free",
    tags: post.tags?.join(", ") || "",
  });
  const [isSaving, setIsSaving] = useState(false);

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

  const boardConfig = getBoardConfig(editFormData.board);
  const BoardIcon = boardConfig.icon;

  // Reset form when post changes
  useEffect(() => {
    setEditFormData({
      title: post.title || "",
      excerpt: post.excerpt || "",
      content: post.content || "",
      board: post.board || "free",
      tags: post.tags?.join(", ") || "",
    });
  }, [post]);

  const handleSave = async () => {
    if (!editFormData.title.trim() || !editFormData.content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();

      // Parse tags from comma-separated string
      const tags = editFormData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      // Update post in database
      const { error } = await supabase
        .from("posts")
        .update({
          title: editFormData.title.trim(),
          excerpt: editFormData.excerpt.trim() || null,
          content: editFormData.content.trim(),
          board: editFormData.board,
          tags: tags.length > 0 ? tags : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      if (error) {
        throw error;
      }

      toast.success("Post updated successfully!");
      onPostUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating post:", error);
      toast.error("Failed to update post. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full lg:max-w-[45rem] h-[90vh] bg-background p-0 flex flex-col gap-0">
        <DialogTitle asChild>
          <VisuallyHidden>Edit Post</VisuallyHidden>
        </DialogTitle>

        {/* Fixed Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-border/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-lg ${boardConfig.color} flex-shrink-0`}
              >
                <BoardIcon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-foreground">
                  {boardConfig.label}
                </h2>
              </div>
            </div>
          </div>

          {/* Title Input */}
          <div className="space-y-2">
            <Label
              htmlFor="title"
              className="text-sm font-medium text-foreground"
            >
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              type="text"
              value={editFormData.title || ""}
              onChange={(e) =>
                setEditFormData((prev) => ({
                  ...prev,
                  title: e.target.value,
                }))
              }
              className="h-10 rounded-none bg-muted/20 border-border"
              placeholder="Enter post title"
              required
            />
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-none">
          <div className="space-y-6">
            {/* Board Selection */}
            <div className="space-y-2">
              <Label
                htmlFor="board"
                className="text-sm font-medium text-foreground"
              >
                Board <span className="text-red-500">*</span>
              </Label>
              <Select
                value={editFormData.board || ""}
                onValueChange={(value) =>
                  setEditFormData((prev) => ({ ...prev, board: value }))
                }
              >
                <SelectTrigger className="h-10 rounded-none bg-muted/20 border-border">
                  <SelectValue placeholder="Select board" />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="free">Free Board</SelectItem>
                  <SelectItem value="education">Education Board</SelectItem>
                  <SelectItem value="profit">Profit Board</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tags Input */}
            <div className="space-y-2">
              <Label
                htmlFor="tags"
                className="text-sm font-medium text-foreground"
              >
                Tags
              </Label>
              <Input
                id="tags"
                type="text"
                value={editFormData.tags || ""}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    tags: e.target.value,
                  }))
                }
                className="h-10 rounded-none bg-muted/20 border-border"
                placeholder="Enter tags separated by commas"
              />
            </div>

            {/* Content Input */}
            <div className="space-y-2">
              <Label
                htmlFor="content"
                className="text-sm font-medium text-foreground"
              >
                Content <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="content"
                value={editFormData.content || ""}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    content: e.target.value,
                  }))
                }
                className="min-h-[300px] rounded-none resize-none bg-muted/20 border-border text-sm leading-relaxed"
                placeholder="Enter post content"
                required
              />
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 p-6 pt-4 border-t border-border/30 bg-muted/10">
          <div className="w-full space-y-4">
            {/* Row 1: Board | Created | ID */}
            <div className="grid grid-cols-3 gap-6 text-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Board:</span>
                <span className="font-medium">{boardConfig.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Created:</span>
                <span className="font-medium">
                  {new Date(post.created_at).toLocaleDateString("en-GB", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">ID:</span>
                <span className="font-medium font-mono text-xs">{post.id}</span>
              </div>
            </div>

            {/* Row 2: Views | Likes | Comments */}
            <div className="grid grid-cols-3 gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Views:</span>
                <span className="font-medium">{post.views}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Likes:</span>
                <span className="font-medium">{post.likes}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Comments:</span>
                <span className="font-medium">{post.comments}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/30">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
                className="rounded-none h-10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-none h-10"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
