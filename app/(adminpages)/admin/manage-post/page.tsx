import { Metadata } from "next";
import { ManagePostPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Manage Post | Weetoo",
  description: "Manage Post | Weetoo",
};

export default function ManagePostPage() {
  return <ManagePostPageClient />;
}
