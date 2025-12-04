# API Contract Documentation

**Project:** Manus Intraday Strategies Dashboard  
**Version:** 1.0.0  
**Last Updated:** December 4, 2025  
**Base URL:** `https://your-domain.manus.app` (production) or `http://localhost:3001` (development)

---

## Table of Contents

1. [Authentication](#authentication)
2. [Portfolio Endpoints](#portfolio-endpoints)
3. [Strategy Endpoints](#strategy-endpoints)
4. [Webhook Endpoints](#webhook-endpoints)
5. [Upload Endpoints](#upload-endpoints)
6. [Admin Endpoints](#admin-endpoints)
7. [Health & System Endpoints](#health--system-endpoints)
8. [Error Codes](#error-codes)
9. [Data Types](#data-types)

---

## Authentication

All API endpoints (except webhooks and health checks) require authentication via Manus OAuth.

**Headers:**
```
x-manus-user-json: <serialized user object>
x-manus-workspace-id: <workspace ID>
```

**User Roles:**
- `admin` - Full access to all features
- `user` - Read-only access to dashboard

---

## Portfolio Endpoints

### 1. Get Portfolio Overview

**Endpoint:** `trpc.portfolio.overview`  
**Method:** `query`  
**Auth Required:** Yes  
**Description:** Returns comprehensive portfolio analytics including equity curves, metrics, and performance breakdowns.

**Input Schema:**
```typescript
{
  timeRange: "YTD" | "1Y" | "3Y" | "5Y" | "ALL",  // Required
  startingCapital: number                          // Optional, default: 100000
}
```

**Output Schema:**
```typescript
{
  // Main equity curves
  equityCurve: Array<{
    date: string,           // Format: "YYYY-MM-DD"
    portfolio: number,      // Portfolio equity value
    spy: number            // S&P 500 benchmark value
  }>,
  
  // Drawdown curves
  drawdownCurve: Array<{
    date: string,
    portfolio: number,      // Drawdown % (negative value)
    spy: number
  }>,
  
  // Key performance metrics
  metrics: {
    portfolio: {
      totalReturn: number,          // Total return %
      annualizedReturn: number,     // CAGR %
      volatility: number,           // Annualized volatility %
      sharpe: number,               // Sharpe ratio
      sortino: number,              // Sortino ratio
      calmar: number,               // Calmar ratio
      maxDrawdown: number,          // Max drawdown %
      winRate: number,              // Win rate %
      profitFactor: number,         // Profit factor
      totalTrades: number,          // Total number of trades
      avgWin: number,               // Average winning trade
      avgLoss: number               // Average losing trade
    },
    spy: {
      // Same structure as portfolio
    }
  },
  
  // Performance breakdown by time period
  breakdown: {
    daily: { portfolio: number, spy: number },      // Today's return %
    weekly: { portfolio: number, spy: number },     // This week's return %
    monthly: { portfolio: number, spy: number },    // This month's return %
    quarterly: { portfolio: number, spy: number },  // This quarter's return %
    ytd: { portfolio: number, spy: number }         // Year-to-date return %
  }
}
```

**Example Request:**
```typescript
const result = await trpc.portfolio.overview.useQuery({
  timeRange: "1Y",
  startingCapital: 100000
});
```

**Example Response:**
```json
{
  "equityCurve": [
    { "date": "2024-01-01", "portfolio": 100000, "spy": 100000 },
    { "date": "2024-01-02", "portfolio": 100500, "spy": 100200 },
    ...
  ],
  "drawdownCurve": [
    { "date": "2024-01-01", "portfolio": 0, "spy": 0 },
    { "date": "2024-01-02", "portfolio": -0.5, "spy": -0.2 },
    ...
  ],
  "metrics": {
    "portfolio": {
      "totalReturn": 15.5,
      "annualizedReturn": 18.2,
      "volatility": 12.3,
      "sharpe": 1.48,
      "sortino": 2.01,
      "calmar": 2.5,
      "maxDrawdown": -8.2,
      "winRate": 65.5,
      "profitFactor": 2.1,
      "totalTrades": 250,
      "avgWin": 1200,
      "avgLoss": -600
    },
    "spy": {
      "totalReturn": 12.0,
      "annualizedReturn": 14.5,
      ...
    }
  },
  "breakdown": {
    "daily": { "portfolio": 0.5, "spy": 0.2 },
    "weekly": { "portfolio": 2.1, "spy": 1.5 },
    "monthly": { "portfolio": 3.5, "spy": 2.8 },
    "quarterly": { "portfolio": 8.2, "spy": 6.5 },
    "ytd": { "portfolio": 15.5, "spy": 12.0 }
  }
}
```

**Error Codes:**
- `UNAUTHORIZED` - User not authenticated
- `BAD_REQUEST` - Invalid time range or starting capital
- `INTERNAL_SERVER_ERROR` - Calculation error

---

### 2. Get Strategy Detail

**Endpoint:** `trpc.portfolio.strategyDetail`  
**Method:** `query`  
**Auth Required:** Yes  
**Description:** Returns detailed analytics for a single strategy.

**Input Schema:**
```typescript
{
  strategyId: number,                              // Required
  timeRange: "YTD" | "1Y" | "3Y" | "5Y" | "ALL", // Required
  startingCapital: number                          // Optional, default: 100000
}
```

**Output Schema:**
```typescript
{
  strategy: {
    id: number,
    name: string,
    description: string,
    type: "swing" | "intraday",
    symbol: string
  },
  
  equityCurve: Array<{
    date: string,
    equity: number
  }>,
  
  drawdownCurve: Array<{
    date: string,
    drawdown: number
  }>,
  
  metrics: {
    totalReturn: number,
    annualizedReturn: number,
    volatility: number,
    sharpe: number,
    sortino: number,
    calmar: number,
    maxDrawdown: number,
    winRate: number,
    profitFactor: number,
    totalTrades: number,
    avgWin: number,
    avgLoss: number,
    avgHoldingPeriod: number  // In days
  },
  
  recentTrades: Array<{
    id: number,
    symbol: string,
    side: string,
    entryPrice: number,
    exitPrice: number,
    entryTime: string,
    exitTime: string,
    pnl: number,
    pnlPercent: number
  }>,
  
  breakdown: {
    daily: number,
    weekly: number,
    monthly: number,
    quarterly: number,
    ytd: number
  }
}
```

**Example Request:**
```typescript
const result = await trpc.portfolio.strategyDetail.useQuery({
  strategyId: 1,
  timeRange: "1Y",
  startingCapital: 100000
});
```

**Status:** ✅ IMPLEMENTED

---

### 3. Compare Strategies

**Endpoint:** `trpc.portfolio.compareStrategies`  
**Method:** `query`  
**Auth Required:** Yes  
**Description:** Compares multiple strategies, showing individual and combined performance with correlation analysis.

**Input Schema:**
```typescript
{
  strategyIds: number[],                           // Required, 2-4 strategies
  timeRange: "YTD" | "1Y" | "3Y" | "5Y" | "ALL", // Required
  startingCapital: number                          // Optional, default: 100000
}
```

**Output Schema:**
```typescript
{
  // Individual equity curves for each strategy
  individualCurves: {
    [strategyId: string]: Array<{
      date: string,
      equity: number
    }>
  },
  
  // Combined portfolio equity curve (equal-weighted)
  combinedCurve: Array<{
    date: string,
    equity: number
  }>,
  
  // Correlation matrix between strategies
  correlationMatrix: {
    strategyIds: number[],
    matrix: number[][]  // NxN matrix where N = number of strategies
  },
  
  // Metrics for combined portfolio
  combinedMetrics: {
    totalReturn: number,
    annualizedReturn: number,
    volatility: number,
    sharpe: number,
    sortino: number,
    calmar: number,
    maxDrawdown: number,
    winRate: number,
    profitFactor: number
  },
  
  // Individual metrics for each strategy
  individualMetrics: {
    [strategyId: string]: {
      totalReturn: number,
      sharpe: number,
      maxDrawdown: number,
      // ... other metrics
    }
  }
}
```

**Example Request:**
```typescript
const result = await trpc.portfolio.compareStrategies.useQuery({
  strategyIds: [1, 2, 3],
  timeRange: "1Y",
  startingCapital: 100000
});
```

**Example Response:**
```json
{
  "individualCurves": {
    "1": [
      { "date": "2024-01-01", "equity": 100000 },
      { "date": "2024-01-02", "equity": 100500 }
    ],
    "2": [
      { "date": "2024-01-01", "equity": 100000 },
      { "date": "2024-01-02", "equity": 100300 }
    ],
    "3": [
      { "date": "2024-01-01", "equity": 100000 },
      { "date": "2024-01-02", "equity": 100700 }
    ]
  },
  "combinedCurve": [
    { "date": "2024-01-01", "equity": 100000 },
    { "date": "2024-01-02", "equity": 100500 }
  ],
  "correlationMatrix": {
    "strategyIds": [1, 2, 3],
    "matrix": [
      [1.00, 0.25, -0.15],
      [0.25, 1.00, 0.40],
      [-0.15, 0.40, 1.00]
    ]
  },
  "combinedMetrics": {
    "totalReturn": 18.5,
    "annualizedReturn": 21.2,
    "volatility": 10.5,
    "sharpe": 2.02,
    "sortino": 2.85,
    "calmar": 3.2,
    "maxDrawdown": -6.5,
    "winRate": 68.0,
    "profitFactor": 2.5
  },
  "individualMetrics": {
    "1": { "totalReturn": 15.5, "sharpe": 1.48, ... },
    "2": { "totalReturn": 12.8, "sharpe": 1.22, ... },
    "3": { "totalReturn": 22.1, "sharpe": 2.15, ... }
  }
}
```

**Status:** ✅ IMPLEMENTED

**Important Notes:**
- The combined curve uses equal weighting (each strategy gets 1/N allocation)
- All curves use forward-fill for non-trading days (continuous lines, no gaps)
- Correlation is calculated on daily returns

---

## Webhook Endpoints

### 1. TradingView Webhook

**Endpoint:** `POST /api/webhook/tradingview`  
**Method:** `POST`  
**Auth Required:** No (uses webhook secret)  
**Description:** Receives trade signals from TradingView alerts.

**Headers:**
```
Content-Type: application/json
x-webhook-secret: <your-webhook-secret>
```

**Input Schema:**
```typescript
{
  strategy: string,        // Strategy name
  symbol: string,          // Trading symbol (e.g., "SPY")
  side: "long" | "short",  // Trade direction
  action: "entry" | "exit", // Trade action
  price: number,           // Execution price
  quantity: number,        // Number of shares/contracts
  timestamp: string,       // ISO 8601 timestamp
  alertId: string          // Unique alert identifier
}
```

**Output Schema:**
```typescript
{
  success: boolean,
  tradeId?: number,        // Database ID of created trade
  message?: string,
  error?: string
}
```

**Example Request:**
```bash
curl -X POST https://your-domain.manus.app/api/webhook/tradingview \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your-secret-key" \
  -d '{
    "strategy": "Intraday Strategy 1",
    "symbol": "SPY",
    "side": "long",
    "action": "entry",
    "price": 450.25,
    "quantity": 100,
    "timestamp": "2025-12-04T14:30:00Z",
    "alertId": "alert_12345"
  }'
```

**Example Response (Success):**
```json
{
  "success": true,
  "tradeId": 1234,
  "message": "Trade signal processed successfully"
}
```

**Example Response (Error):**
```json
{
  "success": false,
  "error": "Invalid webhook secret"
}
```

**Status:** 🚧 TO BE IMPLEMENTED

**Security Notes:**
- Webhook secret must be configured in environment variables
- All webhook events are logged to `webhookLogs` table
- Invalid secrets are rejected immediately
- Malformed payloads are logged and rejected

---

## Health & System Endpoints

### 1. Health Check

**Endpoint:** `GET /health`  
**Method:** `GET`  
**Auth Required:** No  
**Description:** Returns basic health status of the application.

**Output Schema:**
```typescript
{
  status: "ok" | "error",
  timestamp: string,
  version: string,
  uptime: number  // seconds
}
```

**Status:** ✅ IMPLEMENTED

---

### 2. Full Health Check

**Endpoint:** `GET /health/full`  
**Method:** `GET`  
**Auth Required:** No  
**Description:** Returns detailed health status including database connectivity.

**Output Schema:**
```typescript
{
  status: "ok" | "error",
  timestamp: string,
  version: string,
  uptime: number,
  database: {
    connected: boolean,
    latency: number  // milliseconds
  },
  services: {
    [serviceName: string]: {
      status: "ok" | "error",
      message?: string
    }
  }
}
```

**Status:** ✅ IMPLEMENTED

---

## Error Codes

All API errors follow this format:

```typescript
{
  error: {
    code: string,
    message: string,
    details?: any
  }
}
```

**Standard Error Codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | User not authenticated |
| `FORBIDDEN` | 403 | User lacks required permissions |
| `BAD_REQUEST` | 400 | Invalid input parameters |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate) |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

---

## Data Types

### Common Types

```typescript
// Time range options
type TimeRange = "YTD" | "1Y" | "3Y" | "5Y" | "ALL";

// Strategy types
type StrategyType = "swing" | "intraday";

// Trade side
type TradeSide = "long" | "short";

// User roles
type UserRole = "admin" | "user";

// Equity curve point
interface EquityCurvePoint {
  date: string;      // Format: "YYYY-MM-DD"
  equity: number;    // Dollar value
}

// Performance metrics
interface PerformanceMetrics {
  totalReturn: number;          // %
  annualizedReturn: number;     // %
  volatility: number;           // %
  sharpe: number;               // ratio
  sortino: number;              // ratio
  calmar: number;               // ratio
  maxDrawdown: number;          // %
  winRate: number;              // %
  profitFactor: number;         // ratio
  totalTrades: number;          // count
  avgWin: number;               // $
  avgLoss: number;              // $
}

// Trade record
interface Trade {
  id: number;
  userId: number;
  strategyId: number;
  symbol: string;
  side: string;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  entryTime: string;  // ISO 8601
  exitTime: string;   // ISO 8601
  pnl: number;
  pnlPercent: number;
}
```

---

## Calculation Formulas

### Sharpe Ratio
```
Sharpe = (Mean Return - Risk Free Rate) / Standard Deviation of Returns
Annualized Sharpe = Sharpe * sqrt(252) for daily data
```

### Sortino Ratio
```
Sortino = (Mean Return - Risk Free Rate) / Downside Deviation
Downside Deviation = sqrt(mean(min(0, returns)^2))
```

### Maximum Drawdown
```
For each point: Drawdown = (Current Value - Peak Value) / Peak Value
Max Drawdown = min(all drawdowns)
```

### Calmar Ratio
```
Calmar = Annualized Return / |Max Drawdown|
```

### Correlation
```
Correlation(A, B) = Covariance(A, B) / (StdDev(A) * StdDev(B))
```

### Profit Factor
```
Profit Factor = Sum of Winning Trades / |Sum of Losing Trades|
```

---

## Versioning

This API follows semantic versioning (MAJOR.MINOR.PATCH).

**Current Version:** 1.0.0

**Breaking Changes:** Will increment MAJOR version  
**New Features:** Will increment MINOR version  
**Bug Fixes:** Will increment PATCH version

---

## Rate Limiting

**Current Limits:**
- 100 requests per minute per user
- 1000 requests per hour per user

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1638360000
```

---

## Support

For API questions or issues:
- GitHub Issues: https://github.com/bostonrobbie/Manus-Dashboard/issues
- Documentation: See `/docs` folder in repository

---

**End of API Contract**

*This document will be updated as new endpoints are implemented.*
