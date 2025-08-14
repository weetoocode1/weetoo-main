import { Metadata } from "next";
import { PermissionsPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "Permissions | Weetoo",
  description: "Permissions | Weetoo",
};

export default function PermissionsPage() {
  return <PermissionsPageClient />;
}
