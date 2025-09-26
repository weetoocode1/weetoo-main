import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated and is super_admin
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user role
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!userData || userData.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { exchange } = body;

    if (!exchange || !exchange.id) {
      return NextResponse.json(
        { error: "Invalid exchange data" },
        { status: 400 }
      );
    }

    // Save to database
    const { error } = await supabase
      .from("exchanges")
      .upsert({
        id: exchange.id,
        name: exchange.name,
        logo: exchange.logo,
        logo_color: exchange.logoColor,
        logo_image: exchange.logoImage,
        website: exchange.website,
        payback_rate: exchange.paybackRate,
        trading_discount: exchange.tradingDiscount,
        limit_order_fee: exchange.limitOrderFee,
        market_order_fee: exchange.marketOrderFee,
        event: exchange.event,
        average_rebate_per_user: exchange.averageRebatePerUser,
        tags: exchange.tags,
        description: exchange.description,
        features: exchange.features,
      })
      .eq("id", exchange.id);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to save to database" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Exchange ${exchange.name} updated successfully`,
    });
  } catch (error) {
    console.error("Error updating exchange:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch all exchanges from database
    const { data: exchanges, error } = await supabase
      .from("exchanges")
      .select("*")
      .order("payback_rate", { ascending: false });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch exchanges" },
        { status: 500 }
      );
    }

    // Transform database format to match frontend format
    const transformedExchanges = exchanges.map((exchange) => ({
      id: exchange.id,
      name: exchange.name,
      logo: exchange.logo,
      logoColor: exchange.logo_color,
      logoImage: exchange.logo_image,
      website: exchange.website,
      paybackRate: exchange.payback_rate,
      tradingDiscount: exchange.trading_discount,
      limitOrderFee: exchange.limit_order_fee,
      marketOrderFee: exchange.market_order_fee,
      event: exchange.event,
      averageRebatePerUser: exchange.average_rebate_per_user,
      tags: exchange.tags || [],
      description: exchange.description,
      features: exchange.features || [],
    }));

    return NextResponse.json({ exchanges: transformedExchanges });
  } catch (error) {
    console.error("Error fetching exchanges:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
