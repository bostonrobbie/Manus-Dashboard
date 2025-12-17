/**
 * Webhook Integration Tests
 * 
 * End-to-end tests for the webhook system including:
 * - Health check endpoint
 * - Token authentication
 * - Full webhook flow
 * - Error handling
 */

import { describe, it, expect, beforeAll } from 'vitest';

const baseUrl = process.env.VITE_APP_URL || 'http://localhost:3000';

describe('Webhook Integration Tests', () => {
  
  describe('Health Check Endpoint', () => {
    it('should return health status with diagnostics', async () => {
      const response = await fetch(`${baseUrl}/api/webhook/health`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.status).toBeDefined();
      expect(data.service).toBe('tradingview-webhook');
      expect(data.timestamp).toBeDefined();
      expect(data.responseTimeMs).toBeGreaterThanOrEqual(0);
      expect(data.diagnostics).toBeDefined();
      expect(data.security.tokenAuthEnabled).toBe(true);
    });

    it('should include last 24 hours statistics', async () => {
      const response = await fetch(`${baseUrl}/api/webhook/health`);
      const data = await response.json();
      
      expect(data.diagnostics.last24Hours).toBeDefined();
      expect(typeof data.diagnostics.last24Hours.total).toBe('number');
      expect(typeof data.diagnostics.last24Hours.success).toBe('number');
      expect(typeof data.diagnostics.last24Hours.failed).toBe('number');
      expect(data.diagnostics.last24Hours.successRate).toMatch(/^\d+\.\d+%$/);
    });

    it('should include performance metrics', async () => {
      const response = await fetch(`${baseUrl}/api/webhook/health`);
      const data = await response.json();
      
      expect(data.diagnostics.performance).toBeDefined();
      expect(typeof data.diagnostics.performance.avgProcessingTimeMs).toBe('number');
      expect(typeof data.diagnostics.performance.maxProcessingTimeMs).toBe('number');
    });
  });

  describe('Webhook Endpoint', () => {
    it('should reject requests without token when token is configured', async () => {
      const response = await fetch(`${baseUrl}/api/webhook/tradingview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: 'ESTrend',
          date: new Date().toISOString(),
          data: 'buy',
          quantity: 1,
          price: 4500,
          // No token
        }),
      });
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('token');
    });

    it('should reject requests with invalid token', async () => {
      const response = await fetch(`${baseUrl}/api/webhook/tradingview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: 'ESTrend',
          date: new Date().toISOString(),
          data: 'buy',
          quantity: 1,
          price: 4500,
          token: 'invalid_token_12345',
        }),
      });
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('token');
    });

    it('should accept valid webhook with correct token', async () => {
      const token = process.env.TRADINGVIEW_WEBHOOK_TOKEN;
      if (!token) {
        console.log('Skipping: No token configured');
        return;
      }

      const response = await fetch(`${baseUrl}/api/webhook/tradingview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: 'ESTrend',
          date: new Date().toISOString(),
          data: 'buy',
          quantity: 1,
          price: 4500,
          direction: 'Long',
          token,
        }),
      });
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.message).toContain('Entry signal logged');
      expect(data.processingTimeMs).toBeGreaterThan(0);
    });

    it('should reject unknown strategy symbols', async () => {
      const token = process.env.TRADINGVIEW_WEBHOOK_TOKEN;
      if (!token) {
        console.log('Skipping: No token configured');
        return;
      }

      const response = await fetch(`${baseUrl}/api/webhook/tradingview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: 'UNKNOWN_SYMBOL_XYZ',
          date: new Date().toISOString(),
          data: 'buy',
          quantity: 1,
          price: 4500,
          token,
        }),
      });
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Unknown strategy');
    });

    it('should handle missing required fields gracefully', async () => {
      const token = process.env.TRADINGVIEW_WEBHOOK_TOKEN;
      if (!token) {
        console.log('Skipping: No token configured');
        return;
      }

      const response = await fetch(`${baseUrl}/api/webhook/tradingview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Missing symbol and price
          date: new Date().toISOString(),
          data: 'buy',
          token,
        }),
      });
      
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('Status Endpoint', () => {
    it('should return webhook status and statistics', async () => {
      const response = await fetch(`${baseUrl}/api/webhook/status`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(typeof data.isPaused).toBe('boolean');
      expect(data.stats).toBeDefined();
      expect(typeof data.stats.total).toBe('number');
      expect(typeof data.stats.success).toBe('number');
      expect(typeof data.stats.failed).toBe('number');
      expect(typeof data.avgProcessingTimeMs).toBe('number');
    });
  });

  describe('Templates Endpoint', () => {
    it('should return strategy templates', async () => {
      const response = await fetch(`${baseUrl}/api/webhook/templates`);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.templates).toBeDefined();
      expect(Array.isArray(data.templates)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', async () => {
      const response = await fetch(`${baseUrl}/api/webhook/tradingview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json',
      });
      
      // Express should return 400 for malformed JSON
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle empty body gracefully', async () => {
      const response = await fetch(`${baseUrl}/api/webhook/tradingview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should process webhooks within acceptable time', async () => {
      const token = process.env.TRADINGVIEW_WEBHOOK_TOKEN;
      if (!token) {
        console.log('Skipping: No token configured');
        return;
      }

      const startTime = Date.now();
      const response = await fetch(`${baseUrl}/api/webhook/tradingview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: 'ESTrend',
          date: new Date().toISOString(),
          data: 'buy',
          quantity: 1,
          price: 4500,
          direction: 'Long',
          token,
        }),
      });
      const endTime = Date.now();
      
      const data = await response.json();
      const totalTime = endTime - startTime;
      
      // Total round-trip should be under 1 second
      expect(totalTime).toBeLessThan(1000);
      
      // Server processing should be under 500ms
      if (data.processingTimeMs) {
        expect(data.processingTimeMs).toBeLessThan(500);
      }
    });

    it('should handle concurrent requests', async () => {
      const token = process.env.TRADINGVIEW_WEBHOOK_TOKEN;
      if (!token) {
        console.log('Skipping: No token configured');
        return;
      }

      // Send 5 concurrent requests
      const promises = Array(5).fill(null).map((_, i) => 
        fetch(`${baseUrl}/api/webhook/tradingview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: 'ESTrend',
            date: new Date(Date.now() + i * 1000).toISOString(),
            data: 'buy',
            quantity: 1,
            price: 4500 + i,
            direction: 'Long',
            token,
          }),
        })
      );

      const responses = await Promise.all(promises);
      
      // All requests should complete
      expect(responses.length).toBe(5);
      
      // All should return 200
      responses.forEach(r => {
        expect(r.status).toBe(200);
      });
    });
  });
});
