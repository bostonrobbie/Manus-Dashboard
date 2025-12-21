# Backtesting Engine Comprehensive Audit Report

**Prepared for:** IntraDay Strategies Dashboard  
**Date:** December 20, 2025  
**Author:** Manus AI

---

## Executive Summary

This report presents a comprehensive audit of the IntraDay Strategies Dashboard backtesting engine, comparing its implementation against industry standards used by professional platforms such as QuantConnect, Backtrader, and institutional trading systems. The audit reveals several critical issues that affect the accuracy and reliability of reported performance metrics.

The most significant finding is that the **Sharpe ratio calculation is mathematically incorrect** due to a mismatch between the data frequency (trade-by-trade) and the annualization factor (assumes daily returns). This makes the reported Sharpe ratio incomparable to industry benchmarks and potentially misleading to investors.

---

## 1. Industry Standard: How Professional Engines Work

Professional backtesting engines like QuantConnect and Backtrader follow a consistent methodology for calculating performance metrics [1] [2]:

**Bar-by-Bar Equity Calculation:** Portfolio value is updated on every bar (typically daily), not just when trades close. QuantConnect defines equity as "the total portfolio value if all of the holdings were sold at current market rates" [1]. This means open positions are valued at current market prices (mark-to-market).

**Daily Return Series:** Returns are calculated between consecutive trading days, creating a consistent time series with exactly 252 data points per year. This is essential for accurate Sharpe ratio calculation.

**Proper Annualization:** The Sharpe ratio formula uses `sqrt(N)` where N is the number of periods per year. For daily returns, N=252. For monthly returns, N=12. The data frequency must match the annualization factor [3].

> "The simulation supports different order types, checking a submitted order cash requirements against current cash, keeping track of cash and value for **each iteration** of cerebro." — Backtrader Documentation [2]

---

## 2. Current Implementation Analysis

### 2.1 Equity Curve Construction

The current implementation in `server/analytics.ts` constructs the equity curve as follows:

```typescript
for (const trade of sortedTrades) {
  const pnlDollars = trade.pnl / 100;
  equity += pnlDollars;
  points.push({
    date: trade.exitDate,  // Only adds point when trade CLOSES
    equity,
    drawdown,
  });
}
```

This approach creates an equity point only when a trade closes, resulting in an **irregular time series**. If 500 trades close over a year, the equity curve has 500 points—not the 252 daily points that industry-standard engines produce.

### 2.2 Sharpe Ratio Calculation

The Sharpe ratio is calculated using these "trade-to-trade" returns but annualized as if they were daily:

```typescript
const sharpeRatio = stdDev > 0
  ? (avgDailyReturn / stdDev) * Math.sqrt(252)  // Assumes 252 daily returns
  : 0;
```

This is mathematically incorrect because the returns are not daily—they are trade-to-trade returns with irregular time intervals.

### 2.3 The Core Problem Illustrated

Consider a strategy with 500 trades over one year:

| Aspect | Current Implementation | Industry Standard |
|--------|----------------------|-------------------|
| Data points | 500 (one per trade) | 252 (one per trading day) |
| Return frequency | Irregular (trade-to-trade) | Daily |
| Annualization factor | sqrt(252) | sqrt(252) |
| Time series | Irregular intervals | Consistent daily intervals |

The current implementation applies a daily annualization factor to non-daily data, producing a Sharpe ratio that cannot be compared to industry benchmarks.

---

## 3. Specific Issues Identified

### Issue 1: Sharpe Ratio is Mathematically Incorrect (CRITICAL)

**Problem:** The Sharpe ratio uses `sqrt(252)` for annualization, which assumes 252 daily data points per year. However, the actual data consists of trade-to-trade returns with irregular time intervals.

**Impact:** The reported Sharpe ratio is not comparable to industry benchmarks. A strategy showing a Sharpe of 2.0 in this system might show 1.5 or 2.5 when calculated correctly.

**Example:**
- Strategy has 500 trades per year
- Current: 500 returns annualized with sqrt(252)
- Correct: 252 daily returns annualized with sqrt(252)

### Issue 2: Multiple Trades Per Day Create Multiple Equity Points (HIGH)

**Problem:** If three trades close on Monday, the equity curve has three points for Monday. If no trades close on Tuesday, there are zero points for Tuesday.

**Impact:** The time series is irregular, making statistical calculations unreliable.

**Example:**
- Monday: 3 trades → 3 equity points
- Tuesday: 0 trades → 0 equity points
- Wednesday: 1 trade → 1 equity point

**Correct approach:** Aggregate all trades per day into a single daily P&L, creating exactly one equity point per trading day.

### Issue 3: Flat Days Are Invisible (HIGH)

**Problem:** Days with no trades contribute zero data points to the return series. This means the volatility calculation ignores flat days.

**Impact:** Volatility is overstated because flat days (0% return) are excluded. Since Sharpe = Return / Volatility, overstated volatility leads to understated Sharpe ratio.

### Issue 4: Drawdown May Be Understated (MEDIUM)

**Problem:** Drawdown is calculated only at trade closes. If the account drops 20% intraday but recovers by the time the trade closes, the drawdown is not captured.

**Impact:** For intraday strategies where positions close same-day, this is less critical. However, it still misses intraday fluctuations.

### Issue 5: Forward-Fill Applied After Metrics (LOW)

**Problem:** The `forwardFillEquityCurve` function exists but is applied for display purposes only, not before calculating Sharpe ratio.

**Impact:** The displayed equity curve looks correct (daily points), but the underlying metrics are calculated on irregular data.

---

## 4. What's Working Correctly

Not everything needs to be fixed. The following calculations are correct:

| Metric | Status | Notes |
|--------|--------|-------|
| **Total Return** | ✅ Correct | Sum of all P&L / starting capital |
| **Win Rate** | ✅ Correct | Winning trades / total trades |
| **Profit Factor** | ✅ Correct | Gross profit / gross loss |
| **Average Win/Loss** | ✅ Correct | Simple averages |
| **Max Drawdown Formula** | ✅ Correct | Peak-to-trough calculation is right |
| **Annualized Return** | ✅ Correct | Uses actual time elapsed |
| **Calmar Ratio** | ✅ Correct | Annualized return / max drawdown |

The issue is not with the formulas themselves, but with the **input data** (irregular time series) fed into Sharpe/Sortino calculations.

---

## 5. Recommended Fixes

### Fix 1: Create Daily Aggregated Equity Curve (PRIORITY 1)

Transform the trade-by-trade equity curve into a daily equity curve before calculating metrics.

**Implementation approach:**
1. Group all trades by exit date
2. Sum P&L for all trades closing on each day
3. Create one equity point per trading day
4. Forward-fill days with no trades (carry forward previous equity)

**Pseudocode:**
```typescript
function createDailyEquityCurve(trades: Trade[], startingCapital: number): EquityPoint[] {
  // Group trades by date
  const dailyPnL = new Map<string, number>();
  for (const trade of trades) {
    const dateKey = trade.exitDate.toISOString().split('T')[0];
    dailyPnL.set(dateKey, (dailyPnL.get(dateKey) || 0) + trade.pnl);
  }
  
  // Create daily equity points with forward-fill
  const points: EquityPoint[] = [];
  let equity = startingCapital;
  let peak = startingCapital;
  
  for (let date = firstTradeDate; date <= lastTradeDate; date = nextTradingDay(date)) {
    const pnl = dailyPnL.get(dateKey) || 0;  // 0 if no trades
    equity += pnl / 100;
    peak = Math.max(peak, equity);
    const drawdown = ((peak - equity) / peak) * 100;
    
    points.push({ date, equity, drawdown });
  }
  
  return points;
}
```

### Fix 2: Calculate Sharpe on Daily Returns (PRIORITY 1)

After implementing Fix 1, calculate Sharpe ratio using the daily equity curve:

```typescript
function calculateSharpeRatio(dailyEquityCurve: EquityPoint[]): number {
  const dailyReturns: number[] = [];
  
  for (let i = 1; i < dailyEquityCurve.length; i++) {
    const prevEquity = dailyEquityCurve[i - 1].equity;
    const currEquity = dailyEquityCurve[i].equity;
    dailyReturns.push((currEquity - prevEquity) / prevEquity);
  }
  
  const mean = average(dailyReturns);
  const stdDev = standardDeviation(dailyReturns);
  
  // Now sqrt(252) is correct because we have actual daily returns
  return (mean / stdDev) * Math.sqrt(252);
}
```

### Fix 3: Exclude Weekends from Forward-Fill (PRIORITY 2)

The current forward-fill includes weekends, creating 365 points per year instead of 252. This slightly affects annualization.

**Implementation:** Skip Saturday and Sunday when forward-filling.

### Fix 4: Add Trading Day Calendar (PRIORITY 3)

For maximum accuracy, use a proper trading calendar that accounts for market holidays.

---

## 6. Implementation Roadmap

| Phase | Task | Effort | Impact |
|-------|------|--------|--------|
| **Phase 1** | Create `calculateDailyEquityCurve` function | 2-3 hours | HIGH |
| **Phase 1** | Update `calculatePerformanceMetrics` to use daily curve | 1-2 hours | HIGH |
| **Phase 1** | Add unit tests for daily aggregation | 2-3 hours | HIGH |
| **Phase 2** | Exclude weekends from forward-fill | 1 hour | MEDIUM |
| **Phase 2** | Update existing tests | 1-2 hours | MEDIUM |
| **Phase 3** | Add trading calendar for holidays | 2-3 hours | LOW |
| **Phase 3** | Documentation updates | 1 hour | LOW |

**Total estimated effort:** 10-15 hours

---

## 7. Expected Impact of Fixes

After implementing the recommended fixes, you should expect:

**Sharpe Ratio:** Will likely change. Could go up or down depending on how many flat days exist. The new value will be comparable to industry benchmarks.

**Sortino Ratio:** Same impact as Sharpe—will be calculated on actual daily returns.

**Max Drawdown:** Minimal change for intraday strategies since positions close same-day.

**Display:** Equity curve will look the same (already forward-filled for display).

---

## 8. Validation Strategy

After implementing fixes, validate by:

1. **Manual Calculation:** Take a sample month, manually calculate daily returns in a spreadsheet, and verify the Sharpe ratio matches.

2. **Comparison Test:** If you have access to another backtesting platform, run the same trades and compare metrics.

3. **Regression Tests:** Ensure existing functionality still works (total return, win rate, etc. should not change).

---

## 9. Conclusion

The IntraDay Strategies Dashboard has a solid foundation with correct formulas for most metrics. The primary issue is that Sharpe and Sortino ratios are calculated on irregular trade-by-trade data rather than daily returns, making them mathematically incorrect and incomparable to industry standards.

The recommended fix is straightforward: aggregate trades into daily P&L, create a proper daily equity curve, and calculate risk-adjusted metrics on this daily series. This change will bring the engine in line with professional standards used by QuantConnect, Backtrader, and institutional trading systems.

---

## References

[1] QuantConnect. "Backtesting Results Documentation." https://www.quantconnect.com/docs/v2/cloud-platform/backtesting/results

[2] Backtrader. "Broker Documentation." https://www.backtrader.com/docu/broker/

[3] QuantStart. "Sharpe Ratio for Algorithmic Trading Performance Measurement." https://www.quantstart.com/articles/Sharpe-Ratio-for-Algorithmic-Trading-Performance-Measurement/

[4] Investopedia. "Maximum Drawdown (MDD) Definition." https://www.investopedia.com/terms/m/maximum-drawdown-mdd.asp

[5] Build Alpha. "Equity Curve Trading." https://www.buildalpha.com/equity-curve-trading/

---

*This report is for informational purposes. Implementation changes should be tested thoroughly before deployment.*
