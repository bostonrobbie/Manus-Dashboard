/**
 * TradingView Webhook Handler
 * Receives trade signals from TradingView and stores them in the database
 */

import { Router } from "express";
import * as db from "./db";

const router = Router();

/**
 * Webhook payload from TradingView
 */
interface TradingViewWebhookPayload {
  strategy: string; // Strategy symbol (e.g., "ESTrend", "NQORB")
  action: "entry" | "exit";
  direction: "long" | "short";
  price: number;
  quantity?: number;
  timestamp: string; // ISO 8601 timestamp
  // For exit signals
  entryPrice?: number;
  entryTimestamp?: string;
}

/**
 * Validate webhook payload
 */
function validatePayload(payload: any): payload is TradingViewWebhookPayload {
  return (
    typeof payload === "object" &&
    typeof payload.strategy === "string" &&
    (payload.action === "entry" || payload.action === "exit") &&
    (payload.direction === "long" || payload.direction === "short") &&
    typeof payload.price === "number" &&
    typeof payload.timestamp === "string"
  );
}

/**
 * POST /api/webhooks/tradingview
 * Receive trade signals from TradingView
 */
router.post("/tradingview", async (req, res) => {
  try {
    // Validate webhook secret (if configured)
    const webhookSecret = process.env.TRADINGVIEW_WEBHOOK_SECRET;
    if (webhookSecret) {
      const providedSecret = req.headers["x-webhook-secret"];
      if (providedSecret !== webhookSecret) {
        console.warn("[Webhook] Invalid webhook secret");
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    const payload = req.body;

    // Validate payload structure
    if (!validatePayload(payload)) {
      console.warn("[Webhook] Invalid payload structure:", payload);
      return res.status(400).json({ error: "Invalid payload" });
    }

    console.log("[Webhook] Received signal:", payload);

    // For exit signals, calculate and store the trade
    if (payload.action === "exit") {
      if (!payload.entryPrice || !payload.entryTimestamp) {
        console.warn("[Webhook] Exit signal missing entry data");
        return res.status(400).json({ error: "Exit signal requires entry data" });
      }

      // Find strategy by symbol
      const strategies = await db.getAllStrategies();
      const strategy = strategies.find(s => s.symbol === payload.strategy);

      if (!strategy) {
        console.warn(`[Webhook] Strategy not found: ${payload.strategy}`);
        return res.status(404).json({ error: "Strategy not found" });
      }

      // Calculate P&L
      const entryPrice = payload.entryPrice;
      const exitPrice = payload.price;
      const quantity = payload.quantity || 1;

      let pnl: number;
      if (payload.direction === "long") {
        pnl = (exitPrice - entryPrice) * quantity;
      } else {
        pnl = (entryPrice - exitPrice) * quantity;
      }

      const pnlPercent = (pnl / (entryPrice * quantity)) * 100;

      // Store trade in database
      await db.insertTrade({
        strategyId: strategy.id,
        entryDate: new Date(payload.entryTimestamp),
        exitDate: new Date(payload.timestamp),
        direction: payload.direction === "long" ? "Long" : "Short",
        entryPrice: Math.round(entryPrice * 100), // Convert to cents
        exitPrice: Math.round(exitPrice * 100),
        quantity,
        pnl: Math.round(pnl * 100), // Convert to cents
        pnlPercent: Math.round(pnlPercent * 10000), // Convert to basis points
        commission: 0, // Can be added if provided
      });

      console.log(`[Webhook] Trade stored: ${strategy.symbol} ${payload.direction} P&L: $${pnl.toFixed(2)}`);

      return res.json({
        success: true,
        message: "Trade recorded",
        pnl: pnl.toFixed(2),
      });
    }

    // For entry signals, just acknowledge (we'll store the full trade on exit)
    return res.json({
      success: true,
      message: "Entry signal received",
    });

  } catch (error) {
    console.error("[Webhook] Error processing webhook:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/webhooks/health
 * Health check endpoint
 */
router.get("/health", (req, res) => {
  res.json({ status: "ok", service: "tradingview-webhook" });
});

export default router;
