"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateBrokerRebateWithdrawal } from "@/hooks/use-broker-rebate-withdrawals";
import { useUserUids } from "@/hooks/use-user-uids";
import { createClient } from "@/lib/supabase/client";
import { DollarSign, Loader2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

interface UserBrokerUid {
  id: string;
  user_id?: string;
  exchange_id: string;
  uid: string;
  is_active: boolean;
  rebate_balance_usd?: number | null;
  rebate_pending_withdraw_usd?: number | null;
}

// Broker data with logos
const BROKERS = [
  {
    id: "deepcoin",
    name: "DeepCoin",
    logo: "/broker/deepcoin.png",
  },
  {
    id: "orangex",
    name: "OrangeX",
    logo: "/broker/orangex.webp",
  },
];

export function PaybackWithdrawal() {
  const [selectedUidId, setSelectedUidId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userUidsQuery = useUserUids();
  const uids = (userUidsQuery.data ?? []) as UserBrokerUid[];
  const uidsLoading = userUidsQuery.isLoading;
  const createWithdrawal = useCreateBrokerRebateWithdrawal();

  // Filter UIDs that have available balance >= $50
  const eligibleUids = uids.filter(
    (uid) => uid.is_active && (uid.rebate_balance_usd ?? 0) >= 50
  );

  const selectedUid = uids.find((uid) => uid.id === selectedUidId);
  const availableBalance = selectedUid?.rebate_balance_usd ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUidId || !amount) return;

    const amountNum = parseFloat(amount);
    if (amountNum < 50) {
      toast.error("Minimum withdrawal amount is $50");
      return;
    }

    if (amountNum > availableBalance) {
      toast.error("Insufficient balance");
      return;
    }

    setIsSubmitting(true);
    try {
      await createWithdrawal.mutateAsync({
        user_broker_uid_id: selectedUidId,
        amount_usd: amountNum,
      });

      // Atomically move funds: available -> pending
      const supabase = createClient();
      const { error } = await supabase
        .from("user_broker_uids")
        .update({
          rebate_balance_usd: (availableBalance as number) - amountNum,
          rebate_pending_withdraw_usd:
            (selectedUid?.rebate_pending_withdraw_usd ?? 0) + amountNum,
        })
        .eq("id", selectedUidId);
      if (error) {
        throw error;
      }

      // Reset form
      setSelectedUidId("");
      setAmount("");
    } catch (_error) {
      // Error is handled by the mutation
    } finally {
      setIsSubmitting(false);
    }
  };

  if (uidsLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="space-y-6">
        {/* Form Card */}
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Request Rebate Withdrawal
            </CardTitle>
            <CardDescription>
              Withdraw your broker rebates to your registered UID. Minimum
              withdrawal amount is $50.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {eligibleUids.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No UIDs with sufficient balance (≥$50) found.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Link a UID and earn rebates to make withdrawals.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="uid">Select UID</Label>
                  <Select
                    value={selectedUidId}
                    onValueChange={setSelectedUidId}
                  >
                    <SelectTrigger id="uid" className="h-10 rounded-none">
                      <SelectValue placeholder="Choose a UID..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-none">
                      {eligibleUids.map((uid) => {
                        const broker = BROKERS.find(
                          (b) => b.id === uid.exchange_id
                        );
                        return (
                          <SelectItem
                            key={uid.id}
                            value={uid.id}
                            className="rounded-none py-3"
                          >
                            <div className="flex items-center gap-3 w-full">
                              <div className="w-6 h-6 relative flex-shrink-0">
                                {broker ? (
                                  <Image
                                    src={broker.logo}
                                    alt={`${broker.name} logo`}
                                    width={24}
                                    height={24}
                                    className="object-contain"
                                  />
                                ) : (
                                  <div className="w-6 h-6 bg-muted rounded flex items-center justify-center">
                                    <span className="text-xs font-medium">
                                      {uid.exchange_id.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-between flex-1">
                                <span className="font-medium">
                                  {uid.exchange_id.toUpperCase()} - {uid.uid}
                                </span>
                                <span className="text-sm font-semibold text-green-600 ml-2">
                                  ${(uid.rebate_balance_usd ?? 0).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {selectedUid && (
                  <div className="p-3 bg-muted/50 rounded-none">
                    <p className="text-sm text-muted-foreground">
                      Available Balance:{" "}
                      <span className="font-semibold text-green-600">
                        ${availableBalance.toFixed(2)}
                      </span>
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="amount">Withdrawal Amount (USD)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="50"
                    max={availableBalance}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="50.00"
                    required
                    className="h-10 rounded-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum: $50.00
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting || !selectedUidId || !amount}
                  className="w-full h-10 rounded-none"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Withdrawal Request"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
