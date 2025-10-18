import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface OrderHistoryParams {
  tradingRoomId: string;
}

interface OrderHistoryQuery {
  symbol?: string;
  side?: string;
  type?: string;
  status?: string;
  limit?: string;
  offset?: string;
}

interface PositionData {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  entry_price: number;
  closed_at?: string;
  order_type?: string;
  fee: number;
  status?: string;
  pnl?: number;
  close_price?: number;
  leverage?: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<OrderHistoryParams> }
) {
  try {
    const { tradingRoomId } = await params;
    const { searchParams } = new URL(request.url);

    // Extract query parameters with proper validation
    const query: OrderHistoryQuery = {
      symbol: searchParams.get("symbol") || undefined,
      side: searchParams.get("side") || undefined,
      type: searchParams.get("type") || undefined,
      status: searchParams.get("status") || undefined,
      limit: searchParams.get("limit") || "50", // Larger default for better initial load
      offset: searchParams.get("offset") || "0",
    };

    // Validate numeric parameters with stricter limits
    const limit = Math.min(parseInt(query.limit || "50"), 100); // Max 100 records per request
    const offset = Math.max(parseInt(query.offset || "0"), 0);

    const supabase = await createClient();

    // Optimized query - only select essential fields for better performance
    let queryBuilder = supabase
      .from("trading_room_positions")
      .select(
        `
        id,
        symbol,
        side,
        quantity,
        entry_price,
        fee,
        closed_at,
        pnl,
        order_type,
        status,
        leverage
      `,
        { count: "exact" } // Get count in same query for better performance
      )
      .eq("room_id", tradingRoomId)
      .not("closed_at", "is", null) // Only closed positions for history
      .order("closed_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters efficiently
    if (query.symbol) {
      queryBuilder = queryBuilder.eq("symbol", query.symbol);
    }

    if (query.side) {
      queryBuilder = queryBuilder.eq("side", query.side);
    }

    if (query.type) {
      queryBuilder = queryBuilder.eq("order_type", query.type);
    }

    if (query.status) {
      queryBuilder = queryBuilder.eq("status", query.status);
    }

    const { data, error, count } = await queryBuilder;

    if (error) {
      console.error("Order history query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch order history" },
        { status: 500 }
      );
    }

    // Transform data for frontend consumption with optimized calculations
    const transformedData =
      data?.map((position: PositionData) => {
        const closedAt = position.closed_at
          ? new Date(position.closed_at)
          : null;
        const totalValue =
          Number(position.quantity) * Number(position.entry_price);

        return {
          id: position.id,
          date: closedAt ? closedAt.toISOString().split("T")[0] : "",
          time: closedAt ? closedAt.toTimeString().split(" ")[0] : "",
          symbol: position.symbol,
          type: position.order_type || "market",
          side: position.side === "long" ? "Long" : "Short",
          price: Number(position.entry_price).toFixed(2),
          amount: Number(position.quantity).toFixed(8),
          totalValue: totalValue.toFixed(2),
          fee: Number(position.fee).toFixed(2),
          status:
            position.status &&
            ["filled", "cancelled", "rejected", "pending"].includes(
              position.status
            )
              ? position.status
              : position.closed_at
              ? "filled"
              : "pending",
          pnl: position.pnl,
          leverage: position.leverage,
        };
      }) || [];

    // Calculate pagination info
    const totalCount = count || 0;
    const hasMore = totalCount > offset + limit;
    const currentPage = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: transformedData,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore,
        currentPage,
        totalPages,
        nextOffset: hasMore ? offset + limit : null,
      },
      filters: {
        symbol: query.symbol,
        side: query.side,
        type: query.type,
        status: query.status,
      },
      meta: {
        loadedAt: new Date().toISOString(),
        requestTime: Date.now(),
      },
    });
  } catch (error) {
    console.error("Order history API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
