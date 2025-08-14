"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Coins, Eye, Mail, Phone } from "lucide-react";
import { useState } from "react";

interface UserDetailsDialogProps {
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    mobile_number?: string;
    role: string;
    kor_coins: number;
    created_at: string;
    avatar_url?: string;
    updated_at: string;
  };
  trigger?: React.ReactNode;
}

export function UserDetailsDialog({ user, trigger }: UserDetailsDialogProps) {
  const [open, setOpen] = useState(false);

  const fullName =
    user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : "Anonymous";

  const roleConfig = {
    admin: {
      bg: "bg-red-100",
      text: "text-red-800",
      border: "border-red-300",
    },
    super_admin: {
      bg: "bg-purple-100",
      text: "text-purple-800",
      border: "border-purple-300",
    },
    user: {
      bg: "bg-green-100",
      text: "text-green-800",
      border: "border-green-300",
    },
    moderator: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      border: "border-blue-300",
    },
  };

  const config = roleConfig[user.role as keyof typeof roleConfig] || {
    bg: "bg-gray-100",
    text: "text-gray-800",
    border: "border-gray-300",
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Eye className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>User Details</DialogTitle>
          <DialogDescription>
            Comprehensive information about {fullName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Header */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 ring-4 ring-muted/20">
              <AvatarImage src={user.avatar_url} alt={fullName} />
              <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary text-2xl font-bold">
                {fullName.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-xl font-semibold">{fullName}</h3>
              <p className="text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge
                  variant="outline"
                  className={`${config.bg} ${config.text} ${config.border} font-medium`}
                >
                  {user.role === "super_admin" ? "Super Admin" : user.role}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Basic Information */}
          <Card className="border border-border rounded-none shadow-none">
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
                {user.mobile_number && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Mobile Number</p>
                      <p className="text-sm text-muted-foreground">
                        {user.mobile_number}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Joined</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(user.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Last Updated</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(user.updated_at)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card className="border border-border rounded-none shadow-none">
            <CardHeader>
              <CardTitle className="text-lg">Financial Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Coins className="h-6 w-6 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium">KOR Coins</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {user.kor_coins?.toLocaleString() || "0"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button>Edit User</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
