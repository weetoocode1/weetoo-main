import { Metadata } from "next";
import { AdminClient } from "./page-client";

export const metadata: Metadata = {
  title: "Admin | Weetoo",
  description: "Admin | Weetoo",
};

export default function AdminPage() {
  return <AdminClient />;
}
