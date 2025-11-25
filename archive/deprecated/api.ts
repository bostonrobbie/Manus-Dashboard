/**
 * API Client for Trading Dashboard FastAPI Backend
 * 
 * This client provides type-safe access to all backend endpoints.
 * Backend is running on port 8000 with FastAPI.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchJSON<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// TYPES
// ============================================================================

export interface PortfolioOverview {
  equity: number;
  cash: number;
  daily_return: number;
  cumulative_return: number;
  max_drawdown: number;
  sharpe_60d: number | null;
  volatility_20d: number | null;
  beta_60d: number | null;
  alpha_60d: number | null;
  active_positions_count: number;
  total_trades_count: number;
  win_rate: number | null;
  profit_factor: number | null;
  message?: string;
}

export interface EquityPoint {
  time: string;
  equity: number;
  cash: number;
  margin_used: number;
}

export interface EquityCurveResponse {
  count: number;
  data: EquityPoint[];
}

export interface AnalyticsPoint {
  date: string;
  total_equity: number;
  daily_return: number;
  cumulative_return: number;
  max_drawdown: number;
  sharpe_60d: number | null;
  volatility_20d: number | null;
  beta_60d: number | null;
  alpha_60d: number | null;
}

export interface AnalyticsResponse {
  count: number;
  data: AnalyticsPoint[];
}

export interface Position {
  id: string;
  symbol: string;
  qty: number;
  avg_price: number;
  current_price: number | null;
  market_value: number | null;
  unrealized_pnl: number | null;
  realized_pnl: number;
  updated_at: string;
}

export interface PositionsResponse {
  count: number;
  positions: Position[];
}

export interface Trade {
  id: string;
  instrument_id: string;
  symbol: string;
  time: string;
  side: 'buy' | 'sell';
  qty: number;
  price: number;
  fees: number;
  pnl: number | null;
  external_id: string | null;
  source: string;
  created_at: string;
}

export interface TradesResponse {
  count: number;
  offset: number;
  limit: number;
  trades: Trade[];
}

export interface TradeStats {
  total_trades: number;
  total_pnl: number;
  win_rate: number;
  profit_factor: number;
  avg_win: number;
  avg_loss: number;
  avg_trade: number;
  expectancy: number;
  largest_win: number;
  largest_loss: number;
}

export interface OHLCPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
}

export interface OHLCResponse {
  symbol: string;
  count: number;
  data: OHLCPoint[];
}

export interface BenchmarkReturnsResponse {
  symbol: string;
  count: number;
  data: {
    date: string;
    daily_return: number;
    cumulative_return: number;
  }[];
}

export interface WebhookResponse {
  status: string;
  id: string;
  message: string;
}

// ============================================================================
// PORTFOLIO API
// ============================================================================

export const portfolio = {
  /**
   * Get portfolio overview with key metrics
   */
  async getOverview(): Promise<PortfolioOverview> {
    return fetchJSON<PortfolioOverview>('/api/portfolio/overview');
  },

  /**
   * Get equity curve data
   */
  async getEquityCurve(params?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<EquityCurveResponse> {
    const query = new URLSearchParams();
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    if (params?.limit) query.set('limit', params.limit.toString());
    
    const path = `/api/portfolio/equity-curve${query.toString() ? `?${query}` : ''}`;
    return fetchJSON<EquityCurveResponse>(path);
  },

  /**
   * Get analytics time series
   */
  async getAnalytics(params?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<AnalyticsResponse> {
    const query = new URLSearchParams();
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    if (params?.limit) query.set('limit', params.limit.toString());
    
    const path = `/api/portfolio/analytics${query.toString() ? `?${query}` : ''}`;
    return fetchJSON<AnalyticsResponse>(path);
  },

  /**
   * Get current positions
   */
  async getPositions(activeOnly: boolean = true): Promise<PositionsResponse> {
    const query = activeOnly ? '?active_only=true' : '?active_only=false';
    return fetchJSON<PositionsResponse>(`/api/portfolio/positions${query}`);
  },
};

// ============================================================================
// TRADES API
// ============================================================================

export const trades = {
  /**
   * List trades with filtering and pagination
   */
  async list(params?: {
    symbol?: string;
    side?: 'buy' | 'sell';
    start_date?: string;
    end_date?: string;
    offset?: number;
    limit?: number;
  }): Promise<TradesResponse> {
    const query = new URLSearchParams();
    if (params?.symbol) query.set('symbol', params.symbol);
    if (params?.side) query.set('side', params.side);
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    if (params?.offset !== undefined) query.set('offset', params.offset.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    
    const path = `/api/trades${query.toString() ? `?${query}` : ''}`;
    return fetchJSON<TradesResponse>(path);
  },

  /**
   * Get single trade by ID
   */
  async get(id: string): Promise<Trade> {
    return fetchJSON<Trade>(`/api/trades/${id}`);
  },

  /**
   * Get trade statistics
   */
  async getStats(params?: {
    symbol?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<TradeStats> {
    const query = new URLSearchParams();
    if (params?.symbol) query.set('symbol', params.symbol);
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    
    const path = `/api/trades/stats${query.toString() ? `?${query}` : ''}`;
    return fetchJSON<TradeStats>(path);
  },
};

// ============================================================================
// BENCHMARKS API
// ============================================================================

export const benchmarks = {
  /**
   * List available benchmarks
   */
  async list(): Promise<string[]> {
    const response = await fetchJSON<{ benchmarks: string[] }>('/api/benchmarks');
    return response.benchmarks;
  },

  /**
   * Get OHLC data for a benchmark
   */
  async getOHLC(symbol: string, params?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<OHLCResponse> {
    const query = new URLSearchParams();
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    if (params?.limit) query.set('limit', params.limit.toString());
    
    const path = `/api/benchmarks/${symbol}/ohlc${query.toString() ? `?${query}` : ''}`;
    return fetchJSON<OHLCResponse>(path);
  },

  /**
   * Get returns for a benchmark
   */
  async getReturns(symbol: string, params?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<BenchmarkReturnsResponse> {
    const query = new URLSearchParams();
    if (params?.start_date) query.set('start_date', params.start_date);
    if (params?.end_date) query.set('end_date', params.end_date);
    if (params?.limit) query.set('limit', params.limit.toString());
    
    const path = `/api/benchmarks/${symbol}/returns${query.toString() ? `?${query}` : ''}`;
    return fetchJSON<BenchmarkReturnsResponse>(path);
  },

  /**
   * Trigger manual update for a benchmark
   */
  async update(symbol: string, daysBack?: number): Promise<{ message: string }> {
    const query = daysBack ? `?days_back=${daysBack}` : '';
    return fetchJSON<{ message: string }>(`/api/benchmarks/${symbol}/update${query}`, {
      method: 'POST',
    });
  },
};

// ============================================================================
// WEBHOOKS API (for testing)
// ============================================================================

export const webhooks = {
  /**
   * Send a test webhook (for development/testing)
   */
  async ingest(payload: {
    eventType: 'trade' | 'position' | 'equity';
    source: string;
    data: any;
  }): Promise<WebhookResponse> {
    return fetchJSON<WebhookResponse>('/api/webhooks/ingest', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// ============================================================================
// WEBSOCKET
// ============================================================================

export interface WebSocketMessage {
  channel: string;
  data: any;
  timestamp: string;
}

/**
 * Create WebSocket connection to backend
 */
export function createWebSocket(
  channels: string[] = ['all'],
  onMessage: (message: WebSocketMessage) => void,
  onError?: (error: Event) => void,
  onClose?: (event: CloseEvent) => void
): WebSocket {
  const wsUrl = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
  const channelsParam = channels.join(',');
  const ws = new WebSocket(`${wsUrl}/ws?channels=${channelsParam}`);

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      onMessage(message);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  };

  ws.onerror = (error) => {
    // Silently handle error - let the hook manage it
    onError?.(error);
  };

  ws.onclose = (event) => {
    // Silently handle close - let the hook manage it
    onClose?.(event);
  };

  return ws;
}

// Export default API object
export default {
  portfolio,
  trades,
  benchmarks,
  webhooks,
  createWebSocket,
};
