"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState } from "react";
// Using custom badges below for clarity, not shared Badge
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { ArrowDownRight, ArrowUpRight, Download, Search } from "lucide-react";

type TxnType = "withdrawal" | "deposit";

interface TransactionRow {
  id: string;
  type: TxnType;
  amount: number; // KOR coins for consistency
  final_amount?: number; // KOR (amount user receives after fee)
  status: string;
  created_at: string;
  meta?: {
    bank_name?: string;
    account_number?: string;
  };
}

// Raw database types for Supabase responses
interface RawWithdrawalData {
  id: string;
  kor_coins_amount: number;
  final_amount?: number;
  payout_sent?: boolean;
  status: string;
  created_at: string;
  bank_account:
    | {
        bank_name?: string;
        account_number?: string;
      }[]
    | null;
}

interface RawDepositData {
  id: string;
  kor_coins_amount: number;
  status: string;
  created_at: string;
  bank_name?: string;
  account_number?: string;
}

// Union type for loading state
type LoadingOrTransaction = TransactionRow | { id?: string };

async function fetchTransactions(userId: string): Promise<TransactionRow[]> {
  const supabase = createClient();

  // withdrawals
  const { data: w } = await supabase
    .from("withdrawal_requests")
    .select(
      `id, kor_coins_amount, final_amount, payout_sent, status, created_at, bank_account:bank_accounts(bank_name, account_number)`
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  // deposits (placeholder table name 'deposits' – adjust if different)
  const { data: d } = await supabase
    .from("deposits")
    .select(
      `id, kor_coins_amount, status, created_at, bank_name, account_number`
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const withdrawals: TransactionRow[] = (w || []).map(
    (r: RawWithdrawalData) => ({
      id: r.id,
      type: "withdrawal",
      amount: r.kor_coins_amount,
      final_amount: r.final_amount,
      status: r.payout_sent ? "sent" : r.status,
      created_at: r.created_at,
      meta: {
        bank_name: r.bank_account?.[0]?.bank_name,
        account_number: r.bank_account?.[0]?.account_number,
      },
    })
  );

  const deposits: TransactionRow[] = (d || []).map((r: RawDepositData) => ({
    id: r.id,
    type: "deposit",
    amount: r.kor_coins_amount,
    status: r.status,
    created_at: r.created_at,
    meta: {
      bank_name: r.bank_name,
      account_number: r.account_number,
    },
  }));

  return [...withdrawals, ...deposits].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function Transactions() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<TransactionRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const data = await fetchTransactions(user.id);
        if (!cancelled) setRows(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const list = rows || [];
    if (!q) return list;
    return list.filter((r) =>
      [r.id, r.type, r.status, r.meta?.bank_name, r.meta?.account_number]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q))
    );
  }, [query, rows]);

  const exportCsv = () => {
    const data = filtered;
    if (!data.length) return;
    const headers = [
      "id",
      "type",
      "amount_kor",
      "received_kor",
      "status",
      "created_at",
      "bank_name",
      "account_number",
    ];
    const csv = [
      headers.join(","),
      ...data.map((r) =>
        [
          r.id,
          r.type,
          r.amount,
          r.final_amount ?? "",
          r.status,
          r.created_at,
          r.meta?.bank_name || "",
          r.meta?.account_number || "",
        ]
          .map((v) =>
            typeof v === "string" && (v.includes(",") || v.includes('"'))
              ? `"${v.replace(/\"/g, '""')}"`
              : String(v)
          )
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // const renderStatusBadge = (status: string) => {
  //   if (status === "sent") {
  //     return (
  //       <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs uppercase tracking-wide">
  //         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
  //         Sent
  //       </div>
  //     );
  //   }
  //   return (
  //     <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-amber-200 bg-amber-50 text-amber-700 text-xs uppercase tracking-wide">
  //       <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
  //       Pending
  //     </div>
  //   );
  // };

  if (!mounted) {
    // Render stable skeleton on server and before hydration to avoid mismatch
    return (
      <div className="space-y-6">
        <Card className="border border-border rounded-none shadow-none">
          <CardHeader>
            <CardTitle className="text-lg">All Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border border-border rounded-none">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-4 py-3 border-b border-border/30">
                  <div className="h-4 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border border-border rounded-none shadow-none">
        <CardHeader>
          <CardTitle className="text-lg">All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by id, type, status, or bank..."
                className="pl-10 h-10 rounded-none"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="rounded-none h-10"
              onClick={exportCsv}
            >
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          </div>

          {/* Table */}
          <div className="border border-border rounded-none">
            <div className="hidden md:grid grid-cols-12 px-4 py-2 bg-muted/20 border-b border-border/50 text-xs uppercase tracking-wider">
              <div className="col-span-3">ID</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-2">Received</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-2">Date</div>
            </div>

            {(loading ? Array.from({ length: 5 }) : filtered).map((r, idx) => (
              <div
                key={(r as LoadingOrTransaction)?.id || idx}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 px-4 py-3 border-b border-border/30 hover:bg-muted/10"
              >
                <div className="md:col-span-3 font-mono text-sm break-all">
                  {(r as LoadingOrTransaction)?.id || ""}
                </div>
                <div className="md:col-span-2">
                  {loading ? (
                    <div className="h-4 bg-muted rounded" />
                  ) : (r as TransactionRow)?.type === "withdrawal" ? (
                    <div className="inline-flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-red-500" />
                      <span className="text-sm">Withdrawal</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2">
                      <ArrowDownRight className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm">Deposit</span>
                    </div>
                  )}
                </div>
                <div
                  className={`md:col-span-2 font-semibold ${
                    loading
                      ? ""
                      : (r as TransactionRow)?.type === "withdrawal"
                      ? "text-red-500"
                      : "text-emerald-600"
                  }`}
                >
                  {loading ? (
                    <div className="h-4 bg-muted rounded" />
                  ) : (
                    `${
                      (r as TransactionRow)?.type === "withdrawal" ? "-" : "+"
                    } ${
                      (r as TransactionRow)?.amount?.toLocaleString?.() || 0
                    } KOR`
                  )}
                </div>
                <div className="md:col-span-2 font-semibold">
                  {loading ? (
                    <div className="h-4 bg-muted rounded" />
                  ) : (r as TransactionRow)?.status === "sent" ? (
                    <span className="text-emerald-600">
                      + ₩{" "}
                      {(
                        (r as TransactionRow)?.final_amount ?? 0
                      ).toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      ₩{" "}
                      {(
                        (r as TransactionRow)?.final_amount ?? 0
                      ).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="md:col-span-1">
                  {loading ? (
                    <div className="h-4 bg-muted rounded" />
                  ) : (
                    <div
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs uppercase tracking-wide border ${
                        (r as TransactionRow)?.status === "sent"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          (r as TransactionRow)?.status === "sent"
                            ? "bg-emerald-500"
                            : "bg-amber-500"
                        }`}
                      />
                      {(r as TransactionRow)?.status === "sent"
                        ? "Sent"
                        : "Pending"}
                    </div>
                  )}
                </div>
                <div className="md:col-span-2 text-sm text-muted-foreground">
                  {loading ? (
                    <div className="h-4 bg-muted rounded" />
                  ) : (
                    new Date(
                      (r as TransactionRow)?.created_at || ""
                    ).toLocaleString()
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
