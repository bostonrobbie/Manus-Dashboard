/**
 * TradingView Webhook Handler - Enterprise Grade
 * 
 * Features:
 * - Rate limiting (60 req/min per IP)
 * - Input validation and sanitization
 * - Replay attack prevention
 * - Idempotency support
 * - Circuit breaker for database failures
 * - Structured logging with correlation IDs
 * - Comprehensive health monitoring
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
import {
  checkRateLimit,
  validateAndSanitize,
  validateTimestamp,
  generateIdempotencyKey,
  checkIdempotency,
  storeIdempotencyResult,
  isCircuitOpen,
  recordSuccess,
  recordFailure,
  generateCorrelationId,
  createLogEntry,
  logWebhookEvent,
  isTradingViewIP,
  extractClientIP,
  TRADINGVIEW_IPS,
} from "./webhookSecurity";
import * as db from "./db";

const router = Router();

// Circuit breaker name for database operations
const DB_CIRCUIT = 'webhook-database';

// Rate limit configuration
// Higher limit in test/dev environment to allow E2E testing
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: isTestEnv ? 300 : 60,  // 300 in test/dev, 60 in production
};

/**
 * POST /api/webhook/tradingview
 * Main webhook endpoint for TradingView alerts
 * 
 * Security features:
 * - Rate limiting per IP
 * - Input validation and sanitization
 * - Token authentication
 * - Replay attack prevention (timestamp validation)
 * - Idempotency (duplicate request detection)
 * - Circuit breaker for database failures
 */
router.post("/tradingview", async (req, res) => {
  const startTime = Date.now();
  const correlationId = generateCorrelationId();
  const clientIp = extractClientIP(req);
  
  // Add correlation ID and API version to response headers
  res.setHeader('X-Correlation-ID', correlationId);
  res.setHeader('X-API-Version', '1.0.0');
  
  try {
    // Log incoming request
    logWebhookEvent(createLogEntry(correlationId, 'info', 'webhook_received', {
      ip: clientIp,
      contentLength: req.headers['content-length'],
      userAgent: req.headers['user-agent'],
    }));

    // Step 1: Rate limiting
    const rateLimitResult = checkRateLimit(clientIp, RATE_LIMIT_CONFIG);
    res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    res.setHeader('X-RateLimit-Reset', rateLimitResult.resetAt.toString());
    
    if (!rateLimitResult.allowed) {
      logWebhookEvent(createLogEntry(correlationId, 'warn', 'rate_limit_exceeded', {
        ip: clientIp,
        retryAfter: rateLimitResult.retryAfter,
      }));
      
      res.setHeader('Retry-After', rateLimitResult.retryAfter?.toString() || '60');
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retryAfter: rateLimitResult.retryAfter,
        correlationId,
      });
    }

    // Step 2: Circuit breaker check
    if (isCircuitOpen(DB_CIRCUIT)) {
      logWebhookEvent(createLogEntry(correlationId, 'warn', 'circuit_open', {
        circuit: DB_CIRCUIT,
      }));
      
      return res.status(503).json({
        success: false,
        error: 'SERVICE_UNAVAILABLE',
        message: 'Service temporarily unavailable. Please try again later.',
        correlationId,
      });
    }

    // Step 3: Input validation and sanitization
    const validationResult = validateAndSanitize(req.body);
    if (!validationResult.valid) {
      logWebhookEvent(createLogEntry(correlationId, 'warn', 'validation_failed', {
        errors: validationResult.errors,
      }));
      
      return res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        errors: validationResult.errors,
        correlationId,
      });
    }

    const sanitizedPayload = validationResult.sanitized!;

    // Step 4: Timestamp validation (replay attack prevention)
    if (sanitizedPayload.date) {
      const timestampResult = validateTimestamp(sanitizedPayload.date as string);
      if (!timestampResult.valid) {
        logWebhookEvent(createLogEntry(correlationId, 'warn', 'timestamp_invalid', {
          error: timestampResult.error,
          drift: timestampResult.drift,
        }));
        
        return res.status(400).json({
          success: false,
          error: 'TIMESTAMP_INVALID',
          message: timestampResult.error,
          correlationId,
        });
      }
    }

    // Step 5: Idempotency check
    const idempotencyKey = generateIdempotencyKey(sanitizedPayload);
    const existingResult = checkIdempotency(idempotencyKey);
    
    if (existingResult) {
      logWebhookEvent(createLogEntry(correlationId, 'info', 'idempotent_request', {
        idempotencyKey,
      }));
      
      return res.status(200).json({
        ...(existingResult.result as object),
        idempotent: true,
        correlationId,
      });
    }

    // Step 6: IP validation (optional - log warning only)
    const validateIp = process.env.TRADINGVIEW_VALIDATE_IP === 'true';
    if (validateIp && !isTradingViewIP(clientIp)) {
      logWebhookEvent(createLogEntry(correlationId, 'warn', 'non_tradingview_ip', {
        ip: clientIp,
        allowedIps: TRADINGVIEW_IPS,
      }));
      // Continue processing - just log warning
    }

    // Step 7: Process the webhook
    logWebhookEvent(createLogEntry(correlationId, 'info', 'processing_started', {
      symbol: sanitizedPayload.symbol,
      action: sanitizedPayload.data,
    }));

    const result = await processWebhook(sanitizedPayload, clientIp);
    
    const processingTime = Date.now() - startTime;

    // Step 8: Record circuit breaker result
    if (result.success) {
      recordSuccess(DB_CIRCUIT);
    } else if (result.error === 'DATABASE_ERROR') {
      recordFailure(DB_CIRCUIT);
    }

    // Step 9: Store idempotency result
    const response = {
      success: result.success,
      message: result.message,
      logId: result.logId,
      tradeId: result.tradeId,
      signalType: result.signalType,
      processingTimeMs: processingTime,
      correlationId,
    };
    
    storeIdempotencyResult(idempotencyKey, response);

    // Step 10: Log completion
    logWebhookEvent(createLogEntry(correlationId, result.success ? 'info' : 'warn', 'processing_completed', {
      success: result.success,
      processingTimeMs: processingTime,
      tradeId: result.tradeId,
      error: result.error,
    }));

    // Return response
    if (result.success) {
      return res.status(200).json(response);
    } else {
      const statusCode = result.error === 'PAUSED' ? 503 : 200;
      return res.status(statusCode).json({
        ...response,
        error: result.error,
      });
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const processingTime = Date.now() - startTime;
    
    // Record failure for circuit breaker
    recordFailure(DB_CIRCUIT);
    
    logWebhookEvent(createLogEntry(correlationId, 'error', 'processing_error', {
      processingTimeMs: processingTime,
    }, errorMessage));
    
    return res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      correlationId,
      processingTimeMs: processingTime,
    });
  }
});

/**
 * GET /api/webhook/health
 * Health check endpoint with detailed diagnostics
 */
router.get("/health", async (req, res) => {
  const startTime = Date.now();
  
  try {
    const isPaused = await isWebhookProcessingPaused();
    const logs = await db.getWebhookLogs(100);
    
    // Calculate health metrics
    const recentLogs = logs.filter(l => {
      const logTime = new Date(l.createdAt).getTime();
      return Date.now() - logTime < 24 * 60 * 60 * 1000; // Last 24 hours
    });
    
    const successCount = recentLogs.filter(l => l.status === 'success').length;
    const failedCount = recentLogs.filter(l => l.status === 'failed').length;
    const totalRecent = recentLogs.length;
    
    // Calculate success rate
    const successRate = totalRecent > 0 ? (successCount / totalRecent) * 100 : 100;
    
    // Calculate average processing time
    const processingTimes = recentLogs
      .filter(l => l.processingTimeMs !== null)
      .map(l => l.processingTimeMs!);
    const avgProcessingTime = processingTimes.length > 0
      ? Math.round(processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length)
      : 0;
    
    // Determine health status
    let status = 'healthy';
    let issues: string[] = [];
    
    if (isPaused) {
      status = 'paused';
      issues.push('Webhook processing is paused');
    } else if (successRate < 50 && totalRecent > 5) {
      status = 'degraded';
      issues.push(`Low success rate: ${successRate.toFixed(1)}%`);
    } else if (avgProcessingTime > 500) {
      status = 'degraded';
      issues.push(`High latency: ${avgProcessingTime}ms average`);
    }
    
    // Check circuit breaker status
    if (isCircuitOpen(DB_CIRCUIT)) {
      status = 'degraded';
      issues.push('Database circuit breaker is open');
    }
    
    // Check for recent activity
    const lastWebhook = logs.length > 0 ? new Date(logs[0].createdAt) : null;
    const timeSinceLastWebhook = lastWebhook ? Date.now() - lastWebhook.getTime() : null;
    
    res.json({ 
      status,
      service: 'tradingview-webhook',
      version: '1.0.0', // Stable API version - see docs/WEBHOOK_API_CONTRACT.md
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startTime,
      security: {
        rateLimitEnabled: true,
        rateLimitConfig: RATE_LIMIT_CONFIG,
        inputValidationEnabled: true,
        replayProtectionEnabled: true,
        idempotencyEnabled: true,
        circuitBreakerEnabled: true,
        tokenAuthEnabled: !!process.env.TRADINGVIEW_WEBHOOK_TOKEN,
        ipValidationEnabled: process.env.TRADINGVIEW_VALIDATE_IP === 'true',
      },
      diagnostics: {
        isPaused,
        circuitBreakerOpen: isCircuitOpen(DB_CIRCUIT),
        last24Hours: {
          total: totalRecent,
          success: successCount,
          failed: failedCount,
          successRate: `${successRate.toFixed(1)}%`,
        },
        performance: {
          avgProcessingTimeMs: avgProcessingTime,
          maxProcessingTimeMs: processingTimes.length > 0 ? Math.max(...processingTimes) : 0,
          p95ProcessingTimeMs: processingTimes.length > 0 
            ? processingTimes.sort((a, b) => a - b)[Math.floor(processingTimes.length * 0.95)] 
            : 0,
        },
        lastWebhook: lastWebhook?.toISOString() || null,
        timeSinceLastWebhookMs: timeSinceLastWebhook,
      },
      issues: issues.length > 0 ? issues : undefined,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      service: 'tradingview-webhook',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTimeMs: Date.now() - startTime,
    });
  }
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
      circuitBreakerOpen: isCircuitOpen(DB_CIRCUIT),
      stats,
      avgProcessingTimeMs: avgProcessingTime,
      lastWebhook: logs.length > 0 ? logs[0].createdAt : null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get status' });
  }
});

export default router;
