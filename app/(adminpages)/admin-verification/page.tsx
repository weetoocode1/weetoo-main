import { Metadata } from "next";
import { AdminVerificationClient } from "./page-client";

export const metadata: Metadata = {
  title: "Admin Verification | Weetoo",
  description: "Admin Verification | Weetoo",
};

export default function AdminVerification() {
  return <AdminVerificationClient />;
}
