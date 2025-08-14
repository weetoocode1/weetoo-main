"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus } from "lucide-react";
import { useState } from "react";

// Redefine the interface locally to ensure strict type checking
interface NewAdminData {
  name: string;
  email: string;
  role: "super_admin" | "admin";
}

interface AddAdminDialogProps {
  onAddAdmin: (admin: NewAdminData) => void;
}

export function AddAdminDialog({ onAddAdmin }: AddAdminDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState<NewAdminData>({
    name: "",
    email: "",
    role: "admin",
  });

  const handleAddAdmin = () => {
    onAddAdmin(newAdmin);
    setNewAdmin({ name: "", email: "", role: "admin" });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Admin
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] w-[95vw]">
        <DialogHeader>
          <DialogTitle>Add New Admin</DialogTitle>
          <DialogDescription>
            Add a new admin user to the platform. They will receive an email
            with login instructions.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name" className="text-sm">
              Name
            </Label>
            <Input
              id="name"
              value={newAdmin.name}
              onChange={(e) =>
                setNewAdmin({ ...newAdmin, name: e.target.value })
              }
              className="text-sm"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email" className="text-sm">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={newAdmin.email}
              onChange={(e) =>
                setNewAdmin({ ...newAdmin, email: e.target.value })
              }
              className="text-sm"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role" className="text-sm">
              Role
            </Label>
            <Select
              value={newAdmin.role}
              onValueChange={(value: "super_admin" | "admin") =>
                setNewAdmin({ ...newAdmin, role: value })
              }
            >
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button onClick={handleAddAdmin} className="w-full sm:w-auto">
            Add Admin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
