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
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  FileText,
  User,
  XCircle,
} from "lucide-react";
import type { Deposit } from "./deposite-table";

interface DepositDetailsDialogProps {
  deposit: Deposit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DepositDetailsDialog({
  deposit,
  open,
  onOpenChange,
}: DepositDetailsDialogProps) {
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

  // Mock additional deposit data
  const additionalDepositData = {
    transactionReference: "TRX-" + deposit.id.substring(4),
    notes:
      deposit.situation === "rejected"
        ? "Insufficient verification documents provided."
        : "",
    bankDetails:
      deposit.paymentMethod === "Bank Transfer"
        ? {
            bankName: "Shinhan Bank",
            accountNumber: "110-123-456789",
            accountHolder: deposit.user.name,
          }
        : null,
    cardDetails:
      deposit.paymentMethod === "Credit Card"
        ? {
            cardType: "Visa",
            lastFourDigits: "4567",
            cardHolder: deposit.user.name,
            expiryMonth: "12",
            expiryYear: "25",
          }
        : null,
    mobileDetails:
      deposit.paymentMethod === "Mobile Payment"
        ? {
            provider: "KakaoPay",
            phoneNumber: "+82 10-****-5678",
          }
        : null,
    timeline: [
      {
        status: "created",
        date: new Date(
          new Date(deposit.date).getTime() - 3600000
        ).toISOString(), // 1 hour before
        by: deposit.user.name,
      },
      {
        status: deposit.situation,
        date: deposit.date,
        by: deposit.approvedBy || "System",
      },
    ],
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-8">
        <DialogHeader className="sticky top-0 z-10 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            Deposit Details
            {getStatusBadge(deposit.situation)}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Transaction ID: <span className="font-mono">{deposit.id}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 flex-1 overflow-y-auto">
          {/* User Information */}
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
              <AvatarImage src={deposit.user.avatar} alt={deposit.user.name} />
              <AvatarFallback>{getInitials(deposit.user.name)}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-base sm:text-lg font-medium">
                {deposit.user.name}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground font-mono">
                {deposit.user.uid}
              </p>
            </div>
          </div>

          <Separator />

          {/* Transaction Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Date</span>
                </div>
                <p className="text-sm sm:text-base font-medium">
                  {formatDate(deposit.date)}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4" />
                  <span>Amount</span>
                </div>
                <p className="text-sm sm:text-base font-medium">
                  {formatAmount(deposit.amount)} KOR
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>Payment Method</span>
                </div>
                <p className="text-sm sm:text-base font-medium">
                  {deposit.paymentMethod}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Approved By</span>
                </div>
                <p className="text-sm sm:text-base font-medium">
                  {deposit.approvedBy || "Pending"}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Details */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Payment Details</h4>

            {deposit.paymentMethod === "Credit Card" &&
              additionalDepositData.cardDetails && (
                <div className="mb-4">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-4 sm:p-6 text-white shadow-lg w-full h-[200px] sm:h-[250px] relative overflow-hidden">
                    {/* Card Brand Logo */}
                    <div className="absolute top-4 right-4">
                      <div className="text-white font-bold text-lg sm:text-xl italic">
                        VISA
                      </div>
                    </div>

                    {/* Chip */}
                    <div className="w-10 h-8 sm:w-12 sm:h-9 bg-yellow-300 rounded-md mb-4 sm:mb-6 flex items-center justify-center">
                      <div className="w-8 h-6 sm:w-10 sm:h-7 border-2 border-yellow-600 rounded-sm"></div>
                    </div>

                    {/* Card Number */}
                    <div className="text-lg sm:text-xl font-mono tracking-wider mb-6 sm:mb-8">
                      * * * * * * * * * * * *{" "}
                      {additionalDepositData.cardDetails.lastFourDigits}
                    </div>

                    {/* Card Holder & Expiry - Bottom row */}
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-xs mb-1">Card Holder</div>
                        <div className="text-sm sm:text-base font-medium uppercase tracking-wider">
                          {additionalDepositData.cardDetails.cardHolder}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs mb-1">Expires</div>
                        <div className="text-sm sm:text-base font-medium">
                          {additionalDepositData.cardDetails.expiryMonth}/
                          {additionalDepositData.cardDetails.expiryYear}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium">
                  Transaction Reference
                </span>
                <span className="text-sm font-mono">
                  {additionalDepositData.transactionReference}
                </span>
              </div>

              {additionalDepositData.bankDetails && (
                <>
                  <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-medium">Bank Name</span>
                    <span className="text-sm">
                      {additionalDepositData.bankDetails.bankName}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-medium">Account Number</span>
                    <span className="text-sm font-mono">
                      {additionalDepositData.bankDetails.accountNumber}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-sm font-medium">Account Holder</span>
                    <span className="text-sm">
                      {additionalDepositData.bankDetails.accountHolder}
                    </span>
                  </div>
                </>
              )}

              {additionalDepositData.mobileDetails && (
                <>
                  <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-medium">Mobile Provider</span>
                    <span className="text-sm">
                      {additionalDepositData.mobileDetails.provider}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-sm font-medium">Phone Number</span>
                    <span className="text-sm font-mono">
                      {additionalDepositData.mobileDetails.phoneNumber}
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
              {additionalDepositData.timeline.map((event, index) => (
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
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                      <p className="text-sm font-medium capitalize">
                        {event.status === "created"
                          ? "Deposit Initiated"
                          : event.status === "approved"
                          ? "Deposit Approved"
                          : event.status === "pending"
                          ? "Pending Approval"
                          : "Deposit Rejected"}
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
          {additionalDepositData.notes && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Notes</h4>
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-sm">{additionalDepositData.notes}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sticky bottom-0 z-10 bg-background pt-4 border-t mt-auto">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {deposit.situation === "pending" && (
              <>
                <Button
                  variant="outline"
                  className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 w-full sm:w-auto"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  className="bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 w-full sm:w-auto"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </>
            )}
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
