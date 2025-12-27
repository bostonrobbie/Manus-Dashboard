# Alpaca API Integration Notes

## API Endpoints

### Paper Trading (Free)

- Trading API: `https://paper-api.alpaca.markets`
- Market Data API: `https://data.alpaca.markets`

### Live Trading

- Trading API: `https://api.alpaca.markets`
- Market Data API: `https://data.alpaca.markets`

## Authentication

### Legacy Method (Simpler - Use This)

Use HTTP headers for authentication:

```
APCA-API-KEY-ID: {YOUR_API_KEY_ID}
APCA-API-SECRET-KEY: {YOUR_API_SECRET_KEY}
```

Example:

```bash
curl -X GET "https://paper-api.alpaca.markets/v2/account" \
  -H "APCA-API-KEY-ID: {YOUR_API_KEY_ID}" \
  -H "APCA-API-SECRET-KEY: {YOUR_API_SECRET_KEY}"
```

### OAuth2 Method (For Third-Party Apps)

1. Exchange credentials for access token at token endpoint
2. Use Bearer token for API calls
3. Tokens valid for 15 minutes

## Key Endpoints

### Account

- `GET /v2/account` - Get account info (buying power, equity, etc.)

### Orders

- `POST /v2/orders` - Place an order
- `GET /v2/orders` - List orders
- `GET /v2/orders/{order_id}` - Get order by ID
- `DELETE /v2/orders/{order_id}` - Cancel order
- `DELETE /v2/orders` - Cancel all orders

### Positions

- `GET /v2/positions` - List all positions
- `GET /v2/positions/{symbol}` - Get position by symbol
- `DELETE /v2/positions/{symbol}` - Close position
- `DELETE /v2/positions` - Close all positions

### Assets

- `GET /v2/assets` - List all assets
- `GET /v2/assets/{symbol}` - Get asset by symbol

## Order Types

1. **Market Order** - Execute at current market price
2. **Limit Order** - Execute at specified price or better
3. **Stop Order** - Becomes market order when stop price is reached
4. **Stop Limit Order** - Becomes limit order when stop price is reached
5. **Trailing Stop Order** - Stop price trails market price

## Order Parameters

```typescript
interface AlpacaOrder {
  symbol: string; // e.g., "AAPL"
  qty?: string; // Number of shares (or use notional)
  notional?: string; // Dollar amount (fractional shares)
  side: "buy" | "sell";
  type: "market" | "limit" | "stop" | "stop_limit" | "trailing_stop";
  time_in_force: "day" | "gtc" | "opg" | "cls" | "ioc" | "fok";
  limit_price?: string; // Required for limit orders
  stop_price?: string; // Required for stop orders
  trail_price?: string; // For trailing stop
  trail_percent?: string; // For trailing stop
  extended_hours?: boolean; // Allow extended hours trading
  client_order_id?: string; // Custom order ID
}
```

## Time in Force Options

- `day` - Valid for the day only
- `gtc` - Good til canceled
- `opg` - Market on open
- `cls` - Market on close
- `ioc` - Immediate or cancel
- `fok` - Fill or kill

## Extended Hours Trading

- Pre-market: 4:00am - 9:30am ET
- After-hours: 4:00pm - 8:00pm ET
- Overnight: 8:00pm - 4:00am ET (Sunday-Friday)

Requirements for extended hours:

- Order type must be `limit`
- Time in force must be `day`
- Set `extended_hours: true`

## Response Headers

- `X-Request-ID` - Unique identifier for API call (useful for debugging)

## Rate Limits

- 200 requests per minute for most endpoints
- Check response headers for rate limit info

## Futures Support

Note: Alpaca has futures on their roadmap but not yet available.
For futures trading, consider:

- Tradovate (already integrated)
- Interactive Brokers (already integrated)
