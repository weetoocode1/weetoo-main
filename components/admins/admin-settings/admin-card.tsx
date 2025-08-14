"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, MoreVertical, Shield, User } from "lucide-react";

interface AdminCardProps {
  admin: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar: string;
    lastActive: string;
    status: string;
  };
  onRoleChange: (adminId: string, newRole: string) => void;
  onDelete: (adminId: string) => void;
}

const getRoleColor = (role: string) => {
  switch (role) {
    case "super_admin":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "admin":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "inactive":
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
  }
};

export function AdminCard({ admin, onRoleChange, onDelete }: AdminCardProps) {
  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
      <CardContent className="p-3 sm:p-4 relative">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Avatar className="h-12 w-12 sm:h-14 sm:w-14 border-2 border-background shadow-md">
              <AvatarImage src={admin.avatar} alt={admin.name} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {admin.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-base sm:text-lg">
                {admin.name}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground break-all">
                {admin.email}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => onDelete(admin.id)}
              >
                Remove Admin
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm text-muted-foreground">
                Role
              </span>
            </div>
            <Badge className={`text-xs sm:text-sm ${getRoleColor(admin.role)}`}>
              {admin.role === "super_admin" ? "Super Admin" : "Admin"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm text-muted-foreground">
                Status
              </span>
            </div>
            <Badge
              className={`text-xs sm:text-sm ${getStatusColor(admin.status)}`}
            >
              {admin.status.charAt(0).toUpperCase() + admin.status.slice(1)}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm text-muted-foreground">
                Last Active
              </span>
            </div>
            <span className="text-xs sm:text-sm">
              {new Date(admin.lastActive).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="mt-3 sm:mt-4 pt-2 sm:pt-3 border-t">
          <Select
            defaultValue={admin.role}
            onValueChange={(value) => onRoleChange(admin.id, value)}
          >
            <SelectTrigger className="text-xs sm:text-sm">
              <SelectValue placeholder="Change Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="super_admin">Super Admin</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
