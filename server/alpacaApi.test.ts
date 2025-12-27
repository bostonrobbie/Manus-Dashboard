/**
 * Alpaca API Integration Tests
 *
 * Tests the Alpaca API client functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAlpacaClient } from "./alpacaApi";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("AlpacaApiClient", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("constructor", () => {
    it("should create client with paper trading URL by default", () => {
      const client = createAlpacaClient({
        apiKeyId: "test-key",
        apiSecretKey: "test-secret",
      });

      expect(client.getMode()).toBe("paper");
      expect(client.getBaseUrl()).toBe("https://paper-api.alpaca.markets");
    });

    it("should create client with live trading URL when specified", () => {
      const client = createAlpacaClient({
        apiKeyId: "test-key",
        apiSecretKey: "test-secret",
        isPaper: false,
      });

      expect(client.getMode()).toBe("live");
      expect(client.getBaseUrl()).toBe("https://api.alpaca.markets");
    });
  });

  describe("getAccount", () => {
    it("should fetch account information", async () => {
      const mockAccount = {
        id: "test-account-id",
        account_number: "123456789",
        status: "ACTIVE",
        currency: "USD",
        buying_power: "100000.00",
        cash: "50000.00",
        portfolio_value: "75000.00",
        equity: "75000.00",
        last_equity: "74000.00",
        long_market_value: "25000.00",
        short_market_value: "0.00",
        initial_margin: "0.00",
        maintenance_margin: "0.00",
        daytrade_count: 0,
        pattern_day_trader: false,
        trading_blocked: false,
        transfers_blocked: false,
        account_blocked: false,
        created_at: "2024-01-01T00:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockAccount),
      });

      const client = createAlpacaClient({
        apiKeyId: "test-key",
        apiSecretKey: "test-secret",
      });

      const account = await client.getAccount();

      expect(account.account_number).toBe("123456789");
      expect(account.buying_power).toBe("100000.00");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://paper-api.alpaca.markets/v2/account",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "APCA-API-KEY-ID": "test-key",
            "APCA-API-SECRET-KEY": "test-secret",
          }),
        })
      );
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ message: "Unauthorized" }),
      });

      const client = createAlpacaClient({
        apiKeyId: "invalid-key",
        apiSecretKey: "invalid-secret",
      });

      await expect(client.getAccount()).rejects.toThrow(
        "Alpaca API Error (401)"
      );
    });
  });

  describe("testConnection", () => {
    it("should return success when connection works", async () => {
      const mockAccount = {
        id: "test-id",
        account_number: "123456789",
        status: "ACTIVE",
        currency: "USD",
        buying_power: "100000.00",
        cash: "50000.00",
        portfolio_value: "75000.00",
        equity: "75000.00",
        last_equity: "74000.00",
        long_market_value: "25000.00",
        short_market_value: "0.00",
        initial_margin: "0.00",
        maintenance_margin: "0.00",
        daytrade_count: 0,
        pattern_day_trader: false,
        trading_blocked: false,
        transfers_blocked: false,
        account_blocked: false,
        created_at: "2024-01-01T00:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockAccount),
      });

      const client = createAlpacaClient({
        apiKeyId: "test-key",
        apiSecretKey: "test-secret",
      });

      const result = await client.testConnection();

      expect(result.success).toBe(true);
      expect(result.account).toBeDefined();
      expect(result.account?.account_number).toBe("123456789");
    });

    it("should return failure when connection fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ message: "Invalid API key" }),
      });

      const client = createAlpacaClient({
        apiKeyId: "invalid-key",
        apiSecretKey: "invalid-secret",
      });

      const result = await client.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid API key");
    });
  });

  describe("placeOrder", () => {
    it("should place a market order", async () => {
      const mockOrder = {
        id: "order-123",
        client_order_id: "client-order-123",
        created_at: "2024-01-01T10:00:00Z",
        updated_at: "2024-01-01T10:00:00Z",
        submitted_at: "2024-01-01T10:00:00Z",
        filled_at: null,
        expired_at: null,
        canceled_at: null,
        failed_at: null,
        asset_id: "asset-123",
        symbol: "AAPL",
        asset_class: "us_equity",
        qty: "10",
        filled_qty: "0",
        type: "market",
        side: "buy",
        time_in_force: "day",
        limit_price: null,
        stop_price: null,
        filled_avg_price: null,
        status: "new",
        extended_hours: false,
        legs: null,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockOrder),
      });

      const client = createAlpacaClient({
        apiKeyId: "test-key",
        apiSecretKey: "test-secret",
      });

      const order = await client.placeMarketOrder("AAPL", 10, "buy");

      expect(order.id).toBe("order-123");
      expect(order.symbol).toBe("AAPL");
      expect(order.side).toBe("buy");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://paper-api.alpaca.markets/v2/orders",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            symbol: "AAPL",
            qty: "10",
            side: "buy",
            type: "market",
            time_in_force: "day",
          }),
        })
      );
    });

    it("should place a limit order", async () => {
      const mockOrder = {
        id: "order-456",
        client_order_id: "client-order-456",
        created_at: "2024-01-01T10:00:00Z",
        updated_at: "2024-01-01T10:00:00Z",
        submitted_at: "2024-01-01T10:00:00Z",
        filled_at: null,
        expired_at: null,
        canceled_at: null,
        failed_at: null,
        asset_id: "asset-123",
        symbol: "AAPL",
        asset_class: "us_equity",
        qty: "5",
        filled_qty: "0",
        type: "limit",
        side: "sell",
        time_in_force: "day",
        limit_price: "150.00",
        stop_price: null,
        filled_avg_price: null,
        status: "new",
        extended_hours: false,
        legs: null,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockOrder),
      });

      const client = createAlpacaClient({
        apiKeyId: "test-key",
        apiSecretKey: "test-secret",
      });

      const order = await client.placeLimitOrder("AAPL", 5, "sell", 150.0);

      expect(order.id).toBe("order-456");
      expect(order.type).toBe("limit");
      expect(order.limit_price).toBe("150.00");
    });
  });

  describe("getPositions", () => {
    it("should fetch all positions", async () => {
      const mockPositions = [
        {
          asset_id: "asset-1",
          symbol: "AAPL",
          exchange: "NASDAQ",
          asset_class: "us_equity",
          avg_entry_price: "145.00",
          qty: "10",
          side: "long",
          market_value: "1500.00",
          cost_basis: "1450.00",
          unrealized_pl: "50.00",
          unrealized_plpc: "0.0345",
          unrealized_intraday_pl: "25.00",
          unrealized_intraday_plpc: "0.0169",
          current_price: "150.00",
          lastday_price: "147.50",
          change_today: "0.0169",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockPositions),
      });

      const client = createAlpacaClient({
        apiKeyId: "test-key",
        apiSecretKey: "test-secret",
      });

      const positions = await client.getPositions();

      expect(positions).toHaveLength(1);
      expect(positions[0].symbol).toBe("AAPL");
      expect(positions[0].qty).toBe("10");
    });
  });

  describe("cancelOrder", () => {
    it("should cancel an order", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => "",
      });

      const client = createAlpacaClient({
        apiKeyId: "test-key",
        apiSecretKey: "test-secret",
      });

      await expect(client.cancelOrder("order-123")).resolves.not.toThrow();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://paper-api.alpaca.markets/v2/orders/order-123",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });
  });

  describe("getAsset", () => {
    it("should fetch asset information", async () => {
      const mockAsset = {
        id: "asset-123",
        class: "us_equity",
        exchange: "NASDAQ",
        symbol: "AAPL",
        name: "Apple Inc.",
        status: "active",
        tradable: true,
        marginable: true,
        shortable: true,
        easy_to_borrow: true,
        fractionable: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockAsset),
      });

      const client = createAlpacaClient({
        apiKeyId: "test-key",
        apiSecretKey: "test-secret",
      });

      const asset = await client.getAsset("AAPL");

      expect(asset.symbol).toBe("AAPL");
      expect(asset.tradable).toBe(true);
    });
  });

  describe("isAssetTradable", () => {
    it("should return true for tradable assets", async () => {
      const mockAsset = {
        id: "asset-123",
        class: "us_equity",
        exchange: "NASDAQ",
        symbol: "AAPL",
        name: "Apple Inc.",
        status: "active",
        tradable: true,
        marginable: true,
        shortable: true,
        easy_to_borrow: true,
        fractionable: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockAsset),
      });

      const client = createAlpacaClient({
        apiKeyId: "test-key",
        apiSecretKey: "test-secret",
      });

      const tradable = await client.isAssetTradable("AAPL");
      expect(tradable).toBe(true);
    });

    it("should return false for non-tradable assets", async () => {
      const mockAsset = {
        id: "asset-456",
        class: "us_equity",
        exchange: "NYSE",
        symbol: "XYZ",
        name: "XYZ Corp",
        status: "inactive",
        tradable: false,
        marginable: false,
        shortable: false,
        easy_to_borrow: false,
        fractionable: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockAsset),
      });

      const client = createAlpacaClient({
        apiKeyId: "test-key",
        apiSecretKey: "test-secret",
      });

      const tradable = await client.isAssetTradable("XYZ");
      expect(tradable).toBe(false);
    });

    it("should return false when asset not found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => JSON.stringify({ message: "Asset not found" }),
      });

      const client = createAlpacaClient({
        apiKeyId: "test-key",
        apiSecretKey: "test-secret",
      });

      const tradable = await client.isAssetTradable("INVALID");
      expect(tradable).toBe(false);
    });
  });
});
