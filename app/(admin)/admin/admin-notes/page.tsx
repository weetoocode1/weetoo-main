import { Metadata } from "next";
import { AdminNotesPage } from "@/components/admin/admin-notes/admin-notes-page";

// interface Note {
//   id: string;
//   title: string;
//   content: string;
//   category: string;
//   createdAt: Date;
//   updatedAt: Date;
//   createdBy: {
//     id: string;
//     name: string;
//     avatar?: string;
//   };
// }

export const metadata: Metadata = {
  title: "Admin Notes | Weetoo",
  description: "Manage admin notes and comments",
};

export default function AdminNotes() {
  return (
    <div className="container mx-auto space-y-5">
      <AdminNotesPage />
    </div>
  );
}
