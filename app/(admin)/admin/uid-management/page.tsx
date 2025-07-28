import { UidManagementPage } from "@/components/admin/uid-management/uid-management-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin UID Management | Weetoo",
  description: "Manage user IDs and permissions in the Weetoo admin panel.",
};

export default function UIDManagement() {
  return (
    <div className="container mx-auto space-y-5">
      <UidManagementPage />
    </div>
  );
}
