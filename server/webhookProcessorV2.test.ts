/**
 * Tests for Robust Webhook Processor V2
 * 
 * Tests transaction handling, WAL integration, retry logic, and error scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import mysql from 'mysql2/promise';

// Mock the database pool
const mockConnection = {
  execute: vi.fn(),
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
  release: vi.fn(),
  ping: vi.fn(),
};

const mockPool = {
  getConnection: vi.fn().mockResolvedValue(mockConnection),
};

// Mock db module
vi.mock('./db', () => ({
  getPool: vi.fn(() => mockPool),
  getDb: vi.fn(),
  getStrategyBySymbol: vi.fn().mockResolvedValue({ id: 1, symbol: 'ESTrend' }),
  getOpenPositionByStrategy: vi.fn().mockResolvedValue(null),
  getWebhookSettings: vi.fn().mockResolvedValue({ paused: false }),
}));

// Mock webhookWal
vi.mock('./webhookWal', () => ({
  writeToWal: vi.fn().mockResolvedValue('wal_test_123'),
  markProcessing: vi.fn().mockResolvedValue(undefined),
  markCompleted: vi.fn().mockResolvedValue(undefined),
  markFailed: vi.fn().mockResolvedValue(undefined),
  getWalEntry: vi.fn().mockResolvedValue(null),
}));

// Mock webhookService
vi.mock('./webhookService', () => ({
  validatePayload: vi.fn().mockImplementation((payload: unknown) => {
    const p = payload as Record<string, unknown>;
    return {
      strategySymbol: String(p.symbol || 'ESTrend'),
      action: String(p.data || 'buy'),
      direction: 'Long',
      price: Number(p.price) || 4500,
      quantity: Number(p.quantity) || 1,
      timestamp: new Date(),
      signalType: p.data === 'exit' ? 'exit' : 'entry',
      marketPosition: p.data === 'exit' ? 'flat' : 'long',
      isTest: false,
    };
  }),
  mapSymbolToStrategy: vi.fn().mockReturnValue('ESTrend'),
  WebhookValidationError: class extends Error {},
  calculatePnL: vi.fn().mockReturnValue(50),
}));

// Mock notification
vi.mock('./_core/notification', () => ({
  notifyOwnerAsync: vi.fn(),
}));

// Mock cache
vi.mock('./cache', () => ({
  cache: {
    invalidatePortfolio: vi.fn(),
  },
}));

// Import after mocks
import { 
  processWebhookRobust, 
  generateCorrelationId,
  checkDatabaseHealth,
  withTransaction,
  withRetry,
  replayWebhook,
} from './webhookProcessorV2';
import { writeToWal, markProcessing, markCompleted, markFailed, getWalEntry } from './webhookWal';
import { getStrategyBySymbol, getOpenPositionByStrategy, getWebhookSettings, getPool } from './db';
import { validatePayload } from './webhookService';

describe('Webhook Processor V2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset mock implementations
    mockConnection.execute.mockReset();
    mockConnection.beginTransaction.mockReset();
    mockConnection.commit.mockReset();
    mockConnection.rollback.mockReset();
    mockConnection.release.mockReset();
    mockConnection.ping.mockResolvedValue(undefined);
    
    // Default execute mock returns insertId
    mockConnection.execute.mockResolvedValue([{ insertId: 1 }]);
    mockConnection.beginTransaction.mockResolvedValue(undefined);
    mockConnection.commit.mockResolvedValue(undefined);
    mockConnection.rollback.mockResolvedValue(undefined);
    mockConnection.release.mockResolvedValue(undefined);
  });

  describe('generateCorrelationId', () => {
    it('should generate unique correlation IDs', () => {
      const id1 = generateCorrelationId();
      const id2 = generateCorrelationId();
      
      expect(id1).toMatch(/^wh_[a-z0-9]+_[a-z0-9]+$/);
      expect(id2).toMatch(/^wh_[a-z0-9]+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('checkDatabaseHealth', () => {
    it('should return true when database is healthy', async () => {
      const result = await checkDatabaseHealth();
      expect(result).toBe(true);
      expect(mockConnection.ping).toHaveBeenCalled();
    });

    it('should return false when pool is not available', async () => {
      vi.mocked(getPool).mockReturnValueOnce(null);
      const result = await checkDatabaseHealth();
      expect(result).toBe(false);
    });

    it('should return false when ping fails', async () => {
      mockConnection.ping.mockRejectedValueOnce(new Error('Connection failed'));
      const result = await checkDatabaseHealth();
      expect(result).toBe(false);
    });
  });

  describe('withRetry', () => {
    it('should return result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await withRetry(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce('success');
      
      const result = await withRetry(fn, 3, 10); // Short delay for tests
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('ECONNRESET'));
      
      await expect(withRetry(fn, 2, 10)).rejects.toThrow('ECONNRESET');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Invalid data'));
      
      await expect(withRetry(fn, 3, 10)).rejects.toThrow('Invalid data');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('withTransaction', () => {
    it('should commit on success', async () => {
      const fn = vi.fn().mockResolvedValue('result');
      
      const result = await withTransaction(fn);
      
      expect(result).toBe('result');
      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockConnection.rollback).not.toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should rollback on error', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Test error'));
      
      await expect(withTransaction(fn)).rejects.toThrow('Test error');
      
      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockConnection.commit).not.toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should release connection even on error', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Test error'));
      
      try {
        await withTransaction(fn);
      } catch {
        // Expected
      }
      
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('processWebhookRobust', () => {
    const validEntryPayload = {
      symbol: 'ESTrend',
      date: new Date().toISOString(),
      data: 'buy',
      quantity: 1,
      price: '4500.00',
    };

    const validExitPayload = {
      symbol: 'ESTrend',
      date: new Date().toISOString(),
      data: 'exit',
      quantity: 1,
      price: '4550.00',
    };

    describe('Health Check', () => {
      it('should return error when database is unavailable', async () => {
        vi.mocked(getPool).mockReturnValueOnce(null);

        const result = await processWebhookRobust(validEntryPayload);

        expect(result.success).toBe(false);
        expect(result.error).toBe('DATABASE_UNAVAILABLE');
      });
    });

    describe('Processing Paused', () => {
      it('should return error when processing is paused', async () => {
        vi.mocked(getWebhookSettings).mockResolvedValueOnce({ paused: true });

        const result = await processWebhookRobust(validEntryPayload);

        expect(result.success).toBe(false);
        expect(result.error).toBe('PROCESSING_PAUSED');
      });
    });

    describe('WAL Integration', () => {
      it('should write to WAL before processing', async () => {
        await processWebhookRobust(validEntryPayload);

        expect(writeToWal).toHaveBeenCalledWith(expect.objectContaining({
          correlationId: expect.any(String),
          rawPayload: expect.any(String),
        }));
      });

      it('should mark WAL as processing after write', async () => {
        await processWebhookRobust(validEntryPayload);

        expect(markProcessing).toHaveBeenCalledWith('wal_test_123');
      });

      it('should mark WAL as completed on success', async () => {
        await processWebhookRobust(validEntryPayload);

        expect(markCompleted).toHaveBeenCalledWith('wal_test_123', expect.any(Number));
      });
    });

    describe('Entry Signal Processing', () => {
      it('should process valid entry signal', async () => {
        const result = await processWebhookRobust(validEntryPayload);

        expect(result.success).toBe(true);
        expect(result.signalType).toBe('entry');
        expect(result.message).toContain('Entry signal logged');
      });

      it('should use transaction for entry signal', async () => {
        await processWebhookRobust(validEntryPayload);

        expect(mockConnection.beginTransaction).toHaveBeenCalled();
        expect(mockConnection.commit).toHaveBeenCalled();
      });

      it('should reject entry when position already exists', async () => {
        vi.mocked(getOpenPositionByStrategy).mockResolvedValueOnce({
          id: 1,
          strategyId: 1,
          strategySymbol: 'ESTrend',
          direction: 'Long',
          entryPrice: 450000,
          quantity: 1,
          entryTime: new Date(),
          status: 'open',
          isTest: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          entryWebhookLogId: null,
          exitPrice: null,
          exitTime: null,
          exitWebhookLogId: null,
          pnl: null,
          tradeId: null,
        });

        const result = await processWebhookRobust(validEntryPayload);

        expect(result.success).toBe(false);
        expect(result.error).toBe('POSITION_EXISTS');
      });
    });

    describe('Exit Signal Processing', () => {
      it('should process valid exit signal when position exists', async () => {
        // Mock validatePayload to return exit signal
        vi.mocked(validatePayload).mockReturnValueOnce({
          strategySymbol: 'ESTrend',
          action: 'exit',
          direction: 'Long',
          price: 4550,
          quantity: 1,
          timestamp: new Date(),
          signalType: 'exit',
          marketPosition: 'flat',
          isTest: false,
        } as any);

        vi.mocked(getOpenPositionByStrategy).mockResolvedValueOnce({
          id: 1,
          strategyId: 1,
          strategySymbol: 'ESTrend',
          direction: 'Long',
          entryPrice: 450000,
          quantity: 1,
          entryTime: new Date(),
          status: 'open',
          isTest: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          entryWebhookLogId: null,
          exitPrice: null,
          exitTime: null,
          exitWebhookLogId: null,
          pnl: null,
          tradeId: null,
        });

        const result = await processWebhookRobust(validExitPayload);

        expect(result.success).toBe(true);
        expect(result.signalType).toBe('exit');
        expect(result.message).toContain('Trade closed');
      });

      it('should reject exit when no position exists', async () => {
        // Mock validatePayload to return exit signal
        vi.mocked(validatePayload).mockReturnValueOnce({
          strategySymbol: 'ESTrend',
          action: 'exit',
          direction: 'Long',
          price: 4550,
          quantity: 1,
          timestamp: new Date(),
          signalType: 'exit',
          marketPosition: 'flat',
          isTest: false,
        } as any);

        vi.mocked(getOpenPositionByStrategy).mockResolvedValueOnce(null);

        const result = await processWebhookRobust(validExitPayload);

        expect(result.success).toBe(false);
        expect(result.error).toBe('NO_OPEN_POSITION');
      });
    });

    describe('Unknown Strategy', () => {
      it('should return error for unknown strategy', async () => {
        vi.mocked(getStrategyBySymbol).mockResolvedValueOnce(null);

        const result = await processWebhookRobust({
          ...validEntryPayload,
          symbol: 'UNKNOWN',
        });

        expect(result.success).toBe(false);
        expect(result.error).toBe('UNKNOWN_STRATEGY');
      });
    });

    describe('Transaction Rollback', () => {
      it('should rollback transaction on database error', async () => {
        mockConnection.execute.mockRejectedValueOnce(new Error('Database error'));

        const result = await processWebhookRobust(validEntryPayload);

        expect(result.success).toBe(false);
        expect(mockConnection.rollback).toHaveBeenCalled();
      });
    });

    describe('Error Handling', () => {
      it('should handle unexpected errors gracefully', async () => {
        vi.mocked(writeToWal).mockRejectedValueOnce(new Error('WAL write failed'));

        const result = await processWebhookRobust(validEntryPayload);

        expect(result.success).toBe(false);
        expect(result.error).toBe('WAL write failed');
      });

      it('should include processing time in error response', async () => {
        vi.mocked(getPool).mockReturnValueOnce(null);

        const result = await processWebhookRobust(validEntryPayload);

        expect(result.processingTimeMs).toBeDefined();
        expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('replayWebhook', () => {
    it('should return error when WAL entry not found', async () => {
      vi.mocked(getWalEntry).mockResolvedValueOnce(null);

      const result = await replayWebhook('nonexistent_wal_id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('WAL_NOT_FOUND');
    });

    it('should return error when WAL entry already completed', async () => {
      vi.mocked(getWalEntry).mockResolvedValueOnce({
        id: 'wal_123',
        status: 'completed',
        rawPayload: '{}',
        correlationId: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
        sourceIp: null,
        userAgent: null,
        parsedPayload: null,
        webhookLogId: 1,
        errorMessage: null,
        retryCount: 0,
      });

      const result = await replayWebhook('wal_123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('ALREADY_COMPLETED');
    });

    it('should replay failed webhook', async () => {
      vi.mocked(getWalEntry).mockResolvedValueOnce({
        id: 'wal_123',
        status: 'failed',
        rawPayload: JSON.stringify({
          symbol: 'ESTrend',
          data: 'buy',
          price: '4500',
          quantity: 1,
        }),
        correlationId: 'test',
        createdAt: new Date(),
        updatedAt: new Date(),
        sourceIp: '127.0.0.1',
        userAgent: 'TradingView',
        parsedPayload: null,
        webhookLogId: null,
        errorMessage: 'Previous error',
        retryCount: 1,
      });

      const result = await replayWebhook('wal_123');

      // Should attempt to process the webhook
      expect(writeToWal).toHaveBeenCalled();
    });
  });
});
