/**
 * TradingView Webhook Handler
 * 
 * Receives trade signals from TradingView and stores them in the database.
 * Supports the actual TradingView webhook format with symbol, date, data, quantity, price, token.
 */

import { Router } from "express";
import { 
  processWebhook, 
  clearWebhookLogs, 
  removeWebhookLog,
  pauseWebhookProcessing,
  resumeWebhookProcessing,
  isWebhookProcessingPaused,
  getAllStrategyTemplates,
  getWebhookUrl
} from "./webhookService";
import * as db from "./db";

const router = Router();

// TradingView IP addresses for allowlisting (from TradingView docs)
const TRADINGVIEW_IPS = [
  '52.89.214.238',
  '34.212.75.30',
  '54.218.53.128',
  '52.32.178.7',
];

/**
 * Extract client IP from request
 */
function getClientIp(req: any): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || 'unknown';
}

/**
 * POST /api/webhook/tradingview
 * Main webhook endpoint for TradingView alerts
 * 
 * Expected payload format:
 * {
 *   "symbol": "BTCUSD",
 *   "date": "{{timenow}}",
 *   "data": "{{strategy.order.action}}",
 *   "quantity": 1,
 *   "price": "{{close}}",
 *   "token": "your_secret_token"
 * }
 */
router.post("/tradingview", async (req, res) => {
  const startTime = Date.now();
  const clientIp = getClientIp(req);
  
  try {
    // Log incoming webhook
    console.log(`[Webhook] Received from ${clientIp}:`, JSON.stringify(req.body).substring(0, 500));

    // Optional: Validate TradingView IP (can be disabled for testing)
    const validateIp = process.env.TRADINGVIEW_VALIDATE_IP === 'true';
    if (validateIp && !TRADINGVIEW_IPS.includes(clientIp)) {
      console.warn(`[Webhook] Request from non-TradingView IP: ${clientIp}`);
      // Don't reject - just log warning (IP validation is optional)
    }

    // Process the webhook
    const result = await processWebhook(req.body, clientIp);
    
    const responseTime = Date.now() - startTime;
    console.log(`[Webhook] Processed in ${responseTime}ms: ${result.message}`);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: result.message,
        logId: result.logId,
        tradeId: result.tradeId,
        processingTimeMs: result.processingTimeMs,
      });
    } else {
      // Return 200 even for "soft" failures (duplicates, no entry match)
      // This prevents TradingView from retrying
      const statusCode = result.error === 'PAUSED' ? 503 : 200;
      return res.status(statusCode).json({
        success: false,
        message: result.message,
        error: result.error,
        logId: result.logId,
        processingTimeMs: result.processingTimeMs,
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Webhook] Error: ${errorMessage}`);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: errorMessage,
      processingTimeMs: Date.now() - startTime,
    });
  }
});

/**
 * GET /api/webhook/health
 * Health check endpoint
 */
router.get("/health", async (req, res) => {
  const isPaused = await isWebhookProcessingPaused();
  res.json({ 
    status: isPaused ? 'paused' : 'ok', 
    service: 'tradingview-webhook',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/webhook/templates
 * Get all strategy alert message templates
 */
router.get("/templates", (req, res) => {
  const token = process.env.TRADINGVIEW_WEBHOOK_TOKEN;
  const templates = getAllStrategyTemplates(token);
  res.json({ templates });
});

// ============================================
// Admin endpoints (require authentication)
// ============================================

/**
 * Middleware to check admin authentication
 */
async function requireAdmin(req: any, res: any, next: any) {
  // For now, check if there's a valid session
  // In production, this should verify admin role
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/**
 * POST /api/webhook/admin/pause
 * Pause webhook processing
 */
router.post("/admin/pause", requireAdmin, async (req, res) => {
  try {
    await pauseWebhookProcessing();
    console.log('[Webhook Admin] Processing paused');
    res.json({ success: true, message: 'Webhook processing paused' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to pause processing' });
  }
});

/**
 * POST /api/webhook/admin/resume
 * Resume webhook processing
 */
router.post("/admin/resume", requireAdmin, async (req, res) => {
  try {
    await resumeWebhookProcessing();
    console.log('[Webhook Admin] Processing resumed');
    res.json({ success: true, message: 'Webhook processing resumed' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to resume processing' });
  }
});

/**
 * DELETE /api/webhook/admin/logs
 * Clear all webhook logs
 */
router.delete("/admin/logs", requireAdmin, async (req, res) => {
  try {
    const result = await clearWebhookLogs();
    console.log(`[Webhook Admin] Cleared ${result.deleted} logs`);
    res.json({ success: true, deleted: result.deleted });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to clear logs' });
  }
});

/**
 * DELETE /api/webhook/admin/logs/:id
 * Delete a specific webhook log
 */
router.delete("/admin/logs/:id", requireAdmin, async (req, res) => {
  try {
    const logId = parseInt(req.params.id, 10);
    if (isNaN(logId)) {
      return res.status(400).json({ success: false, error: 'Invalid log ID' });
    }
    
    const success = await removeWebhookLog(logId);
    if (success) {
      console.log(`[Webhook Admin] Deleted log ${logId}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'Log not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete log' });
  }
});

/**
 * DELETE /api/webhook/admin/trades/:id
 * Delete a specific trade (for removing test trades)
 */
router.delete("/admin/trades/:id", requireAdmin, async (req, res) => {
  try {
    const tradeId = parseInt(req.params.id, 10);
    if (isNaN(tradeId)) {
      return res.status(400).json({ success: false, error: 'Invalid trade ID' });
    }
    
    const success = await db.deleteTrade(tradeId);
    if (success) {
      console.log(`[Webhook Admin] Deleted trade ${tradeId}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, error: 'Trade not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete trade' });
  }
});

/**
 * GET /api/webhook/status
 * Get webhook processing status and statistics
 */
router.get("/status", async (req, res) => {
  try {
    const isPaused = await isWebhookProcessingPaused();
    const logs = await db.getWebhookLogs(100);
    
    // Calculate statistics
    const stats = {
      total: logs.length,
      success: logs.filter(l => l.status === 'success').length,
      failed: logs.filter(l => l.status === 'failed').length,
      duplicate: logs.filter(l => l.status === 'duplicate').length,
      pending: logs.filter(l => l.status === 'pending' || l.status === 'processing').length,
    };
    
    // Calculate average processing time
    const processingTimes = logs
      .filter(l => l.processingTimeMs !== null)
      .map(l => l.processingTimeMs!);
    const avgProcessingTime = processingTimes.length > 0
      ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length)
      : 0;
    
    res.json({
      isPaused,
      stats,
      avgProcessingTimeMs: avgProcessingTime,
      lastWebhook: logs.length > 0 ? logs[0].createdAt : null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get status' });
  }
});

export default router;
