"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, formatDistanceToNow } from "date-fns";
import { Calendar, Eye, ImageIcon } from "lucide-react";
import Image from "next/image";
import { memo, useState } from "react";

interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  status: string;
  view_count: number;
  created_at: string;
  user: {
    first_name: string;
    last_name: string;
    avatar_url: string;
  };
  tags: string[];
  featured_images: string[];
}

interface PostDetailsDialogProps {
  post: Post;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (postId: string) => Promise<void>;
  onReject: (postId: string) => Promise<void>;
}

// Use memo to prevent unnecessary re-renders
export const PostDetailsDialog = memo(function PostDetailsDialog({
  post,
  open,
  onOpenChange,
  onApprove,
  onReject,
}: PostDetailsDialogProps) {
  // const [, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);

  // const handleApprove = async () => {
  //   if (!onApprove) return;
  //   setIsApproving(true);
  //   try {
  //     await onApprove(post.id);
  //     onOpenChange(false);
  //   } finally {
  //     setIsApproving(false);
  //   }
  // };

  const handleRejectConfirm = async () => {
    if (!onReject) return;
    setIsRejecting(true);
    try {
      await onReject(post.id);
      setRejectConfirmOpen(false);
      onOpenChange(false);
    } finally {
      setIsRejecting(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return format(date, "PP");
  };

  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase();
  };

  const authorName = post.user
    ? `${post.user.first_name || ""} ${post.user.last_name || ""}`.trim()
    : "Anonymous";

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "approved":
        return "default";
      case "hidden":
        return "destructive";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post Details</DialogTitle>
            <DialogDescription>View and manage post details</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="secondary"
                className="bg-blue-100 text-blue-700 rounded-md"
              >
                {post.category}
              </Badge>
              {post.tags?.map((tag, index) => (
                <Badge key={index} variant="outline" className="rounded-md">
                  {tag}
                </Badge>
              ))}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold break-words">
              {post.title}
            </h2>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={post.user?.avatar_url || ""}
                    alt={authorName}
                  />
                  <AvatarFallback>{getInitials(authorName)}</AvatarFallback>
                </Avatar>
                <span className="break-words">{authorName}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                <span title={formatDate(post.created_at)}>
                  {formatDistanceToNow(new Date(post.created_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              <div className="flex items-center">
                <Eye className="h-4 w-4 mr-1" />
                <span>{post.view_count} views</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                {post.featured_images && post.featured_images.length > 0 ? (
                  <Image
                    src={post.featured_images[0]}
                    alt={post.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
                )}
              </div>

              <div className="prose prose-sm max-w-none dark:prose-invert">
                <p className="whitespace-pre-wrap break-words">
                  {post.content}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge
                variant={getStatusVariant(post.status)}
                className="capitalize"
              >
                {post.status}
              </Badge>
            </div>
          </div>

          <DialogFooter className="flex flex-wrap gap-2 sm:gap-0">
            {post.status === "pending" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => onReject(post.id)}
                  className="w-full sm:w-auto"
                >
                  Reject
                </Button>
                <Button
                  onClick={() => onApprove(post.id)}
                  className="w-full sm:w-auto"
                >
                  Approve
                </Button>
              </>
            )}
            {post.status === "approved" && (
              <Button
                variant="outline"
                onClick={() => onReject(post.id)}
                className="w-full sm:w-auto"
              >
                Hide Post
              </Button>
            )}
            {post.status === "hidden" && (
              <Button
                onClick={() => onApprove(post.id)}
                className="w-full sm:w-auto"
              >
                Show Post
              </Button>
            )}
            {post.status === "rejected" && (
              <Button
                onClick={() => onApprove(post.id)}
                className="w-full sm:w-auto"
              >
                Approve
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={rejectConfirmOpen} onOpenChange={setRejectConfirmOpen}>
        <AlertDialogContent className="flex flex-col">
          <AlertDialogHeader className="sticky top-0 z-10 bg-background">
            <AlertDialogTitle>
              Are you sure you want to reject this post?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action will mark the post as rejected. The post will not be
              visible to users and the author will not be able to edit it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sticky bottom-0 z-10 bg-background mt-4">
            <AlertDialogCancel disabled={isRejecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRejectConfirm();
              }}
              disabled={isRejecting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isRejecting ? "Rejecting..." : "Reject Post"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});
