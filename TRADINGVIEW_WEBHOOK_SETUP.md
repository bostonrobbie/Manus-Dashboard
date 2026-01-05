# TradingView Webhook Setup Guide

## Webhook URL

```
https://intradaydash-jfmy8c2b.manus.space/api/webhook/tradingview
```

## Authentication Token

```
RobTradingDashWebhookToken32K
```

---

## JSON Templates for TradingView Alerts

### IMPORTANT: Copy these EXACTLY as shown (including all punctuation)

The JSON must be **valid** - no extra characters, no missing commas, no typos.

---

## Strategy-Specific Templates

### GC Trend (Gold)

```json
{
  "symbol": "GCTrend",
  "date": "{{timenow}}",
  "data": "{{strategy.order.action}}",
  "position": "{{strategy.market_position}}",
  "quantity": {{strategy.order.contracts}},
  "price": {{close}},
  "token": "RobTradingDashWebhookToken32K"
}
```

### NQ Trend (Nasdaq)

```json
{
  "symbol": "NQTrend",
  "date": "{{timenow}}",
  "data": "{{strategy.order.action}}",
  "position": "{{strategy.market_position}}",
  "quantity": {{strategy.order.contracts}},
  "price": {{close}},
  "token": "RobTradingDashWebhookToken32K"
}
```

### ES Trend (S&P 500)

```json
{
  "symbol": "ESTrend",
  "date": "{{timenow}}",
  "data": "{{strategy.order.action}}",
  "position": "{{strategy.market_position}}",
  "quantity": {{strategy.order.contracts}},
  "price": {{close}},
  "token": "RobTradingDashWebhookToken32K"
}
```

### CL Trend (Crude Oil)

```json
{
  "symbol": "CLTrend",
  "date": "{{timenow}}",
  "data": "{{strategy.order.action}}",
  "position": "{{strategy.market_position}}",
  "quantity": {{strategy.order.contracts}},
  "price": {{close}},
  "token": "RobTradingDashWebhookToken32K"
}
```

### BTC Trend (Bitcoin)

```json
{
  "symbol": "BTCTrend",
  "date": "{{timenow}}",
  "data": "{{strategy.order.action}}",
  "position": "{{strategy.market_position}}",
  "quantity": {{strategy.order.contracts}},
  "price": {{close}},
  "token": "RobTradingDashWebhookToken32K"
}
```

### YM ORB (Dow Jones)

```json
{
  "symbol": "YMORB",
  "date": "{{timenow}}",
  "data": "{{strategy.order.action}}",
  "position": "{{strategy.market_position}}",
  "quantity": {{strategy.order.contracts}},
  "price": {{close}},
  "token": "RobTradingDashWebhookToken32K"
}
```

---

## How TradingView Resolves Variables

| Variable                       | Entry Signal        | Exit Signal               |
| ------------------------------ | ------------------- | ------------------------- |
| `{{strategy.order.action}}`    | "buy" or "sell"     | "buy", "sell", or "close" |
| `{{strategy.market_position}}` | "long" or "short"   | "flat"                    |
| `{{strategy.order.contracts}}` | Number of contracts | Number of contracts       |
| `{{close}}`                    | Current price       | Current price             |
| `{{timenow}}`                  | ISO timestamp       | ISO timestamp             |

---

## Common Mistakes to Avoid

### ❌ WRONG - Extra quote at start

```
"{{
  "symbol": "GCTrend",
```

### ❌ WRONG - Quotes around numbers

```json
{
  "quantity": "{{strategy.order.contracts}}",
  "price": "{{close}}"
}
```

### ❌ WRONG - Missing comma

```json
{
  "symbol": "GCTrend"
  "date": "{{timenow}}"
}
```

### ✅ CORRECT

```json
{
  "symbol": "GCTrend",
  "date": "{{timenow}}",
  "data": "{{strategy.order.action}}",
  "position": "{{strategy.market_position}}",
  "quantity": {{strategy.order.contracts}},
  "price": {{close}},
  "token": "RobTradingDashWebhookToken32K"
}
```

---

## Setting Up the Alert in TradingView

1. Open your chart with the strategy
2. Click on the strategy name → "Add Alert"
3. In the alert dialog:
   - **Condition**: Select your strategy
   - **Alert actions**: Check "Webhook URL"
   - **Webhook URL**: Paste the URL above
   - **Message**: Paste the JSON template for your strategy
4. Click "Create"

---

## Testing Your Webhook

You can test the webhook using the Admin Control Center:

1. Go to Admin Control Center → Test Signals tab
2. Select the strategy and signal type (entry/exit)
3. Click "Send Test Signal"
4. Check the Signal Log tab for results

---

## Troubleshooting

### Webhook not appearing in Signal Log

- Verify the webhook URL is correct
- Check that the JSON is valid (use jsonlint.com to validate)
- Ensure the token matches exactly

### "Missing symbol" error

- The JSON is malformed - check for extra characters
- Copy the template exactly as shown above

### "Unknown strategy" error

- The symbol doesn't match any registered strategy
- Use exact symbol names: GCTrend, NQTrend, ESTrend, CLTrend, BTCTrend, YMORB

### "No open position" error on exit

- The entry signal failed or wasn't received
- Check the Signal Log for the entry signal status
