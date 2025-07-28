"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  ArrowUpRight,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  User,
  XCircle,
} from "lucide-react";
import type { Withdraw } from "./withdraw-table";

interface WithdrawDetailsDialogProps {
  withdraw: Withdraw;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WithdrawDetailsDialog({
  withdraw,
  open,
  onOpenChange,
}: WithdrawDetailsDialogProps) {
  // Format date to a readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Format amount
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("ko-KR").format(amount);
  };

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase();
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    if (status === "approved") {
      return (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 dark:bg-green-900/20 flex gap-1 items-center"
        >
          <CheckCircle className="h-3 w-3" />
          Approved
        </Badge>
      );
    } else if (status === "pending") {
      return (
        <Badge
          variant="outline"
          className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 flex gap-1 items-center"
        >
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    } else {
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 dark:bg-red-900/20 flex gap-1 items-center"
        >
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      );
    }
  };

  // Mock additional withdraw data
  const additionalWithdrawData = {
    transactionReference: "TRX-" + withdraw.id.substring(4),
    notes:
      withdraw.situation === "rejected"
        ? "Suspicious activity detected on account. Withdrawal rejected for security reasons."
        : "",
    bankDetails:
      withdraw.withdrawalMethod === "Bank Transfer"
        ? {
            bankName: "Shinhan Bank",
            accountNumber: "110-123-456789",
            accountHolder: withdraw.user.name,
          }
        : null,
    mobileWalletDetails:
      withdraw.withdrawalMethod === "Mobile Wallet"
        ? {
            provider: "KakaoPay",
            phoneNumber: "+82 10-****-5678",
            walletId:
              "KP" +
              Math.floor(Math.random() * 1000000)
                .toString()
                .padStart(6, "0"),
          }
        : null,
    timeline: [
      {
        status: "created",
        date: new Date(
          new Date(withdraw.date).getTime() - 3600000
        ).toISOString(), // 1 hour before
        by: withdraw.user.name,
      },
      {
        status: withdraw.situation,
        date: withdraw.date,
        by: withdraw.approvedBy || "System",
      },
    ],
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-8">
        <DialogHeader className="sticky top-0 z-10 pb-4 border-b">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
            Withdrawal Details
            {getStatusBadge(withdraw.situation)}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Transaction ID: <span className="font-mono">{withdraw.id}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 flex-1 overflow-y-auto">
          {/* User Information */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage
                src={withdraw.user.avatar}
                alt={withdraw.user.name}
              />
              <AvatarFallback>{getInitials(withdraw.user.name)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-medium">{withdraw.user.name}</h3>
              <p className="text-sm text-muted-foreground font-mono">
                {withdraw.user.uid}
              </p>
            </div>
          </div>

          <Separator />

          {/* Transaction Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <ArrowUpRight className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Amount</p>
                <p className="text-lg">{formatAmount(withdraw.amount)} KOR</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Date & Time</p>
                <p>{formatDate(withdraw.date)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Withdrawal Method</p>
                <p>{withdraw.withdrawalMethod}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Approved By</p>
                <p>{withdraw.approvedBy || "Pending Approval"}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Withdrawal Details */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Withdrawal Details</h4>

            <div className="bg-muted/50 p-3 sm:p-4 rounded-md">
              <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium">
                  Transaction Reference
                </span>
                <span className="text-sm font-mono break-all">
                  {additionalWithdrawData.transactionReference}
                </span>
              </div>

              {additionalWithdrawData.bankDetails && (
                <>
                  <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-medium">Bank Name</span>
                    <span className="text-sm break-all">
                      {additionalWithdrawData.bankDetails.bankName}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-medium">Account Number</span>
                    <span className="text-sm font-mono break-all">
                      {additionalWithdrawData.bankDetails.accountNumber}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between py-2">
                    <span className="text-sm font-medium">Account Holder</span>
                    <span className="text-sm break-all">
                      {additionalWithdrawData.bankDetails.accountHolder}
                    </span>
                  </div>
                </>
              )}

              {additionalWithdrawData.mobileWalletDetails && (
                <>
                  <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-medium">
                      Mobile Wallet Provider
                    </span>
                    <span className="text-sm break-all">
                      {additionalWithdrawData.mobileWalletDetails.provider}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-medium">Phone Number</span>
                    <span className="text-sm font-mono break-all">
                      {additionalWithdrawData.mobileWalletDetails.phoneNumber}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between py-2">
                    <span className="text-sm font-medium">Wallet ID</span>
                    <span className="text-sm font-mono break-all">
                      {additionalWithdrawData.mobileWalletDetails.walletId}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Transaction Timeline */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Transaction Timeline</h4>
            <div className="space-y-3">
              {additionalWithdrawData.timeline.map((event, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {event.status === "created" && (
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    )}
                    {event.status === "approved" && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {event.status === "pending" && (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    )}
                    {event.status === "rejected" && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium capitalize">
                        {event.status === "created"
                          ? "Withdrawal Initiated"
                          : event.status === "approved"
                          ? "Withdrawal Approved"
                          : event.status === "pending"
                          ? "Pending Approval"
                          : "Withdrawal Rejected"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(event.date)}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      By: {event.by}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes (if any) */}
          {additionalWithdrawData.notes && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Notes</h4>
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-sm">{additionalWithdrawData.notes}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Close
          </Button>
          {withdraw.situation === "pending" && (
            <>
              <Button
                variant="destructive"
                onClick={() => {
                  // Handle reject
                  onOpenChange(false);
                }}
                className="w-full sm:w-auto"
              >
                Reject Withdrawal
              </Button>
              <Button
                onClick={() => {
                  // Handle approve
                  onOpenChange(false);
                }}
                className="w-full sm:w-auto"
              >
                Approve Withdrawal
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
