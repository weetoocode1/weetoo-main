"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEffect, useMemo, useState, Fragment } from "react";
// Using custom badges below for clarity, not shared Badge
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Download,
  Search,
} from "lucide-react";

type TxnType = "withdrawal" | "deposit" | "uid-payback";

interface TransactionRow {
  id: string;
  type: TxnType;
  amount: number;
  final_amount?: number;
  won_paid?: number;
  usd_paid?: number;
  status: string;
  created_at: string;
  meta?: {
    bank_name?: string;
    account_number?: string;
    exchange_id?: string;
    broker_uid?: string | number;
  };
}

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
  total_amount?: number | null;
  won_amount?: number | null;
  bank_account:
    | {
        bank_name?: string;
        account_number?: string;
      }[]
    | null;
}

// Union type for loading state
type LoadingOrTransaction = TransactionRow | { id?: string };

interface UserUidMetaRow {
  id: string;
  exchange_id: string;
  uid: string | number;
}

interface BrokerWithdrawalRow {
  id: string;
  user_broker_uid_id: string;
  amount_usd: number;
  status: string;
  created_at: string;
}

async function fetchTransactions(userId: string): Promise<TransactionRow[]> {
  const supabase = createClient();

  // Fetch withdrawals, deposits, and the user's UID list in parallel for speed
  const [wRes, dRes, uidsRes] = await Promise.all([
    supabase
      .from("withdrawal_requests")
      .select(
        `id, kor_coins_amount, final_amount, payout_sent, status, created_at, bank_account:bank_accounts(bank_name, account_number)`
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("deposit_requests")
      .select(
        `id, kor_coins_amount, status, created_at, total_amount, won_amount, bank_account:bank_accounts(bank_name, account_number)`
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("user_broker_uids")
      .select("id, exchange_id, uid")
      .eq("user_id", userId),
  ]);

  const w = wRes.data;
  const d = dRes.data;
  const userUids = uidsRes.data as UserUidMetaRow[] | null;

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
    won_paid: (r.total_amount ?? r.won_amount ?? 0) || 0,
    status:
      r.status === "completed"
        ? "sent"
        : r.status === "failed"
        ? "failed"
        : r.status,
    created_at: r.created_at,
    meta: {
      bank_name: r.bank_account?.[0]?.bank_name,
      account_number: r.bank_account?.[0]?.account_number,
    },
  }));

  // payback withdrawals (from broker_rebate_withdrawals linked via user_broker_uids)
  const uidIds = (userUids || []).map((u) => u.id);
  const uidMetaById: Record<
    string,
    { exchange_id: string; uid: string | number }
  > = {};
  (userUids || []).forEach((u) => {
    uidMetaById[u.id] = { exchange_id: u.exchange_id, uid: u.uid };
  });

  let paybacks: TransactionRow[] = [];
  if (uidIds.length > 0) {
    const { data: bw } = await supabase
      .from("broker_rebate_withdrawals")
      .select("id, user_broker_uid_id, amount_usd, status, created_at")
      .in("user_broker_uid_id", uidIds)
      .order("created_at", { ascending: false });

    paybacks = ((bw as BrokerWithdrawalRow[] | null) || []).map((r) => ({
      id: r.id,
      type: "uid-payback",
      amount: r.amount_usd,
      usd_paid: r.status === "completed" ? r.amount_usd : 0,
      status: r.status === "completed" ? "sent" : r.status,
      created_at: r.created_at,
      meta: {
        exchange_id: uidMetaById[r.user_broker_uid_id]?.exchange_id,
        broker_uid: uidMetaById[r.user_broker_uid_id]?.uid,
      },
    }));
  }

  return [...withdrawals, ...deposits, ...paybacks].sort(
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
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
    let filtered = rows || [];

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((t) => t.type === typeFilter);
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    // Apply search query
    if (query.trim()) {
      const searchLower = query.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.id.toLowerCase().includes(searchLower) ||
          t.type.toLowerCase().includes(searchLower) ||
          t.status.toLowerCase().includes(searchLower) ||
          t.meta?.bank_name?.toLowerCase().includes(searchLower) ||
          t.meta?.account_number?.includes(searchLower)
      );
    }

    return filtered;
  }, [rows, query, typeFilter, statusFilter]);

  const exportCsv = () => {
    const data = filtered;
    if (!data.length) return;
    const headers = [
      "id",
      "type",
      "amount_kor",
      "received_kor_or_won",
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
          r.type === "deposit" ? r.amount : r.final_amount ?? "",
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

  if (!mounted) {
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
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by id, type, status, or bank..."
                className="pl-10 h-10 rounded-none w-full"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[140px] h-10 rounded-none">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="deposit">Deposits</SelectItem>
                  <SelectItem value="withdrawal">Withdrawals</SelectItem>
                  <SelectItem value="uid-payback">UID Payback</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[140px] h-10 rounded-none">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="rounded-none h-10 w-full sm:w-auto"
                onClick={exportCsv}
              >
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
            </div>
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

            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="text-muted-foreground text-sm">
                  {loading
                    ? "Loading transactions..."
                    : "No transactions found"}
                </div>
                {!loading &&
                  (query || typeFilter !== "all" || statusFilter !== "all") && (
                    <div className="text-xs text-muted-foreground mt-2">
                      Try adjusting your filters or search terms
                    </div>
                  )}
              </div>
            ) : (
              filtered.map((r, idx) => (
                <Fragment key={(r as LoadingOrTransaction)?.id || idx}>
                  {/* Mobile card layout */}
                  <div className="md:hidden p-3 border-b border-border/30 bg-background">
                    <div className="divide-y divide-border/30">
                      <div className="flex items-center justify-between gap-2 py-2 border-b-2 border-border">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          ID
                        </div>
                        <div className="font-mono text-xs truncate max-w-[65%]">
                          {(r as LoadingOrTransaction)?.id || ""}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 py-2">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Type
                        </div>
                        <div className="text-sm">
                          {loading ? (
                            <div className="h-4 w-20 bg-muted rounded" />
                          ) : (r as TransactionRow)?.type === "withdrawal" ? (
                            <div className="inline-flex items-center gap-1.5">
                              <ArrowUpRight className="h-4 w-4 text-red-500" />{" "}
                              Withdrawal
                            </div>
                          ) : (r as TransactionRow)?.type === "deposit" ? (
                            <div className="inline-flex items-center gap-1.5">
                              <ArrowDownRight className="h-4 w-4 text-emerald-500" />{" "}
                              Deposit
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              <DollarSign className="h-4 w-4 text-emerald-500" />{" "}
                              UID Payback
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 py-2">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Amount
                        </div>
                        <div className="text-sm font-semibold">
                          {loading ? (
                            <div className="h-4 w-24 bg-muted rounded" />
                          ) : (r as TransactionRow)?.type === "withdrawal" ? (
                            `- ${
                              (
                                r as TransactionRow
                              )?.amount?.toLocaleString?.() || 0
                            } KOR`
                          ) : (r as TransactionRow)?.type === "deposit" ? (
                            `₩ ${
                              (
                                r as TransactionRow
                              )?.won_paid?.toLocaleString?.() || 0
                            }`
                          ) : (
                            `$ ${
                              (r as TransactionRow)?.amount?.toFixed?.(2) ??
                              "0.00"
                            }`
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 py-2">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Received
                        </div>
                        <div className="text-sm font-semibold">
                          {loading ? (
                            <div className="h-4 w-24 bg-muted rounded" />
                          ) : (r as TransactionRow)?.type === "withdrawal" ? (
                            (r as TransactionRow)?.status === "sent" ? (
                              <span className="text-emerald-600">
                                + ₩ {(r as TransactionRow)?.final_amount ?? 0}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">₩ 0</span>
                            )
                          ) : (r as TransactionRow)?.type === "deposit" ? (
                            (r as TransactionRow)?.status === "sent" ? (
                              <span className="text-emerald-600">
                                +{" "}
                                {(
                                  r as TransactionRow
                                )?.amount?.toLocaleString?.() || 0}{" "}
                                KOR
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                0 KOR
                              </span>
                            )
                          ) : (r as TransactionRow)?.status === "sent" ? (
                            <span className="text-emerald-600">
                              + ${" "}
                              {(r as TransactionRow)?.usd_paid?.toFixed?.(2) ??
                                "0.00"}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              $ 0.00
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 py-2">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Status
                        </div>
                        <div>
                          {loading ? (
                            <div className="h-4 w-16 bg-muted rounded" />
                          ) : (
                            <div
                              className={`inline-flex items-center gap-1.5 px-2 py-1 text-[11px] uppercase tracking-wide border ${
                                (r as TransactionRow)?.status === "sent"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : (r as TransactionRow)?.status === "failed"
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : "border-amber-200 bg-amber-50 text-amber-700"
                              }`}
                            >
                              <div
                                className={`w-1.5 h-1.5 rounded-full ${
                                  (r as TransactionRow)?.status === "sent"
                                    ? "bg-emerald-500"
                                    : (r as TransactionRow)?.status === "failed"
                                    ? "bg-red-500"
                                    : "bg-amber-500"
                                }`}
                              />
                              {(r as TransactionRow)?.status === "sent"
                                ? "Sent"
                                : (r as TransactionRow)?.status === "failed"
                                ? "Failed"
                                : "Pending"}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 py-2 border-b-2 border-border">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          Date
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {loading ? (
                            <div className="h-4 w-28 bg-muted rounded" />
                          ) : (
                            new Date(
                              (r as TransactionRow)?.created_at || ""
                            ).toLocaleString()
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Desktop grid row */}
                  <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 border-b border-border/30 hover:bg-muted/10">
                    <div className="col-span-3 font-mono text-sm break-all">
                      {(r as LoadingOrTransaction)?.id || ""}
                    </div>
                    <div className="col-span-2">
                      {loading ? (
                        <div className="h-4 bg-muted rounded" />
                      ) : (r as TransactionRow)?.type === "withdrawal" ? (
                        <div className="inline-flex items-center gap-2">
                          <ArrowUpRight className="h-4 w-4 text-red-500" />
                          <span className="text-sm">Withdrawal</span>
                        </div>
                      ) : (r as TransactionRow)?.type === "deposit" ? (
                        <div className="inline-flex items-center gap-2">
                          <ArrowDownRight className="h-4 w-4 text-emerald-500" />
                          <span className="text-sm">Deposit</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-emerald-500" />
                          <span className="text-sm">UID Payback</span>
                        </div>
                      )}
                    </div>
                    <div
                      className={`col-span-2 font-semibold ${
                        loading
                          ? ""
                          : (r as TransactionRow)?.type === "withdrawal"
                          ? "text-red-500"
                          : ""
                      }`}
                    >
                      {loading ? (
                        <div className="h-4 bg-muted rounded" />
                      ) : (r as TransactionRow)?.type === "withdrawal" ? (
                        `- ${
                          (r as TransactionRow)?.amount?.toLocaleString?.() || 0
                        } KOR`
                      ) : (r as TransactionRow)?.type === "deposit" ? (
                        `₩ ${
                          (r as TransactionRow)?.won_paid?.toLocaleString?.() ||
                          0
                        }`
                      ) : (
                        `$ ${
                          (r as TransactionRow)?.amount?.toFixed?.(2) ?? "0.00"
                        }`
                      )}
                    </div>
                    <div className="col-span-2 font-semibold">
                      {loading ? (
                        <div className="h-4 bg-muted rounded" />
                      ) : (r as TransactionRow)?.type === "withdrawal" ? (
                        (r as TransactionRow)?.status === "sent" ? (
                          <span className="text-emerald-600">
                            + ₩ {(r as TransactionRow)?.final_amount ?? 0}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">₩ 0</span>
                        )
                      ) : (r as TransactionRow)?.type === "deposit" ? (
                        (r as TransactionRow)?.status === "sent" ? (
                          <span className="text-emerald-600">
                            +{" "}
                            {(
                              r as TransactionRow
                            )?.amount?.toLocaleString?.() || 0}{" "}
                            KOR
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0 KOR</span>
                        )
                      ) : (r as TransactionRow)?.status === "sent" ? (
                        <span className="text-emerald-600">
                          + ${" "}
                          {(r as TransactionRow)?.usd_paid?.toFixed?.(2) ??
                            "0.00"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">$ 0.00</span>
                      )}
                    </div>
                    <div className="col-span-1">
                      {loading ? (
                        <div className="h-4 bg-muted rounded" />
                      ) : (
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs uppercase tracking-wide border ${
                            (r as TransactionRow)?.status === "sent"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : (r as TransactionRow)?.status === "failed"
                              ? "border-red-200 bg-red-50 text-red-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              (r as TransactionRow)?.status === "sent"
                                ? "bg-emerald-500"
                                : (r as TransactionRow)?.status === "failed"
                                ? "bg-red-500"
                                : "bg-amber-500"
                            }`}
                          />
                          {(r as TransactionRow)?.status === "sent"
                            ? "Sent"
                            : (r as TransactionRow)?.status === "failed"
                            ? "Failed"
                            : "Pending"}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 text-sm text-muted-foreground">
                      {loading ? (
                        <div className="h-4 bg-muted rounded" />
                      ) : (
                        new Date(
                          (r as TransactionRow)?.created_at || ""
                        ).toLocaleString()
                      )}
                    </div>
                  </div>
                </Fragment>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
