import { GuidebookPageClient } from "./page-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Guidebook | Weetoo",
  description: "Admin Guidebook | Weetoo",
};

export default function GuidebookPage() {
  return <GuidebookPageClient />;
}
