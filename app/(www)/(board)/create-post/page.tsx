import { Suspense } from "react";
import { CreatePostPageClient } from "./page-client";

export const metadata = {
  title: "Create Post | WEETOO",
  description:
    "Write and share your thoughts on WEETOO. Create a new post and join the conversation.",
};

export default function CreatePostPage() {
  return (
    <Suspense>
      <CreatePostPageClient />
    </Suspense>
  );
}
