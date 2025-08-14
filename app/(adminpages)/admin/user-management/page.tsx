import { Metadata } from "next";
import { UserManagementClient } from "./page-client";

export const metadata: Metadata = {
  title: "User Management | Weetoo",
  description: "User Management | Weetoo",
};

export default function UserManagementPage() {
  return <UserManagementClient />;
}
