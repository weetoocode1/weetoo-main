import { ManagePostStats } from "./manage-post-stats";
import { ManagePostTable } from "./manage-post-table";

export function ManagePostPage() {
  return (
    <div className="space-y-4">
      <ManagePostStats />
      <ManagePostTable />
    </div>
  );
}
