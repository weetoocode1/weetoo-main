"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Send, ArrowUpRight, ArrowDownLeft, Wallet } from "lucide-react";
import { useState } from "react";

const TRANSACTIONS = [
  {
    id: 1,
    type: "received",
    amount: 50.0,
    from: "Alice Johnson",
    time: "2 hours ago",
    status: "completed",
  },
  {
    id: 2,
    type: "sent",
    amount: 25.5,
    to: "Bob Smith",
    time: "1 day ago",
    status: "completed",
  },
  {
    id: 3,
    type: "received",
    amount: 100.0,
    from: "Carol Davis",
    time: "3 days ago",
    status: "completed",
  },
  {
    id: 4,
    type: "sent",
    amount: 15.75,
    to: "David Wilson",
    time: "1 week ago",
    status: "pending",
  },
  {
    id: 5,
    type: "received",
    amount: 75.25,
    from: "Emma Wilson",
    time: "2 weeks ago",
    status: "completed",
  },
];

export function KorCoinsActivity() {
  const [sendAmount, setSendAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");

  const handleSend = () => {
    setSendAmount("");
    setRecipientAddress("");
  };

  return (
    <div className="space-y-3 w-full p-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <div className="bg-card border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                Total Balance
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                1,234.56
              </p>
              <p className="text-xs text-muted-foreground mt-1">KOR</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                Pending
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">1</p>
              <p className="text-xs text-muted-foreground mt-1">Transaction</p>
            </div>
            <div className="w-12 h-12 bg-secondary border border-border flex items-center justify-center">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                This Month
              </p>
              <p className="text-2xl font-bold text-green-600 mt-1">+125.30</p>
              <p className="text-xs text-muted-foreground mt-1">KOR</p>
            </div>
            <div className="w-12 h-12 bg-green-50 border border-green-200 flex items-center justify-center">
              <ArrowDownLeft className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground font-medium">
                Total Sent
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">89.45</p>
              <p className="text-xs text-muted-foreground mt-1">KOR</p>
            </div>
            <div className="w-12 h-12 bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <ArrowUpRight className="h-6 w-6 text-destructive" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Send Section */}
        <div className="bg-card border border-border">
          <div className="p-6 border-b border-border">
            <h3 className="text-xl font-semibold text-card-foreground">
              Send Kor Coins
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Transfer coins to another wallet
            </p>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="recipient"
                className="text-sm font-semibold text-foreground"
              >
                Recipient Address
              </Label>
              <Input
                id="recipient"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="0x..."
                className="bg-background h-10 rounded-none"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="amount"
                className="text-sm font-semibold text-foreground"
              >
                Amount (KOR)
              </Label>
              <Input
                id="amount"
                type="number"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                placeholder="0.00"
                className="bg-background h-10 rounded-none"
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={!sendAmount || !recipientAddress}
              className="w-full font-medium h-10 rounded-none"
            >
              <Send className="mr-2 h-4 w-4" />
              Send Kor Coins
            </Button>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-card border border-border">
          <div className="p-6 border-b border-border">
            <h3 className="text-xl font-semibold text-card-foreground">
              Recent Transactions
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your latest activity
            </p>
          </div>
          <div className="divide-y divide-border max-h-96 overflow-y-auto">
            {TRANSACTIONS.map((tx) => (
              <div
                key={tx.id}
                className="p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 flex items-center rounded-lg justify-center ${
                        tx.type === "received"
                          ? "bg-green-50 border border-green-200"
                          : "bg-destructive/10 border border-destructive/20"
                      }`}
                    >
                      {tx.type === "received" ? (
                        <ArrowDownLeft className="h-5 w-5 text-green-600" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {tx.type === "received" ? "+" : "-"}
                        {tx.amount} KOR
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {tx.type === "received"
                          ? `From: ${tx.from}`
                          : `To: ${tx.to}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground">
                      {tx.time}
                    </span>
                    <div
                      className={`text-xs px-3 py-1 rounded-full mt-1 font-medium ${
                        tx.status === "completed"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-secondary text-muted-foreground border border-border"
                      }`}
                    >
                      {tx.status}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
