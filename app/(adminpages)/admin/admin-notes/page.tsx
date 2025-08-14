import { Metadata } from "next";
import { AdminNotesPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Admin Notes | Weetoo",
  description: "Admin Notes | Weetoo",
};

export default function AdminNotesPage() {
  return <AdminNotesPageClient />;
}
