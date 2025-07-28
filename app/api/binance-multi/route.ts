import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbols = searchParams.get("symbols");
  if (!symbols) {
    return NextResponse.json(
      { error: "Missing symbols parameter" },
      { status: 400 }
    );
  }
  const symbolList = symbols.split(",");

  try {
    const results = await Promise.all(
      symbolList.map(async (symbol) => {
        try {
          const [tickerRes, klinesRes] = await Promise.all([
            fetch(`https://api.binance.us/api/v3/ticker/24hr?symbol=${symbol}`),
            fetch(
              `https://api.binance.us/api/v3/klines?symbol=${symbol}&interval=1h&limit=24`
            ),
          ]);
          if (!tickerRes.ok || !klinesRes.ok) {
            console.error(
              `Binance fetch failed for ${symbol}: ticker ${tickerRes.status}, klines ${klinesRes.status}`
            );
            return {
              symbol,
              error: "Binance fetch failed",
              tickerStatus: tickerRes.status,
              klinesStatus: klinesRes.status,
            };
          }
          const ticker = await tickerRes.json();
          const klines = await klinesRes.json();
          return { symbol, ticker, klines };
        } catch (err) {
          console.error(`Error fetching data for ${symbol}:`, err);
          return { symbol, error: String(err) };
        }
      })
    );

    return NextResponse.json({ data: results });
  } catch (err) {
    console.error("Internal server error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
