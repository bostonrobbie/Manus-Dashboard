/**
 * Alpaca API Client
 *
 * Implements the Alpaca Trading API for stocks and crypto trading.
 * Supports both paper trading (free) and live trading.
 *
 * Documentation: https://docs.alpaca.markets/docs/getting-started
 */

// ============================================================================
// TYPES
// ============================================================================

export interface AlpacaCredentials {
  apiKeyId: string;
  apiSecretKey: string;
  isPaper?: boolean; // Default to paper trading
}

export interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string;
  currency: string;
  buying_power: string;
  cash: string;
  portfolio_value: string;
  equity: string;
  last_equity: string;
  long_market_value: string;
  short_market_value: string;
  initial_margin: string;
  maintenance_margin: string;
  daytrade_count: number;
  pattern_day_trader: boolean;
  trading_blocked: boolean;
  transfers_blocked: boolean;
  account_blocked: boolean;
  created_at: string;
}

export interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  exchange: string;
  asset_class: string;
  avg_entry_price: string;
  qty: string;
  side: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  unrealized_intraday_pl: string;
  unrealized_intraday_plpc: string;
  current_price: string;
  lastday_price: string;
  change_today: string;
}

export interface AlpacaOrderRequest {
  symbol: string;
  qty?: string; // Number of shares
  notional?: string; // Dollar amount (for fractional shares)
  side: "buy" | "sell";
  type: "market" | "limit" | "stop" | "stop_limit" | "trailing_stop";
  time_in_force: "day" | "gtc" | "opg" | "cls" | "ioc" | "fok";
  limit_price?: string;
  stop_price?: string;
  trail_price?: string;
  trail_percent?: string;
  extended_hours?: boolean;
  client_order_id?: string;
}

export interface AlpacaOrder {
  id: string;
  client_order_id: string;
  created_at: string;
  updated_at: string;
  submitted_at: string;
  filled_at: string | null;
  expired_at: string | null;
  canceled_at: string | null;
  failed_at: string | null;
  asset_id: string;
  symbol: string;
  asset_class: string;
  qty: string;
  filled_qty: string;
  type: string;
  side: string;
  time_in_force: string;
  limit_price: string | null;
  stop_price: string | null;
  filled_avg_price: string | null;
  status: AlpacaOrderStatus;
  extended_hours: boolean;
  legs: AlpacaOrder[] | null;
}

export type AlpacaOrderStatus =
  | "new"
  | "partially_filled"
  | "filled"
  | "done_for_day"
  | "canceled"
  | "expired"
  | "replaced"
  | "pending_cancel"
  | "pending_replace"
  | "accepted"
  | "pending_new"
  | "accepted_for_bidding"
  | "stopped"
  | "rejected"
  | "suspended"
  | "calculated";

export interface AlpacaAsset {
  id: string;
  class: string;
  exchange: string;
  symbol: string;
  name: string;
  status: string;
  tradable: boolean;
  marginable: boolean;
  shortable: boolean;
  easy_to_borrow: boolean;
  fractionable: boolean;
}

// ============================================================================
// API CLIENT
// ============================================================================

export class AlpacaApiClient {
  private baseUrl: string;
  private dataUrl: string;
  private apiKeyId: string;
  private apiSecretKey: string;
  private isPaper: boolean;

  constructor(credentials: AlpacaCredentials) {
    this.apiKeyId = credentials.apiKeyId;
    this.apiSecretKey = credentials.apiSecretKey;
    this.isPaper = credentials.isPaper ?? true; // Default to paper trading

    // Set base URLs based on paper/live mode
    this.baseUrl = this.isPaper
      ? "https://paper-api.alpaca.markets"
      : "https://api.alpaca.markets";
    this.dataUrl = "https://data.alpaca.markets";
  }

  /**
   * Get authentication headers for API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      "APCA-API-KEY-ID": this.apiKeyId,
      "APCA-API-SECRET-KEY": this.apiSecretKey,
      "Content-Type": "application/json",
    };
  }

  /**
   * Make an authenticated API request
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    useDataUrl: boolean = false
  ): Promise<T> {
    const url = `${useDataUrl ? this.dataUrl : this.baseUrl}${endpoint}`;

    const options: {
      method: string;
      headers: Record<string, string>;
      body?: string;
    } = {
      method,
      headers: this.getHeaders(),
    };

    if (body && (method === "POST" || method === "PATCH" || method === "PUT")) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorText;
      } catch {
        errorMessage = errorText;
      }
      throw new Error(`Alpaca API Error (${response.status}): ${errorMessage}`);
    }

    // Handle empty responses (like DELETE)
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text) as T;
  }

  // ==========================================================================
  // ACCOUNT OPERATIONS
  // ==========================================================================

  /**
   * Get account information
   */
  async getAccount(): Promise<AlpacaAccount> {
    return this.request<AlpacaAccount>("GET", "/v2/account");
  }

  /**
   * Test connection by fetching account info
   */
  async testConnection(): Promise<{
    success: boolean;
    error?: string;
    account?: AlpacaAccount;
  }> {
    try {
      const account = await this.getAccount();
      return { success: true, account };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ==========================================================================
  // POSITION OPERATIONS
  // ==========================================================================

  /**
   * Get all open positions
   */
  async getPositions(): Promise<AlpacaPosition[]> {
    return this.request<AlpacaPosition[]>("GET", "/v2/positions");
  }

  /**
   * Get position for a specific symbol
   */
  async getPosition(symbol: string): Promise<AlpacaPosition> {
    return this.request<AlpacaPosition>("GET", `/v2/positions/${symbol}`);
  }

  /**
   * Close a position for a specific symbol
   */
  async closePosition(
    symbol: string,
    qty?: string,
    percentage?: string
  ): Promise<AlpacaOrder> {
    let endpoint = `/v2/positions/${symbol}`;
    const params: string[] = [];

    if (qty) params.push(`qty=${qty}`);
    if (percentage) params.push(`percentage=${percentage}`);

    if (params.length > 0) {
      endpoint += `?${params.join("&")}`;
    }

    return this.request<AlpacaOrder>("DELETE", endpoint);
  }

  /**
   * Close all positions
   */
  async closeAllPositions(
    cancelOrders: boolean = true
  ): Promise<AlpacaOrder[]> {
    return this.request<AlpacaOrder[]>(
      "DELETE",
      `/v2/positions?cancel_orders=${cancelOrders}`
    );
  }

  // ==========================================================================
  // ORDER OPERATIONS
  // ==========================================================================

  /**
   * Place an order
   */
  async placeOrder(order: AlpacaOrderRequest): Promise<AlpacaOrder> {
    return this.request<AlpacaOrder>("POST", "/v2/orders", order);
  }

  /**
   * Place a simple market order
   */
  async placeMarketOrder(
    symbol: string,
    qty: number,
    side: "buy" | "sell"
  ): Promise<AlpacaOrder> {
    return this.placeOrder({
      symbol,
      qty: qty.toString(),
      side,
      type: "market",
      time_in_force: "day",
    });
  }

  /**
   * Place a limit order
   */
  async placeLimitOrder(
    symbol: string,
    qty: number,
    side: "buy" | "sell",
    limitPrice: number
  ): Promise<AlpacaOrder> {
    return this.placeOrder({
      symbol,
      qty: qty.toString(),
      side,
      type: "limit",
      time_in_force: "day",
      limit_price: limitPrice.toString(),
    });
  }

  /**
   * Get all orders (optionally filtered by status)
   */
  async getOrders(
    status: "open" | "closed" | "all" = "open",
    limit: number = 50
  ): Promise<AlpacaOrder[]> {
    return this.request<AlpacaOrder[]>(
      "GET",
      `/v2/orders?status=${status}&limit=${limit}`
    );
  }

  /**
   * Get a specific order by ID
   */
  async getOrder(orderId: string): Promise<AlpacaOrder> {
    return this.request<AlpacaOrder>("GET", `/v2/orders/${orderId}`);
  }

  /**
   * Get order by client order ID
   */
  async getOrderByClientId(clientOrderId: string): Promise<AlpacaOrder> {
    return this.request<AlpacaOrder>(
      "GET",
      `/v2/orders:by_client_order_id?client_order_id=${clientOrderId}`
    );
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<void> {
    await this.request<void>("DELETE", `/v2/orders/${orderId}`);
  }

  /**
   * Cancel all open orders
   */
  async cancelAllOrders(): Promise<
    { id: string; status: number; body: unknown }[]
  > {
    return this.request<{ id: string; status: number; body: unknown }[]>(
      "DELETE",
      "/v2/orders"
    );
  }

  // ==========================================================================
  // ASSET OPERATIONS
  // ==========================================================================

  /**
   * Get all tradable assets
   */
  async getAssets(
    status: "active" | "inactive" = "active",
    assetClass: "us_equity" | "crypto" = "us_equity"
  ): Promise<AlpacaAsset[]> {
    return this.request<AlpacaAsset[]>(
      "GET",
      `/v2/assets?status=${status}&asset_class=${assetClass}`
    );
  }

  /**
   * Get a specific asset by symbol
   */
  async getAsset(symbol: string): Promise<AlpacaAsset> {
    return this.request<AlpacaAsset>("GET", `/v2/assets/${symbol}`);
  }

  /**
   * Check if an asset is tradable
   */
  async isAssetTradable(symbol: string): Promise<boolean> {
    try {
      const asset = await this.getAsset(symbol);
      return asset.tradable;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Get the trading mode (paper or live)
   */
  getMode(): "paper" | "live" {
    return this.isPaper ? "paper" : "live";
  }

  /**
   * Get the base URL being used
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create an Alpaca API client
 */
export function createAlpacaClient(
  credentials: AlpacaCredentials
): AlpacaApiClient {
  return new AlpacaApiClient(credentials);
}
