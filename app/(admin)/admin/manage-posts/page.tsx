import { ManagePostsPage } from "@/components/admin/manage-posts/manage-posts-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Manage Posts | Weetoo",
  description: "Manage your posts, comments, and replies.",
};

export default function ManagePosts() {
  return (
    <div className="mx-auto container space-y-5">
      <div className="flex items-center justify-between pb-6 border-b border-border mt-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">Manage Posts</h1>
          <p className="text-muted-foreground">
            Manage your posts, comments, and replies
          </p>
        </div>
      </div>

      <ManagePostsPage />
    </div>
  );
}
