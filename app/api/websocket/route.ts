// ===== WEBSOCKET API ROUTE =====
// Next.js API route that handles WebSocket connections
// Integrates with our MarketDataServer for real-time data

import { NextRequest } from "next/server";
import { MarketDataServer } from "@/lib/websocket/server";

// Global server instance (singleton pattern)
let marketDataServer: MarketDataServer | null = null;

function isDirectBybitMode(): boolean {
  const url = process.env.NEXT_PUBLIC_WS_URL || "";
  return /stream(-testnet|-demo)?\.bybit\.com/.test(url);
}

// Initialize server on first request
async function getMarketDataServer(): Promise<MarketDataServer> {
  if (!marketDataServer) {
    marketDataServer = new MarketDataServer();
    // Note: do NOT auto-start here; start only on explicit POST start action
  }
  return marketDataServer;
}

export async function GET(request: NextRequest) {
  try {
    if (isDirectBybitMode()) {
      // Direct Bybit mode: do not start internal WS server; report source
      return Response.json({
        success: true,
        message: "Direct Bybit mode",
        data: {
          running: false,
          clientCount: 0,
          bybitStatus: { connected: true, reconnecting: false },
          port: 0,
          source: process.env.NEXT_PUBLIC_WS_URL,
        },
      });
    }

    const server = await getMarketDataServer();
    const status = server.getServerStatus();

    return Response.json({
      success: true,
      message: "Market Data Server status",
      data: status,
    });
  } catch (error) {
    console.error("❌ Failed to get server status:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to get server status",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (isDirectBybitMode()) {
      return Response.json(
        {
          success: false,
          message: "Direct Bybit mode - internal WebSocket server disabled",
        },
        { status: 400 }
      );
    }

    const server = await getMarketDataServer();

    switch (action) {
      case "start":
        await server.start();
        return Response.json({
          success: true,
          message: "Market Data Server started",
        });

      case "stop":
        await server.stop();
        marketDataServer = null;
        return Response.json({
          success: true,
          message: "Market Data Server stopped",
        });

      case "status":
        const status = server.getServerStatus();
        return Response.json({
          success: true,
          data: status,
        });

      case "restart":
        await server.stop();
        marketDataServer = null;
        // const newServer = await getMarketDataServer();
        return Response.json({
          success: true,
          message: "Market Data Server restarted",
        });

      default:
        return Response.json(
          {
            success: false,
            message: "Invalid action",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("❌ Failed to handle server action:", error);

    return Response.json(
      {
        success: false,
        message: "Failed to handle server action",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Handle WebSocket upgrade requests
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
