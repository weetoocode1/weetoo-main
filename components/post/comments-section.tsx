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
import { User, PostComment } from "@/types/post";
import { MoreVertical } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useRealtimeUpdates } from "@/hooks/use-realtime-updates";
import { useAuth } from "@/hooks/use-auth";

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
  const t = useTranslations("post");
  const { isAdmin } = useAuth();
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
      if (!res.ok) throw new Error(t("failedAddComment"));
      const data = await res.json();
      // Comments are now sorted by the API (newest first)
      setComments(data);
      // Update the parent component's comment count
      updateCommentCount(data.length);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("failedAddComment"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line
  }, [postId]);

  // Set up realtime updates for comments (only after hydration)
  useRealtimeUpdates({
    postId,
    onCommentUpdate: () => {
      console.log("🔄 Realtime comment update triggered");
      // Use fetchComments which now includes proper sorting
      fetchComments();
    },
  });

  // Add comment or reply
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !currentUser) return;
    setSubmitting(true);

    const newComment: PostComment = {
      id: `temp-${Date.now()}`, // Temporary ID for optimistic update
      post_id: postId,
      user_id: currentUser.id,
      content: commentInput.trim(),
      parent_id: replyTo,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: {
        id: currentUser.id,
        first_name: currentUser.first_name,
        last_name: currentUser.last_name,
        nickname: currentUser.nickname,
        avatar_url: currentUser.avatar_url,
      },
      replies: [],
    };

    // Optimistically add comment to local state
    if (replyTo) {
      // Add as reply to parent comment
      setComments((prevComments) =>
        prevComments.map((comment) =>
          comment.id === replyTo
            ? { ...comment, replies: [...(comment.replies || []), newComment] }
            : comment
        )
      );
    } else {
      // Add as top-level comment
      setComments((prevComments) => [newComment, ...prevComments]);
    }

    // Update comment count immediately
    updateCommentCount((commentCount || comments.length) + 1);

    const commentText = commentInput.trim();
    setCommentInput("");
    setReplyTo(null);

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: commentText,
          parent_id: replyTo,
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Failed to add comment");
      }

      const { comment: savedComment } = await res.json();

      // Replace temporary comment with real comment from server
      if (replyTo) {
        setComments((prevComments) =>
          prevComments.map((comment) =>
            comment.id === replyTo
              ? {
                  ...comment,
                  replies:
                    comment.replies?.map((reply) =>
                      reply.id === newComment.id ? savedComment : reply
                    ) || [],
                }
              : comment
          )
        );
      } else {
        setComments((prevComments) =>
          prevComments.map((comment) =>
            comment.id === newComment.id ? savedComment : comment
          )
        );
      }

      toast.success(t("commentAdded"));
    } catch (err: unknown) {
      // Revert optimistic update on error
      if (replyTo) {
        setComments((prevComments) =>
          prevComments.map((comment) =>
            comment.id === replyTo
              ? {
                  ...comment,
                  replies:
                    comment.replies?.filter(
                      (reply) => reply.id !== newComment.id
                    ) || [],
                }
              : comment
          )
        );
      } else {
        setComments((prevComments) =>
          prevComments.filter((comment) => comment.id !== newComment.id)
        );
      }

      // Revert comment count
      updateCommentCount((commentCount || comments.length) - 1);

      // Restore the comment text
      setCommentInput(commentText);
      if (replyTo) setReplyTo(replyTo);

      toast.error(err instanceof Error ? err.message : t("failedAddComment"));
    } finally {
      setSubmitting(false);
    }
  };

  // Delete comment
  const handleDelete = async (commentId: string) => {
    setDeleting(commentId);

    // Find the comment to delete and count total comments (including replies)
    const findCommentAndCount = (
      comments: PostComment[],
      targetId: string
    ): { comment: PostComment | null; totalCount: number } => {
      for (const comment of comments) {
        if (comment.id === targetId) {
          return { comment, totalCount: 1 + (comment.replies?.length || 0) };
        }
        if (comment.replies) {
          const found = findCommentAndCount(comment.replies, targetId);
          if (found.comment) {
            return { comment: found.comment, totalCount: found.totalCount };
          }
        }
      }
      return { comment: null, totalCount: 0 };
    };

    const { comment: commentToDelete, totalCount } = findCommentAndCount(
      comments,
      commentId
    );

    if (!commentToDelete) {
      setDeleting(null);
      return;
    }

    // Optimistically remove comment from local state
    const removeCommentFromState = (
      comments: PostComment[],
      targetId: string
    ): PostComment[] => {
      return comments
        .filter((comment) => comment.id !== targetId)
        .map((comment) => ({
          ...comment,
          replies: comment.replies
            ? removeCommentFromState(comment.replies, targetId)
            : [],
        }));
    };

    setComments((prevComments) =>
      removeCommentFromState(prevComments, commentId)
    );
    updateCommentCount((commentCount || comments.length) - totalCount);

    try {
      const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Failed to delete comment");
      }

      toast.success(t("commentDeleted"));
    } catch (err: unknown) {
      // Revert optimistic update on error by refetching comments
      await fetchComments();

      toast.error(
        err instanceof Error ? err.message : t("failedDeleteComment")
      );
    } finally {
      setDeleting(null);
    }
  };

  // Admin delete comment
  const handleAdminDelete = async (commentId: string) => {
    setDeleting(commentId);

    // Find the comment to delete and count total comments (including replies)
    const findCommentAndCount = (
      comments: PostComment[],
      targetId: string
    ): { comment: PostComment | null; totalCount: number } => {
      for (const comment of comments) {
        if (comment.id === targetId) {
          return { comment, totalCount: 1 + (comment.replies?.length || 0) };
        }
        if (comment.replies) {
          const found = findCommentAndCount(comment.replies, targetId);
          if (found.comment) {
            return { comment: found.comment, totalCount: found.totalCount };
          }
        }
      }
      return { comment: null, totalCount: 0 };
    };

    const { comment: commentToDelete } = findCommentAndCount(
      comments,
      commentId
    );

    if (!commentToDelete) {
      setDeleting(null);
      return;
    }

    // Optimistically mark comment as deleted by admin
    const markCommentAsAdminDeleted = (
      comments: PostComment[],
      targetId: string
    ): PostComment[] => {
      return comments.map((comment) => {
        if (comment.id === targetId) {
          return {
            ...comment,
            content: t("adminDeleted"),
            deleted_by_admin: true,
            deleted_at: new Date().toISOString(),
            deleted_by_user_id: currentUser?.id || "",
            user: {
              ...comment.user,
              first_name: "Admin",
              last_name: "",
              nickname: "Administrator",
            },
          };
        }
        if (comment.replies) {
          return {
            ...comment,
            replies: markCommentAsAdminDeleted(comment.replies, targetId),
          };
        }
        return comment;
      });
    };

    setComments((prevComments) =>
      markCommentAsAdminDeleted(prevComments, commentId)
    );

    try {
      const res = await fetch(
        `/api/posts/${postId}/comments/${commentId}/admin`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Failed to delete comment as admin");
      }

      toast.success(t("commentDeleted"));
    } catch (err: unknown) {
      // Revert optimistic update on error by refetching comments
      await fetchComments();

      toast.error(
        err instanceof Error ? err.message : t("failedDeleteComment")
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
    const canReply = !!currentUser && depth < 1 && !comment.deleted_by_admin;
    const isAdminDeleted = comment.deleted_by_admin;
    const formattedDate = formatDateString(comment.created_at);
    const canAdminDelete = isAdmin && !isOwn && !isAdminDeleted;

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
              {isAdminDeleted && (
                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                  {t("moderatedByAdmin")}
                </span>
              )}
              {(isOwn || canAdminDelete) && (
                <div className="ml-auto flex items-center">
                  <DropdownMenu modal={false}>
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
                      {isOwn && !isAdminDeleted && (
                        <DropdownMenuItem asChild>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                className="w-full text-left text-red-600 hover:bg-muted px-3 py-1 rounded-md cursor-pointer"
                                type="button"
                              >
                                {t("delete")}
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {t("deleteCommentQ")}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("deleteCommentDesc")}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  {t("cancel")}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                  onClick={() => handleDelete(comment.id)}
                                >
                                  {t("delete")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuItem>
                      )}
                      {canAdminDelete && (
                        <DropdownMenuItem asChild>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                className="w-full text-left text-orange-600 hover:bg-muted px-3 py-1 rounded-md cursor-pointer"
                                type="button"
                              >
                                {t("adminDelete")}
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {t("adminDeleteCommentQ")}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("adminDeleteCommentDesc")}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  {t("cancel")}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-orange-600 hover:bg-orange-700 text-white"
                                  onClick={() => handleAdminDelete(comment.id)}
                                >
                                  {t("adminDelete")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
            <div
              className={`whitespace-pre-line break-words ${
                isAdminDeleted
                  ? "text-muted-foreground italic text-sm py-2"
                  : "text-foreground"
              }`}
            >
              {isAdminDeleted ? t("adminDeleted") : comment.content}
            </div>
            {canReply && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs px-2 py-0.5 h-6 mt-1"
                onClick={() => setReplyTo(comment.id)}
                disabled={replyTo === comment.id}
              >
                {t("reply")}
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
                  placeholder={t("writeAReply")}
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
                  {submitting ? t("replying") : t("reply")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setReplyTo(null)}
                  disabled={submitting}
                >
                  {t("cancel")}
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
          t("commentCount", {
            count: commentCount || comments.length,
            label:
              (commentCount || comments.length) !== 1
                ? t("comments")
                : t("comment"),
          })
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
              placeholder={t("commentAddPlaceholder")}
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
              {submitting ? t("commenting") : t("comment")}
            </Button>
          </form>
        )
      ) : (
        <div className="mb-6 text-muted-foreground text-sm">
          {t("signInToComment")}
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
          <div className="text-muted-foreground">{t("noComments")}</div>
        ) : (
          comments.map((comment) => renderComment(comment))
        )}
      </div>
    </section>
  );
};
