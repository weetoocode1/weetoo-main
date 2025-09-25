"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, Send, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useTranslations } from "next-intl";

interface AccountVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface VerificationRequest {
  id: string;
  accountHolderName: string;
  accountNumber: string;
  randomAmount: number;
  status: "pending" | "sent" | "verified" | "failed";
  sentAt?: Date;
  verifiedAt?: Date;
}

export function AccountVerificationDialog({
  open,
  onOpenChange,
}: AccountVerificationDialogProps) {
  const t = useTranslations("admin.withdrawManagement.accountVerification");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [testAmount, setTestAmount] = useState<string>("0.002");
  const [isProcessing, setIsProcessing] = useState(false);
  const [verificationRequests, setVerificationRequests] = useState<
    VerificationRequest[]
  >([
    {
      id: "1",
      accountHolderName: "John Doe",
      accountNumber: "1234-5678-9012-3456",
      randomAmount: 0.0024,
      status: "pending",
    },
    {
      id: "2",
      accountHolderName: "Jane Smith",
      accountNumber: "9876-5432-1098-7654",
      randomAmount: 0.0057,
      status: "sent",
      sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    },
    {
      id: "3",
      accountHolderName: "Mike Wilson",
      accountNumber: "5555-4444-3333-2222",
      randomAmount: 0.0089,
      status: "verified",
      sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      verifiedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    },
  ]);

  // Mock users for demo
  const mockUsers = [
    { id: "1", name: "John Doe", email: "john.doe@example.com" },
    { id: "2", name: "Jane Smith", email: "jane.smith@example.com" },
    { id: "3", name: "Mike Wilson", email: "mike.wilson@example.com" },
    { id: "4", name: "Sarah Johnson", email: "sarah.johnson@example.com" },
    { id: "5", name: "David Brown", email: "david.brown@example.com" },
  ];

  const generateRandomAmount = () => {
    const min = 0.002;
    const max = 0.009;
    const random = Math.random() * (max - min) + min;
    return parseFloat(random.toFixed(4));
  };

  const handleSendTestAmount = async () => {
    if (!selectedUser || !testAmount) {
      toast.error(t("toast.selectUserAndAmount"));
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const user = mockUsers.find((u) => u.id === selectedUser);
      if (!user) throw new Error("USER_NOT_FOUND");

      const newRequest: VerificationRequest = {
        id: selectedUser,
        accountHolderName: user.name,
        accountNumber: "XXXX-XXXX-XXXX-XXXX", // Would come from user's withdrawal request
        randomAmount: parseFloat(testAmount),
        status: "sent",
        sentAt: new Date(),
      };

      setVerificationRequests((prev) => [...prev, newRequest]);
      toast.success(t("toast.sent", { amount: testAmount, name: user.name }));

      // Reset form
      setSelectedUser("");
      setTestAmount("0.002");
    } catch (_error) {
      toast.error(t("toast.sendFailed"));
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: VerificationRequest["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {t("status.pending")}
          </Badge>
        );
      case "sent":
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Send className="h-3 w-3" />
            {t("status.sent")}
          </Badge>
        );
      case "verified":
        return (
          <Badge variant="default" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            {t("status.verified")}
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {t("status.failed")}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{t("status.unknown")}</Badge>;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Send Test Amount Section */}
          <div className="p-4 bg-muted/30 rounded-lg border border-border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user">{t("fields.selectUser")}</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("placeholders.chooseUser")} />
                  </SelectTrigger>
                  <SelectContent>
                    {mockUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">{t("fields.testAmount")}</Label>
                <div className="flex gap-2">
                  <Input
                    id="amount"
                    type="number"
                    step="0.0001"
                    min="0.002"
                    max="0.009"
                    value={testAmount}
                    onChange={(e) => setTestAmount(e.target.value)}
                    placeholder="0.002"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setTestAmount(generateRandomAmount().toString())
                    }
                    className="whitespace-nowrap"
                  >
                    {t("buttons.random")}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("hints.range")}
                </p>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleSendTestAmount}
                  disabled={!selectedUser || isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      {t("buttons.sending")}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {t("buttons.sendTestAmount")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Verification Requests Table - Following admin design */}
          <div className="border border-border rounded-none">
            {/* Corner borders */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary pointer-events-none" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary pointer-events-none" />

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/20">
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("table.id")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("table.accountHolderName")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("table.accountNumber")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("table.randomAmount")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("table.status")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("table.sentAt")}
                    </th>
                    <th className="px-6 py-4 text-left font-medium text-xs uppercase tracking-wider">
                      {t("table.verifiedAt")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {verificationRequests.map((request) => (
                    <tr
                      key={request.id}
                      className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-muted-foreground">
                          {request.id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-sm">
                          {request.accountHolderName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm">
                          {request.accountNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono font-medium text-sm">
                          {request.randomAmount} KOR
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {request.sentAt ? formatDate(request.sentAt) : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {request.verifiedAt
                          ? formatDate(request.verifiedAt)
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("buttons.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
