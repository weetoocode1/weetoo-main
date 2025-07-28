"use client";

import { useState } from "react";
import { AddAdminDialog } from "./add-admin-dialog";
import { AdminCard } from "./admin-card";
import { DeleteAdminDialog } from "./delete-admin-dialog";

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "admin";
  avatar: string;
  lastActive: string;
  status: "active" | "inactive";
}

// Sample admin data
const getAdminUsers = (): Admin[] => [
  {
    id: "1",
    name: "John Doe",
    email: "john.doe@example.com",
    role: "super_admin" as const,
    avatar: "",
    lastActive: "2024-03-20T10:30:00",
    status: "active",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane.smith@example.com",
    role: "admin" as const,
    avatar: "",
    lastActive: "2024-03-20T09:15:00",
    status: "active",
  },
  {
    id: "3",
    name: "Mike Johnson",
    email: "mike.johnson@example.com",
    role: "admin" as const,
    avatar: "",
    lastActive: "2024-03-19T16:45:00",
    status: "inactive",
  },
];

export function AdminSettingsPage() {
  const [admins, setAdmins] = useState<Admin[]>(getAdminUsers());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<string | null>(null);

  const handleAddAdmin = (newAdmin: {
    name: string;
    email: string;
    role: "super_admin" | "admin";
  }) => {
    const adminData: Admin = {
      id: String(admins.length + 1),
      name: newAdmin.name,
      email: newAdmin.email,
      role: newAdmin.role,
      avatar: "",
      lastActive: new Date().toISOString(),
      status: "active",
    };
    setAdmins([...admins, adminData]);
  };

  const handleDeleteAdmin = () => {
    if (adminToDelete) {
      setAdmins(admins.filter((admin) => admin.id !== adminToDelete));
      setAdminToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleRoleChange = (
    adminId: string,
    newRole: "admin" | "super_admin"
  ) => {
    setAdmins(
      admins.map((admin) =>
        admin.id === adminId ? { ...admin, role: newRole } : admin
      )
    );
  };

  return (
    <div className="container mx-auto space-y-5 px-4 sm:px-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border mt-5 gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold">Admin Settings</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage admin roles and permissions across the platform.
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <AddAdminDialog onAddAdmin={handleAddAdmin} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {admins.map((admin) => (
          <AdminCard
            key={admin.id}
            admin={admin}
            onRoleChange={(adminId: string, newRole: string) =>
              handleRoleChange(adminId, newRole as "admin" | "super_admin")
            }
            onDelete={(id) => {
              setAdminToDelete(id);
              setIsDeleteDialogOpen(true);
            }}
          />
        ))}
      </div>

      <DeleteAdminDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteAdmin}
      />
    </div>
  );
}
