import { Metadata } from "next";
import { UidManagementPageClient } from "./page-client";

export const metadata: Metadata = {
  title: "UID Management | Weetoo",
  description: "UID Management | Weetoo",
};

export default function UidManagementPage() {
  return <UidManagementPageClient />;
}
