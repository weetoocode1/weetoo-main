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
  DollarSign,
  Gift,
  Repeat,
  ShoppingBag,
  Star,
} from "lucide-react";
import { UsageHistory } from "./usage-history-table";

interface UsageDetailsDialogProps {
  usage: UsageHistory;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UsageDetailsDialog({
  usage,
  open,
  onOpenChange,
}: UsageDetailsDialogProps) {
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

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
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

  // Get usage type icon
  const getUsageTypeIcon = (usageType: string) => {
    switch (usageType) {
      case "purchase":
        return <ShoppingBag className="h-5 w-5 text-blue-500" />;
      case "donation":
        return <Gift className="h-5 w-5 text-pink-500" />;
      case "subscription":
        return <Repeat className="h-5 w-5 text-green-500" />;
      case "premium":
        return <Star className="h-5 w-5 text-amber-500" />;
      case "service":
        return <DollarSign className="h-5 w-5 text-purple-500" />;
      default:
        return null;
    }
  };

  // Get usage type badge class
  const getUsageTypeBadgeClass = (usageType: string) => {
    switch (usageType) {
      case "purchase":
        return "bg-blue-50 text-blue-700 dark:bg-blue-900/20";
      case "donation":
        return "bg-pink-50 text-pink-700 dark:bg-pink-900/20";
      case "subscription":
        return "bg-green-50 text-green-700 dark:bg-green-900/20";
      case "premium":
        return "bg-amber-50 text-amber-700 dark:bg-amber-900/20";
      case "service":
        return "bg-purple-50 text-purple-700 dark:bg-purple-900/20";
      default:
        return "bg-gray-50 text-gray-700 dark:bg-gray-900/20";
    }
  };

  // Mock additional usage data
  const additionalUsageData = {
    transactionId: "TRX-" + usage.id.substring(4),
    paymentMethod: "KOR_Coin Balance",
    receiptUrl: "/receipts/" + usage.id.toLowerCase(),
    relatedItems:
      usage.usageType === "purchase" || usage.usageType === "premium"
        ? [
            {
              name: usage.items,
              price: usage.amount,
              type: "Digital Content",
              downloadable: true,
              accessExpiry: "Lifetime",
            },
          ]
        : usage.usageType === "subscription"
        ? [
            {
              name: usage.items,
              price: usage.amount,
              type: "Subscription",
              duration: usage.items.includes("Year") ? "Annual" : "Monthly",
              autoRenew: true,
            },
          ]
        : usage.usageType === "donation"
        ? [
            {
              name: usage.items,
              price: usage.amount,
              type: "Donation",
              recipient: usage.items,
              taxDeductible: true,
            },
          ]
        : [
            {
              name: usage.items,
              price: usage.amount,
              type: "Service",
            },
          ],
    timeline: [
      {
        action: "Transaction Initiated",
        date: new Date(new Date(usage.date).getTime() - 300000).toISOString(), // 5 minutes before
        by: usage.user.name,
      },
      {
        action: "Payment Processed",
        date: new Date(new Date(usage.date).getTime() - 120000).toISOString(), // 2 minutes before
        by: "System",
      },
      {
        action: "Transaction Completed",
        date: usage.date,
        by: "System",
      },
    ],
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            Usage Details
            <Badge
              variant="outline"
              className={`flex items-center gap-1 ${getUsageTypeBadgeClass(
                usage.usageType
              )}`}
            >
              {getUsageTypeIcon(usage.usageType)}
              {usage.usageTypeLabel}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Transaction ID: <span className="font-mono">{usage.id}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 flex-1 overflow-y-auto">
          {/* User Information */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={usage.user.avatar} alt={usage.user.name} />
              <AvatarFallback>{getInitials(usage.user.name)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <h3 className="font-medium">{usage.user.name}</h3>
              <p className="text-sm text-muted-foreground">
                User ID: {usage.user.uid}
              </p>
            </div>
          </div>

          <Separator />

          {/* Transaction Details */}
          <div className="space-y-4">
            <h3 className="font-medium">Transaction Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Date & Time</span>
                </div>
                <p className="font-medium">
                  {formatDate(usage.date)} at {formatTime(usage.date)}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>Amount</span>
                </div>
                <p className="font-medium">{formatAmount(usage.amount)} KOR</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Items/Donations */}
          <div className="space-y-4">
            <h3 className="font-medium">Items/Donations</h3>
            <div className="space-y-4">
              {additionalUsageData.relatedItems.map((item, index) => (
                <div key={index} className="rounded-lg border p-4 space-y-3">
                  <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-medium">Type</span>
                    <span className="text-sm">{item.type}</span>
                  </div>
                  {item.type === "Digital Content" && (
                    <>
                      <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-sm font-medium">
                          Downloadable
                        </span>
                        <span className="text-sm">
                          {"downloadable" in item && item.downloadable
                            ? "Yes"
                            : "No"}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-sm font-medium">
                          Access Expiry
                        </span>
                        <span className="text-sm">
                          {"accessExpiry" in item && item.accessExpiry}
                        </span>
                      </div>
                    </>
                  )}
                  {item.type === "Subscription" && (
                    <>
                      <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-sm font-medium">Duration</span>
                        <span className="text-sm">
                          {"duration" in item && item.duration}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-sm font-medium">Auto-Renew</span>
                        <span className="text-sm">
                          {"autoRenew" in item && item.autoRenew ? "Yes" : "No"}
                        </span>
                      </div>
                    </>
                  )}
                  {item.type === "Donation" && (
                    <>
                      <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-sm font-medium">Recipient</span>
                        <span className="text-sm">
                          {"recipient" in item && item.recipient}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-sm font-medium">
                          Tax Deductible
                        </span>
                        <span className="text-sm">
                          {"taxDeductible" in item && item.taxDeductible
                            ? "Yes"
                            : "No"}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
