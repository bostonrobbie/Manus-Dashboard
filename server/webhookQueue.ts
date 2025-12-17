/**
 * Webhook Queue Service
 * 
 * Provides reliable webhook processing with:
 * - In-memory queue with database persistence
 * - Exponential backoff retry logic
 * - Dead letter queue for permanently failed webhooks
 * - Processing metrics and monitoring
 * 
 * Architecture ready for Redis upgrade when scaling is needed.
 */

import { getDb } from './db';
import { webhookQueue, deadLetterQueue, auditLogs } from '../drizzle/schema';
import { eq, and, lte, sql } from 'drizzle-orm';
import { processWebhook, validatePayload, WebhookValidationError } from './webhookService';

// Queue configuration
const QUEUE_CONFIG = {
  maxAttempts: 5,
  baseDelayMs: 1000, // 1 second
  maxDelayMs: 300000, // 5 minutes
  processingTimeoutMs: 30000, // 30 seconds
  batchSize: 10,
  pollIntervalMs: 1000, // 1 second
};

// Retry delay calculation with exponential backoff and jitter
function calculateRetryDelay(attempt: number): number {
  const exponentialDelay = QUEUE_CONFIG.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 1000; // Add up to 1 second of jitter
  return Math.min(exponentialDelay + jitter, QUEUE_CONFIG.maxDelayMs);
}

// Queue metrics for monitoring
interface QueueMetrics {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  dead: number;
  avgProcessingTimeMs: number;
  lastProcessedAt: Date | null;
}

let metrics: QueueMetrics = {
  pending: 0,
  processing: 0,
  completed: 0,
  failed: 0,
  dead: 0,
  avgProcessingTimeMs: 0,
  lastProcessedAt: null,
};

// In-memory processing state (for distributed locking in future)
const processingItems = new Set<number>();

/**
 * Enqueue a webhook for processing
 */
export async function enqueueWebhook(
  payload: string,
  ipAddress: string,
  correlationId: string
): Promise<{ queueId: number; position: number }> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const [result] = await db.insert(webhookQueue).values({
    payload,
    ipAddress,
    status: 'pending',
    attempts: 0,
    maxAttempts: QUEUE_CONFIG.maxAttempts,
    correlationId,
  });
  
  const queueId = result.insertId;
  
  // Get queue position
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(webhookQueue)
    .where(eq(webhookQueue.status, 'pending'));
  
  const position = countResult?.count || 1;
  
  metrics.pending++;
  
  // Log audit entry
  await logAudit(null, 'webhook.enqueued', 'webhook_queue', queueId, ipAddress, null, {
    correlationId,
    position,
  });
  
  return { queueId, position };
}

/**
 * Process the next batch of pending webhooks
 */
export async function processQueue(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const now = new Date();
  
  // Get pending items that are ready for processing
  const pendingItems = await db
    .select()
    .from(webhookQueue)
    .where(
      and(
        eq(webhookQueue.status, 'pending'),
        sql`(${webhookQueue.nextRetryAt} IS NULL OR ${webhookQueue.nextRetryAt} <= ${now})`
      )
    )
    .limit(QUEUE_CONFIG.batchSize);
  
  let processedCount = 0;
  
  for (const item of pendingItems) {
    // Skip if already being processed (in-memory lock)
    if (processingItems.has(item.id)) continue;
    
    processingItems.add(item.id);
    
    try {
      await processQueueItem(item);
      processedCount++;
    } catch (error) {
      console.error(`[WebhookQueue] Error processing item ${item.id}:`, error);
    } finally {
      processingItems.delete(item.id);
    }
  }
  
  return processedCount;
}

/**
 * Process a single queue item
 */
async function processQueueItem(item: typeof webhookQueue.$inferSelect): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const startTime = Date.now();
  
  // Mark as processing
  await db
    .update(webhookQueue)
    .set({
      status: 'processing',
      startedAt: new Date(),
      attempts: item.attempts + 1,
    })
    .where(eq(webhookQueue.id, item.id));
  
  metrics.processing++;
  metrics.pending--;
  
  try {
    // Parse and validate payload
    const payload = JSON.parse(item.payload);
    
    // Process the webhook
    const result = await processWebhook(payload, item.ipAddress || 'unknown');
    
    const processingTimeMs = Date.now() - startTime;
    
    // Mark as completed
    await db
      .update(webhookQueue)
      .set({
        status: 'completed',
        completedAt: new Date(),
        processingTimeMs,
        webhookLogId: result.logId,
        lastError: null,
      })
      .where(eq(webhookQueue.id, item.id));
    
    metrics.processing--;
    metrics.completed++;
    metrics.lastProcessedAt = new Date();
    updateAvgProcessingTime(processingTimeMs);
    
    // Log success
    await logAudit(null, 'webhook.processed', 'webhook_queue', item.id, item.ipAddress, null, {
      correlationId: item.correlationId,
      processingTimeMs,
      webhookLogId: result.logId,
      tradeId: result.tradeId,
    });
    
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if we should retry or move to dead letter queue
    if (item.attempts + 1 >= QUEUE_CONFIG.maxAttempts) {
      // Move to dead letter queue
      await moveToDeadLetterQueue(item, errorMessage);
    } else {
      // Schedule retry with exponential backoff
      const retryDelay = calculateRetryDelay(item.attempts + 1);
      const nextRetryAt = new Date(Date.now() + retryDelay);
      
      await db
        .update(webhookQueue)
        .set({
          status: 'pending',
          lastError: errorMessage,
          nextRetryAt,
          processingTimeMs,
        })
        .where(eq(webhookQueue.id, item.id));
      
      metrics.processing--;
      metrics.pending++;
      
      // Log retry scheduled
      await logAudit(null, 'webhook.retry_scheduled', 'webhook_queue', item.id, item.ipAddress, null, {
        correlationId: item.correlationId,
        attempt: item.attempts + 1,
        nextRetryAt: nextRetryAt.toISOString(),
        error: errorMessage,
      });
    }
  }
}

/**
 * Move a failed item to the dead letter queue
 */
async function moveToDeadLetterQueue(
  item: typeof webhookQueue.$inferSelect,
  errorMessage: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Get error history from previous attempts
  const errorHistory = item.lastError 
    ? JSON.stringify([item.lastError, errorMessage])
    : JSON.stringify([errorMessage]);
  
  // Insert into dead letter queue
  const [result] = await db.insert(deadLetterQueue).values({
    originalPayload: item.payload,
    ipAddress: item.ipAddress,
    failureReason: errorMessage,
    attempts: item.attempts + 1,
    lastAttemptAt: new Date(),
    errorHistory,
    status: 'unresolved',
  });
  
  // Mark original as dead
  await db
    .update(webhookQueue)
    .set({
      status: 'dead',
      lastError: errorMessage,
      completedAt: new Date(),
    })
    .where(eq(webhookQueue.id, item.id));
  
  metrics.processing--;
  metrics.dead++;
  
  // Log to audit
  await logAudit(null, 'webhook.dead_letter', 'dead_letter_queue', result.insertId, item.ipAddress, null, {
    originalQueueId: item.id,
    correlationId: item.correlationId,
    attempts: item.attempts + 1,
    error: errorMessage,
  });
}

/**
 * Replay a dead letter queue item
 */
export async function replayDeadLetter(
  deadLetterId: number,
  userId: number
): Promise<{ success: boolean; queueId?: number; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: 'Database not available' };
  
  // Get the dead letter item
  const [item] = await db
    .select()
    .from(deadLetterQueue)
    .where(eq(deadLetterQueue.id, deadLetterId));
  
  if (!item) {
    return { success: false, error: 'Dead letter item not found' };
  }
  
  if (item.status !== 'unresolved') {
    return { success: false, error: 'Item already resolved' };
  }
  
  try {
    // Re-enqueue the webhook
    const correlationId = `replay_${deadLetterId}_${Date.now()}`;
    const { queueId } = await enqueueWebhook(
      item.originalPayload,
      item.ipAddress || 'replay',
      correlationId
    );
    
    // Mark dead letter as resolved
    await db
      .update(deadLetterQueue)
      .set({
        status: 'resolved',
        resolvedBy: userId,
        resolvedAt: new Date(),
        resolutionNotes: `Replayed as queue item ${queueId}`,
      })
      .where(eq(deadLetterQueue.id, deadLetterId));
    
    // Log audit
    await logAudit(userId, 'webhook.dead_letter_replayed', 'dead_letter_queue', deadLetterId, null, null, {
      newQueueId: queueId,
    });
    
    return { success: true, queueId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Get queue metrics
 */
export async function getQueueMetrics(): Promise<QueueMetrics & { dbStats: any }> {
  const db = await getDb();
  if (!db) return { ...metrics, dbStats: { queue: null, deadLetter: null } };
  
  // Get counts from database
  const [stats] = await db.execute(sql`
    SELECT 
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      SUM(CASE WHEN status = 'dead' THEN 1 ELSE 0 END) as dead,
      AVG(processingTimeMs) as avgProcessingTime
    FROM webhook_queue
    WHERE receivedAt > DATE_SUB(NOW(), INTERVAL 24 HOUR)
  `);
  
  const [dlqStats] = await db.execute(sql`
    SELECT 
      SUM(CASE WHEN status = 'unresolved' THEN 1 ELSE 0 END) as unresolved,
      SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
      SUM(CASE WHEN status = 'ignored' THEN 1 ELSE 0 END) as ignored
    FROM dead_letter_queue
  `);
  
  return {
    ...metrics,
    dbStats: {
      queue: stats,
      deadLetter: dlqStats,
    },
  };
}

/**
 * Get dead letter queue items
 */
export async function getDeadLetterItems(
  status: 'unresolved' | 'resolved' | 'ignored' | 'all' = 'unresolved',
  limit: number = 50
): Promise<Array<typeof deadLetterQueue.$inferSelect>> {
  const db = await getDb();
  if (!db) return [];
  
  if (status === 'all') {
    return db.select().from(deadLetterQueue).limit(limit);
  }
  
  return db
    .select()
    .from(deadLetterQueue)
    .where(eq(deadLetterQueue.status, status))
    .limit(limit);
}

/**
 * Ignore a dead letter item (mark as not needing resolution)
 */
export async function ignoreDeadLetter(
  deadLetterId: number,
  userId: number,
  reason: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db
    .update(deadLetterQueue)
    .set({
      status: 'ignored',
      resolvedBy: userId,
      resolvedAt: new Date(),
      resolutionNotes: reason,
    })
    .where(eq(deadLetterQueue.id, deadLetterId));
  
  await logAudit(userId, 'webhook.dead_letter_ignored', 'dead_letter_queue', deadLetterId, null, null, {
    reason,
  });
  
  return true;
}

// Helper to update rolling average processing time
function updateAvgProcessingTime(newTime: number): void {
  const alpha = 0.1; // Smoothing factor for exponential moving average
  metrics.avgProcessingTimeMs = metrics.avgProcessingTimeMs * (1 - alpha) + newTime * alpha;
}

// Helper to log audit entries
async function logAudit(
  userId: number | null,
  action: string,
  resourceType: string,
  resourceId: number,
  ipAddress: string | null,
  previousValue: any,
  newValue: any
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(auditLogs).values({
      userId,
      action,
      resourceType,
      resourceId,
      ipAddress,
      previousValue: previousValue ? JSON.stringify(previousValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
      status: 'success',
    });
  } catch (error) {
    console.error('[WebhookQueue] Failed to log audit entry:', error);
  }
}

// Queue processor (runs in background)
let processorInterval: NodeJS.Timeout | null = null;

export function startQueueProcessor(): void {
  if (processorInterval) return;
  
  console.log('[WebhookQueue] Starting queue processor...');
  
  processorInterval = setInterval(async () => {
    try {
      const processed = await processQueue();
      if (processed > 0) {
        console.log(`[WebhookQueue] Processed ${processed} items`);
      }
    } catch (error) {
      console.error('[WebhookQueue] Processor error:', error);
    }
  }, QUEUE_CONFIG.pollIntervalMs);
}

export function stopQueueProcessor(): void {
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
    console.log('[WebhookQueue] Queue processor stopped');
  }
}

// Export config for testing
export const QUEUE_CONFIG_EXPORT = QUEUE_CONFIG;
