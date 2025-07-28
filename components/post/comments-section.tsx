import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { User } from "@/types/post";
import { MoreVertical } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id?: string | null;
  created_at: string;
  updated_at: string;
  is_pinned?: boolean;
  user: {
    id: string;
    first_name?: string;
    last_name?: string;
    nickname?: string;
    avatar_url?: string;
  };
  replies?: PostComment[];
}

interface CommentsSectionProps {
  postId: string;
  commentCount?: number;
  setCommentCount?: (n: number) => void;
}

// Add a utility to format dates on the client
function formatDateString(dateString: string) {
  if (!dateString) return "...";
  try {
    return new Date(dateString).toLocaleString();
  } catch {
    return dateString;
  }
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({
  postId,
  commentCount,
  setCommentCount,
}) => {
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [, setDeleting] = useState<string | null>(null);

  // For auto-growing reply textareas, map commentId to ref
  const replyInputRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>(
    {}
  );

  // Add a safe setter for commentCount
  const updateCommentCount = (n: number) => {
    if (setCommentCount) setCommentCount(n);
  };

  // Fetch current user
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user?.id) {
        const { data } = await supabase
          .from("users")
          .select("id, first_name, last_name, nickname, avatar_url")
          .eq("id", user.id)
          .single();
        setCurrentUser(data);
      }
    });
  }, []);

  // Fetch comments
  const fetchComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      const data = await res.json();
      setComments(data);
      console.log("[fetchComments] comments.length:", data.length);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch comments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line
  }, [postId]);

  // Add comment or reply
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: commentInput,
          parent_id: replyTo,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Failed to add comment");
      }
      const { commentCount: newCount } = await res.json();
      setCommentInput("");
      setReplyTo(null);
      fetchComments();
      if (typeof newCount === "number") updateCommentCount(newCount);
      toast.success("Comment added");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete comment
  const handleDelete = async (commentId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Failed to delete comment");
      }
      const { commentCount: newCount } = await res.json();
      fetchComments();
      if (typeof newCount === "number") updateCommentCount(newCount);
      toast.success("Comment deleted");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete comment"
      );
    } finally {
      setDeleting(null);
    }
  };

  // Auto-grow main comment textarea
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (commentInputRef.current) {
      commentInputRef.current.style.height = "auto";
      commentInputRef.current.style.height = `${Math.min(
        commentInputRef.current.scrollHeight,
        6 * 24
      )}px`;
    }
  }, [commentInput]);

  // Auto-grow reply textareas
  useEffect(() => {
    if (replyTo && replyInputRefs.current[replyTo]) {
      const ref = replyInputRefs.current[replyTo];
      ref!.style.height = "auto";
      ref!.style.height = `${Math.min(ref!.scrollHeight, 6 * 24)}px`;
    }
  }, [commentInput, replyTo]);

  // Render a single comment (and its replies)
  const renderComment = (comment: PostComment, depth = 0): React.ReactNode => {
    const isOwn = currentUser && comment.user_id === currentUser.id;
    const canReply = !!currentUser && depth < 1;
    const formattedDate = formatDateString(comment.created_at);
    return (
      <div
        key={comment.id}
        className={`flex flex-col gap-1 pl-${
          depth * 6
        } py-2 border-b border-border last:border-0`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Image
              src={comment.user?.avatar_url || "/logo.png"}
              alt={comment.user?.nickname || "User"}
              width={36}
              height={36}
              className="rounded-full object-cover bg-muted"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">
                {comment.user?.first_name || comment.user?.last_name
                  ? `${comment.user?.first_name || ""} ${
                      comment.user?.last_name || ""
                    }`.trim()
                  : comment.user?.nickname || "User"}
              </span>
              <span className="text-xs text-muted-foreground">
                {formattedDate}
              </span>
              {isOwn && (
                <div className="ml-auto flex items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="p-1 rounded-full text-muted-foreground  focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                        aria-label="Comment actions"
                        type="button"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button
                              className="w-full text-left text-red-600 hover:bg-muted px-3 py-1 rounded-md cursor-pointer"
                              type="button"
                            >
                              Delete
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete comment?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will
                                permanently delete your comment.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => handleDelete(comment.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
            <div className="text-base text-foreground whitespace-pre-line break-words">
              {comment.content}
            </div>
            {canReply && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs px-2 py-0.5 h-6 mt-1"
                onClick={() => setReplyTo(comment.id)}
                disabled={replyTo === comment.id}
              >
                Reply
              </Button>
            )}
            {replyTo === comment.id && (
              <form
                onSubmit={handleSubmit}
                className="flex items-center gap-2 mt-2"
              >
                <Textarea
                  ref={(el) => {
                    replyInputRefs.current[comment.id] = el;
                    // Do not return anything (void)
                  }}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 resize-none min-h-[80px] max-h-[120px]"
                  rows={2}
                  maxLength={1000}
                  disabled={submitting}
                  autoFocus
                />
                <Button
                  type="submit"
                  disabled={submitting || !commentInput.trim()}
                >
                  {submitting ? "Replying..." : "Reply"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setReplyTo(null)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </form>
            )}
          </div>
        </div>
        {/* Render replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="pl-6 mt-1">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold mb-4 text-foreground">
        {loading ? (
          <Skeleton className="w-24 h-6" />
        ) : (
          `${comments.length} Comment${comments.length !== 1 ? "s" : ""}`
        )}
      </h2>
      {/* Add comment input */}
      {currentUser ? (
        !replyTo && (
          <form onSubmit={handleSubmit} className="flex items-start gap-2 mb-6">
            <Image
              src={currentUser.avatar_url || "/logo.png"}
              alt={currentUser.nickname || "User"}
              width={36}
              height={36}
              className="rounded-full object-cover bg-muted mt-1"
            />
            <Textarea
              ref={commentInputRef}
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 resize-none min-h-[80px] max-h-[120px]"
              rows={2}
              maxLength={1000}
              disabled={submitting}
            />
            <Button
              type="submit"
              disabled={submitting || !commentInput.trim()}
              className="self-end"
            >
              {submitting ? "Commenting..." : "Comment"}
            </Button>
          </form>
        )
      ) : (
        <div className="mb-6 text-muted-foreground text-sm">
          Sign in to comment.
        </div>
      )}
      {/* Comments list */}
      <div className="space-y-0">
        {loading ? (
          <>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full mb-2" />
            ))}
          </>
        ) : error ? (
          <div className="text-destructive">{error}</div>
        ) : comments.length === 0 ? (
          <div className="text-muted-foreground">No comments yet.</div>
        ) : (
          comments.map((comment) => renderComment(comment))
        )}
      </div>
    </section>
  );
};
