"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar, Coins, Hash, Mail } from "lucide-react";

interface UserKorCoins {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  kor_coins: number;
  created_at: string;
  avatar_url?: string;
}

interface ViewProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserKorCoins | null;
}

export function ViewProfileDialog({
  open,
  onOpenChange,
  user,
}: ViewProfileDialogProps) {
  if (!user) return null;

  const getBalanceStatus = (coins: number) => {
    if (coins >= 1000000)
      return {
        label: "High",
        color: "bg-green-100 text-green-800 border-green-300",
      };
    if (coins >= 500000)
      return {
        label: "Medium",
        color: "bg-yellow-100 text-yellow-800 border-yellow-300",
      };
    return { label: "Low", color: "bg-red-100 text-red-800 border-red-300" };
  };

  const balanceStatus = getBalanceStatus(user.kor_coins);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full lg:max-w-xl border-2 border-border">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="text-lg font-semibold">
            User Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Header */}
          <div className="p-4 bg-muted/20 border border-border">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                <span className="text-xl font-bold text-primary">
                  {user.first_name.charAt(0)}
                  {user.last_name.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-foreground mb-1">
                  {user.first_name} {user.last_name}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Hash className="h-3 w-3" />
                  <span className="font-mono">{user.id}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={`${balanceStatus.color} border`}
                  >
                    {balanceStatus.label} Balance
                  </Badge>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Coins className="h-3 w-3" />
                    <span className="font-mono">
                      {user.kor_coins.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* User Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Email */}
            <div className="p-3 bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-200 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-blue-700" />
                </div>
                <span className="text-xs font-medium text-blue-800 uppercase tracking-wider">
                  Email Address
                </span>
              </div>
              <div
                className="text-sm font-mono text-blue-900 truncate"
                title={user.email}
              >
                {user.email}
              </div>
            </div>

            {/* KOR Coins */}
            <div className="p-3 bg-yellow-50 border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-yellow-200 flex items-center justify-center">
                  <Coins className="h-4 w-4 text-yellow-700" />
                </div>
                <span className="text-xs font-medium text-yellow-800 uppercase tracking-wider">
                  KOR Coins
                </span>
              </div>
              <div className="text-xl font-bold font-mono text-yellow-900">
                {user.kor_coins.toLocaleString()}
              </div>
            </div>

            {/* Created */}
            <div className="p-3 bg-purple-50 border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-purple-200 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-purple-700" />
                </div>
                <span className="text-xs font-medium text-purple-800 uppercase tracking-wider">
                  Member Since
                </span>
              </div>
              <div className="text-sm text-purple-900">
                {new Date(user.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>

            {/* Balance Status */}
            <div className="p-3 bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-200 flex items-center justify-center">
                  <span className="text-xs font-bold text-green-700">
                    {balanceStatus.label.charAt(0)}
                  </span>
                </div>
                <span className="text-xs font-medium text-green-800 uppercase tracking-wider">
                  Balance Status
                </span>
              </div>
              <div className="text-sm text-green-900">
                {balanceStatus.label} Balance
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-9 px-4"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
