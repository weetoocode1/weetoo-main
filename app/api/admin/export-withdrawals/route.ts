import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

// Type definitions for the withdrawal data
interface UserBrokerUid {
  exchange_id: string;
}

interface WithdrawalData {
  id: string;
  user_id: string;
  broker_uid: string;
  amount_usd: number;
  currency: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  admin_notes: string | null;
  user_broker_uids: UserBrokerUid[];
}

// Helper function to safely get exchange ID
function getExchangeId(withdrawal: WithdrawalData): string {
  return withdrawal.user_broker_uids[0]?.exchange_id || "Unknown";
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get all completed withdrawal requests from today
    const today = new Date().toISOString().split("T")[0];

    const { data: withdrawals, error } = await supabase
      .from("broker_rebate_withdrawals")
      .select(
        `
        id,
        user_id,
        broker_uid,
        amount_usd,
        currency,
        status,
        created_at,
        processed_at,
        admin_notes,
        user_broker_uids!inner(
          exchange_id
        )
      `
      )
      .eq("status", "completed")
      .gte("processed_at", `${today}T00:00:00.000Z`)
      .order("processed_at", { ascending: false });

    if (error) {
      console.error("Error fetching withdrawals:", error);
      return NextResponse.json(
        { error: "Failed to fetch withdrawals" },
        { status: 500 }
      );
    }

    // Prepare data for Excel export
    const excelData =
      (withdrawals as WithdrawalData[])?.map((withdrawal) => ({
        "Withdrawal ID": withdrawal.id,
        "User ID": withdrawal.user_id,
        "Broker UID": withdrawal.broker_uid,
        Exchange: getExchangeId(withdrawal),
        "Amount (USD)": withdrawal.amount_usd,
        Currency: withdrawal.currency,
        Status: withdrawal.status,
        "Requested At": new Date(withdrawal.created_at).toLocaleString(),
        "Processed At": withdrawal.processed_at
          ? new Date(withdrawal.processed_at).toLocaleString()
          : "Not processed",
        "Admin Notes": withdrawal.admin_notes || "",
      })) || [];

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 15 }, // Withdrawal ID
      { wch: 15 }, // User ID
      { wch: 15 }, // Broker UID
      { wch: 10 }, // Exchange
      { wch: 12 }, // Amount
      { wch: 8 }, // Currency
      { wch: 10 }, // Status
      { wch: 20 }, // Requested At
      { wch: 20 }, // Processed At
      { wch: 30 }, // Admin Notes
    ];
    worksheet["!cols"] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Approved Withdrawals");

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Return Excel file as response
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="approved-withdrawals-${today}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("Error exporting withdrawals:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
