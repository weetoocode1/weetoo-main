import { Metadata } from "next";
import { ActivityLogPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Activity Log | Weetoo",
  description: "Activity Log | Weetoo",
};

export default function ActivityLogPage() {
  return <ActivityLogPageClient />;
}
