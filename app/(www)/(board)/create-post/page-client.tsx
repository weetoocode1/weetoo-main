"use client";
import { CreatePostForm } from "@/components/create-post/create-post-form";
import { useSearchParams } from "next/navigation";

export function CreatePostPageClient() {
  const searchParams = useSearchParams();
  const board = searchParams.get("board");
  return <CreatePostForm board={board ?? undefined} />;
}
