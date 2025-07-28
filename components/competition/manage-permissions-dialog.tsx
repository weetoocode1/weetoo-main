"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Shield, Users, ChevronDownIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { ScrollArea } from "../ui/scroll-area";
import { toast } from "sonner";

interface ManagePermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPermissionsChange?: () => void; // Callback to notify parent of permission changes
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface Permission {
  userId: string;
  name: string;
  email: string;
  grantedAt: string;
}

export function ManagePermissionsDialog({
  open,
  onOpenChange,
  onPermissionsChange,
}: ManagePermissionsDialogProps) {
  const [, setSearchValue] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [usersWithAccess, setUsersWithAccess] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [, setLoading] = useState(false);
  const [, setPermissionsLoading] = useState(false);

  // Fetch all users and permissions on dialog open
  useEffect(() => {
    if (open) {
      fetchUsers();
      fetchPermissions();
    }
  }, [open]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/users");
      const data = await response.json();

      if (response.ok && data.users) {
        setAllUsers(data.users);
      } else {
        console.error("Failed to fetch users:", data.error);
        // Don't show toast error if we have data
        if (!data.users || data.users.length === 0) {
          toast.error("Failed to fetch users");
        }
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    setPermissionsLoading(true);
    try {
      const response = await fetch("/api/competition-permissions");
      const data = await response.json();

      if (response.ok && data.permissions) {
        setUsersWithAccess(data.permissions.map((p: Permission) => p.userId));
      } else {
        console.error("Failed to fetch permissions:", data.error);
        // Don't show toast error if we have data
        if (!data.permissions || data.permissions.length === 0) {
          toast.error("Failed to fetch permissions");
        }
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
      toast.error("Failed to fetch permissions");
    } finally {
      setPermissionsLoading(false);
    }
  };

  const handlePermissionsCancel = () => {
    onOpenChange(false);
    setSearchValue("");
    setSelectedUser(null);
  };

  const handlePermissionsSubmit = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch("/api/competition-permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUser,
          action: "grant",
        }),
      });

      if (response.ok) {
        toast.success("Permission granted successfully");
        fetchPermissions(); // Refresh the permissions list
        onOpenChange(false);
        setSearchValue("");
        setSelectedUser(null);
        onPermissionsChange?.(); // Notify parent of permission change
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to grant permission");
      }
    } catch (error) {
      console.error("Error granting permission:", error);
      toast.error("Failed to grant permission");
    }
  };

  const handleRevokeAccess = async (userId: string) => {
    try {
      const response = await fetch("/api/competition-permissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          action: "revoke",
        }),
      });

      if (response.ok) {
        toast.success("Permission revoked successfully");
        fetchPermissions(); // Refresh the permissions list
        onPermissionsChange?.(); // Notify parent of permission change
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to revoke permission");
      }
    } catch (error) {
      console.error("Error revoking permission:", error);
      toast.error("Failed to revoke permission");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-none h-10">
          <Shield className="w-4 h-4 mr-2" />
          Manage Permissions
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-none max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Competition Permissions</DialogTitle>
          <DialogDescription>
            Grant or revoke permission to create competitions for users.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="user-search">Select User</Label>
            <Popover modal={true}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between rounded-none h-10 !bg-transparent"
                >
                  {selectedUser
                    ? allUsers.find((user) => user.id === selectedUser)?.name
                    : "Search for a user..."}
                  <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[465px] p-0 rounded-none">
                <Command>
                  <CommandInput
                    placeholder="Search users..."
                    className="h-10 rounded-none !bg-transparent"
                  />
                  <CommandList>
                    <ScrollArea className="h-48">
                      <CommandEmpty>No user found.</CommandEmpty>
                      <CommandGroup>
                        {allUsers.map((user) => (
                          <CommandItem
                            key={user.id}
                            value={user.name}
                            onSelect={() => {
                              setSelectedUser(user.id);
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8">
                                {user.avatar_url ? (
                                  <AvatarImage
                                    src={user.avatar_url}
                                    alt={user.name}
                                  />
                                ) : null}
                                {!user.avatar_url && (
                                  <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                                    {user.name.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="font-medium">{user.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  {user.email}
                                </span>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </ScrollArea>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Users with Access */}
          <div className="flex flex-col gap-2">
            <Label>Users with Access</Label>
            <div className="border rounded-none bg-background">
              {usersWithAccess.length > 0 ? (
                <div className="h-[180px]">
                  <ScrollArea className="h-full">
                    {usersWithAccess.map((userId) => {
                      const user = allUsers.find((u) => u.id === userId);
                      return (
                        <div
                          key={userId}
                          className="flex items-center justify-between p-3 border-b last:border-b-0"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              {user?.avatar_url ? (
                                <AvatarImage
                                  src={user.avatar_url}
                                  alt={user?.name}
                                />
                              ) : null}
                              {!user?.avatar_url && (
                                <AvatarFallback className="bg-green-100 text-green-600 text-sm font-medium">
                                  <Users className="w-4 h-4" />
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <p className="font-medium">{user?.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {user?.email}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRevokeAccess(userId)}
                            className="rounded-none text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Revoke
                          </Button>
                        </div>
                      );
                    })}
                  </ScrollArea>
                </div>
              ) : (
                <div className="h-[180px] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No users have access yet.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handlePermissionsCancel}
              className="rounded-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePermissionsSubmit}
              className="rounded-none"
              disabled={!selectedUser}
            >
              Grant Permission
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
