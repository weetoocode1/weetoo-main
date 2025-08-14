"use client";

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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  AlertTriangle,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  Fingerprint,
  User,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import type { ExchangeUidData } from "./exchange-uid-table";

interface ExchangeUidDetailsDialogProps {
  uidData: ExchangeUidData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showSensitiveInfo: boolean;
}

export function ExchangeUidDetailsDialog({
  uidData,
  open,
  onOpenChange,
  showSensitiveInfo: initialShowSensitiveInfo,
}: ExchangeUidDetailsDialogProps) {
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(
    initialShowSensitiveInfo
  );

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

  // Mask sensitive information
  const maskPhoneNumber = (phoneNumber: string) => {
    if (showSensitiveInfo) return phoneNumber;
    return phoneNumber.replace(/(\+\d{2}-\d{2}-)\d{4}-(\d{4})/, "$1****-$2");
  };

  const maskEmail = (email: string) => {
    if (showSensitiveInfo) return email;
    const [username, domain] = email.split("@");
    const maskedUsername =
      username.substring(0, 2) + "*".repeat(username.length - 2);
    return `${maskedUsername}@${domain}`;
  };

  // Get situation badge
  const getSituationBadge = (situation: string) => {
    if (situation === "verified") {
      return (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 dark:bg-green-900/20 flex gap-1 items-center"
        >
          <CheckCircle className="h-3 w-3" />
          Verified
        </Badge>
      );
    } else if (situation === "pending") {
      return (
        <Badge
          variant="outline"
          className="bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 flex gap-1 items-center"
        >
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    } else if (situation === "rejected") {
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 dark:bg-red-900/20 flex gap-1 items-center"
        >
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      );
    } else {
      return (
        <Badge
          variant="outline"
          className="bg-orange-50 text-orange-700 dark:bg-orange-900/20 flex gap-1 items-center"
        >
          <AlertTriangle className="h-3 w-3" />
          Suspended
        </Badge>
      );
    }
  };

  // Mock additional UID data
  const additionalUidData = {
    verificationDetails: {
      idType: "National ID",
      idNumber: "****-****-" + uidData.uid.substring(uidData.uid.length - 4),
      verificationDate:
        uidData.situation === "verified" ? uidData.registrationDate : null,
      rejectionReason:
        uidData.situation === "rejected"
          ? "Provided ID document does not match user information."
          : null,
      suspensionReason:
        uidData.situation === "suspended"
          ? "Account suspended due to suspicious activity."
          : null,
    },
    exchangeDetails: {
      exchangeId:
        "EX-" +
        uidData.exchange.substring(0, 3).toUpperCase() +
        "-" +
        uidData.uid.substring(uidData.uid.length - 4),
      apiKey:
        "****************************" +
        uidData.uid.substring(uidData.uid.length - 4),
      accountLevel: "Level 2",
      tradingEnabled: uidData.situation === "verified",
      withdrawalEnabled: uidData.situation === "verified",
    },
    activityHistory: [
      {
        action: "Registration",
        date: new Date(
          new Date(uidData.registrationDate).getTime() - 3600000
        ).toISOString(), // 1 hour before
        by: uidData.name,
      },
      {
        action:
          uidData.situation === "verified"
            ? "Verification"
            : uidData.situation === "rejected"
            ? "Rejection"
            : uidData.situation === "suspended"
            ? "Suspension"
            : "Pending Review",
        date: uidData.registrationDate,
        by: "Admin",
      },
    ],
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-4 sm:p-6">
        <DialogHeader className="sticky top-0 z-10 pb-4 border-b">
          <DialogTitle className="flex flex-col sm:flex-row sm:items-center gap-2">
            Exchange UID Details
            {getSituationBadge(uidData.situation)}
          </DialogTitle>
          <DialogDescription>
            User Identification:{" "}
            <span className="font-mono break-all">{uidData.uid}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 flex-1 overflow-y-auto">
          {/* User Information */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
              <h3 className="text-lg font-medium">User Information</h3>
              <div className="flex items-center space-x-2">
                <Switch
                  id="show-sensitive-info-dialog"
                  className="cursor-pointer"
                  checked={showSensitiveInfo}
                  onCheckedChange={setShowSensitiveInfo}
                />
                <Label htmlFor="show-sensitive-info-dialog" className="text-sm">
                  {showSensitiveInfo
                    ? "Hide sensitive info"
                    : "Show sensitive info"}
                </Label>
              </div>
            </div>
            <div className="bg-muted/50 p-3 sm:p-4 rounded-md">
              <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium">Name</span>
                <span className="text-sm">{uidData.name}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium">Phone Number</span>
                <span className="text-sm font-mono break-all">
                  {maskPhoneNumber(uidData.phoneNumber)}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between py-2">
                <span className="text-sm font-medium">Email</span>
                <span className="text-sm break-all">
                  {maskEmail(uidData.email)}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* UID Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Fingerprint className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">UID</p>
                <p className="font-mono break-all">{uidData.uid}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Exchange</p>
                <p>{uidData.exchange}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Registration Date</p>
                <p>{formatDate(uidData.registrationDate)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Situation</p>
                <p className="capitalize">{uidData.situation}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Verification Details */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Verification Details</h4>
            <div className="bg-muted/50 p-3 sm:p-4 rounded-md">
              <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium">ID Type</span>
                <span className="text-sm">
                  {additionalUidData.verificationDetails.idType}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium">ID Number</span>
                <span className="text-sm font-mono break-all">
                  {additionalUidData.verificationDetails.idNumber}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium">Verification Date</span>
                <span className="text-sm">
                  {additionalUidData.verificationDetails.verificationDate
                    ? formatDate(
                        additionalUidData.verificationDetails.verificationDate
                      )
                    : "Not verified"}
                </span>
              </div>
              {additionalUidData.verificationDetails.rejectionReason && (
                <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium">Rejection Reason</span>
                  <span className="text-sm text-red-600">
                    {additionalUidData.verificationDetails.rejectionReason}
                  </span>
                </div>
              )}
              {additionalUidData.verificationDetails.suspensionReason && (
                <div className="flex flex-col sm:flex-row sm:justify-between py-2">
                  <span className="text-sm font-medium">Suspension Reason</span>
                  <span className="text-sm text-yellow-600">
                    {additionalUidData.verificationDetails.suspensionReason}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Exchange Details */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Exchange Details</h4>
            <div className="bg-muted/50 p-3 sm:p-4 rounded-md">
              <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium">Exchange ID</span>
                <span className="text-sm font-mono break-all">
                  {additionalUidData.exchangeDetails.exchangeId}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium">API Key</span>
                <span className="text-sm font-mono break-all">
                  {additionalUidData.exchangeDetails.apiKey}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium">Account Level</span>
                <span className="text-sm">
                  {additionalUidData.exchangeDetails.accountLevel}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium">Trading Enabled</span>
                <span className="text-sm">
                  {additionalUidData.exchangeDetails.tradingEnabled
                    ? "Yes"
                    : "No"}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between py-2">
                <span className="text-sm font-medium">Withdrawal Enabled</span>
                <span className="text-sm">
                  {additionalUidData.exchangeDetails.withdrawalEnabled
                    ? "Yes"
                    : "No"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 z-10 bg-background pt-4 border-t mt-auto">
          {uidData.situation === "pending" && (
            <div className="flex flex-col sm:flex-row gap-2 w-full">
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
            </div>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="shadow-none h-10 cursor-pointer w-full sm:w-auto"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
