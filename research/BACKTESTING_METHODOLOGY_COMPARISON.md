# Backtesting Methodology Analysis Report

**Prepared for:** IntraDay Strategies Dashboard  
**Date:** December 20, 2025  
**Author:** Manus AI

---

## Executive Summary

This report analyzes the current implementation of performance metrics in the IntraDay Strategies Dashboard against industry-standard backtesting methodologies used by professional platforms such as QuantConnect, Backtrader, and institutional trading systems. The analysis reveals several discrepancies that may affect the accuracy of reported metrics, particularly in equity curve construction, Sharpe ratio calculation, and drawdown measurement.

The most significant finding is that the current system uses a **closed-trade equity curve** methodology, which only updates account value when trades are closed. Industry standard for intraday strategies is **mark-to-market (open-trade) equity**, which values positions at the end of each trading day regardless of whether they are closed.

---

## 1. Equity Curve Construction

### Industry Standard Methodology

Professional backtesting platforms construct equity curves using one of two primary methods:

| Method | Description | Best For |
|--------|-------------|----------|
| **Mark-to-Market (MTM)** | Values all positions (open and closed) at end of each day using closing prices | Multi-day positions, accurate drawdown measurement |
| **Closed-Trade** | Only updates equity when positions are closed | Very short-term trades, simplicity |

For intraday trading strategies, the industry consensus favors **mark-to-market equity curves calculated daily** [1]. This approach provides a more accurate representation of the actual account value experienced by traders, including unrealized gains and losses on open positions.

> "For systems trading multiple markets I prefer open-trade DD calculated every day on the close. I found that closed-trade DD often distorts the reality." — Trading Blox Forum [2]

The Build Alpha platform, widely used by systematic traders, calculates equity curves by "simply adding each successive trade to the rolling sum" but emphasizes that this should be done on a **daily basis** for accurate risk metrics [3].

### Current Implementation

The current system uses a **closed-trade equity curve**:

```typescript
for (const trade of sortedTrades) {
  const pnlDollars = trade.pnl / 100;
  equity += pnlDollars;
  // ... equity point added at trade.exitDate
}
```

**Key Issues:**
1. Equity only updates when trades close, not daily
2. Intraday P&L fluctuations are invisible
3. If a position is held overnight, the equity curve shows no change until exit
4. Multiple trades closing on the same day create multiple equity points for that day

### Recommendation

Implement daily mark-to-market equity calculation:
1. For each trading day, calculate the sum of closed P&L plus unrealized P&L on open positions
2. Use end-of-day prices to value open positions
3. Create one equity point per trading day, not per trade

---

## 2. Sharpe Ratio Calculation

### Industry Standard Formula

The Sharpe ratio, developed by William Sharpe in 1966, measures risk-adjusted return [4]. The annualized formula is:

$$S_A = \sqrt{N} \times \frac{E(R_a - R_b)}{\sqrt{Var(R_a - R_b)}}$$

Where:
- $R_a$ = Period return of the strategy
- $R_b$ = Period return of benchmark (typically risk-free rate)
- $N$ = Number of trading periods per year

**Critical requirement:** The returns ($R_a$) must be calculated for consistent time periods (daily, hourly, etc.), and $N$ must match that period type [4].

| Period Type | N Value | Notes |
|-------------|---------|-------|
| Daily | 252 | Standard for equity markets |
| Hourly | 1,638 | 252 × 6.5 trading hours |
| Per-Trade | Varies | Must calculate actual trades per year |

### Current Implementation

```typescript
const sharpeRatio = stdDev > 0
  ? (avgDailyReturn / stdDev) * Math.sqrt(252)
  : 0;
```

**Issues Identified:**

1. **Mismatched annualization factor**: The code uses `sqrt(252)` which assumes daily returns, but the returns are calculated between trade closes, not daily intervals.

2. **Irregular time intervals**: If trades close on different days (e.g., Monday, then Thursday), the "returns" span different time periods but are treated equally.

3. **Missing periods**: Days with no trade closes contribute zero data points, making the sample non-representative of actual daily volatility.

### Example of the Problem

Consider this scenario:
- Day 1: Trade closes with +2% return
- Day 2: No trades close
- Day 3: No trades close  
- Day 4: Trade closes with -1% return

**Current calculation:** Two returns (+2%, -1%), averaged and annualized with sqrt(252)

**Correct calculation:** Four daily returns (+2%, 0%, 0%, -1%), averaged and annualized with sqrt(252)

The current method overstates volatility because it ignores flat days, potentially **understating the Sharpe ratio**.

### Recommendation

1. Forward-fill the equity curve to create daily data points
2. Calculate returns between consecutive trading days
3. Use the forward-filled daily returns for Sharpe calculation
4. Alternatively, calculate per-trade Sharpe with correct annualization: `sqrt(trades_per_year)`

---

## 3. Maximum Drawdown Calculation

### Industry Standard Definition

Maximum drawdown (MDD) measures the largest peak-to-trough decline in portfolio value [5]:

$$MDD = \frac{Trough Value - Peak Value}{Peak Value}$$

The industry standard is to calculate drawdown on **mark-to-market equity**, not just closed-trade equity [2]. This captures the worst-case scenario that a trader would actually experience, including unrealized losses.

### Current Implementation

```typescript
const drawdown = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
```

The formula is correct, but it operates on closed-trade equity, which may **understate actual drawdown** experienced during open positions.

### Example of the Problem

Consider a trader with $100,000 who:
1. Opens a long position
2. Position drops to -$15,000 unrealized loss (equity = $85,000)
3. Position recovers and closes at +$5,000 profit (equity = $105,000)

**Current calculation:** No drawdown recorded (equity went 100K → 105K)

**Correct calculation:** 15% drawdown recorded (equity went 100K → 85K → 105K)

### Recommendation

1. Calculate drawdown on daily mark-to-market equity
2. Track both "closed-trade drawdown" and "open-trade drawdown" separately
3. Report the larger of the two as the primary drawdown metric

---

## 4. Additional Metrics Analysis

### Sortino Ratio

The current implementation correctly uses downside deviation:

```typescript
const downsideReturns = dailyReturns.filter(r => r < 0);
const downsideStdDev = Math.sqrt(
  downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) /
    (downsideReturns.length - 1)
);
```

However, it inherits the same issue as Sharpe—the returns aren't truly daily.

### Calmar Ratio

The Calmar ratio (annualized return / max drawdown) is calculated correctly in formula, but both inputs may be inaccurate due to the closed-trade equity curve.

### Profit Factor

The profit factor calculation is correct and unaffected by equity curve methodology:

```typescript
const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;
```

---

## 5. Summary of Findings

| Metric | Current Method | Industry Standard | Impact |
|--------|---------------|-------------------|--------|
| **Equity Curve** | Closed-trade | Mark-to-market daily | May hide intraday volatility |
| **Sharpe Ratio** | Trade-to-trade × sqrt(252) | Daily returns × sqrt(252) | Likely understated |
| **Max Drawdown** | Peak-to-trough on closed trades | Peak-to-trough on MTM equity | Likely understated |
| **Sortino Ratio** | Trade-to-trade returns | Daily returns | Likely understated |
| **Calmar Ratio** | Uses closed-trade inputs | Uses MTM inputs | Affected by both |
| **Profit Factor** | Correct | Correct | No change needed |
| **Win Rate** | Correct | Correct | No change needed |

---

## 6. Recommended Implementation Changes

### Priority 1: Daily Equity Curve (High Impact)

Create a daily mark-to-market equity curve by:
1. Grouping trades by exit date
2. Summing all P&L for trades closing on each day
3. Forward-filling days with no trades
4. This provides consistent daily data points for all metrics

### Priority 2: Sharpe Ratio Fix (High Impact)

After implementing daily equity curve:
1. Calculate daily returns from consecutive equity points
2. Use these daily returns for Sharpe calculation
3. The sqrt(252) annualization will then be correct

### Priority 3: Drawdown Enhancement (Medium Impact)

For strategies with multi-day positions:
1. Consider adding OHLC data to calculate intraday equity
2. Track both closed-trade and mark-to-market drawdown
3. Display the more conservative (larger) value

### Priority 4: Documentation (Low Impact)

Add methodology notes to the UI explaining:
- How metrics are calculated
- Assumptions made (e.g., no mark-to-market for intraday)
- Comparison to industry standards

---

## References

[1] Investopedia. "Equity Curve Definition." https://www.investopedia.com/terms/e/equity-curve.asp

[2] Trading Blox Forum. "Closed-trade vs. open-trade drawdown." https://www.tradingblox.com/tbforum/viewtopic.php?t=614

[3] Build Alpha. "Equity Curve Trading." https://www.buildalpha.com/equity-curve-trading/

[4] QuantStart. "Sharpe Ratio for Algorithmic Trading Performance Measurement." https://www.quantstart.com/articles/Sharpe-Ratio-for-Algorithmic-Trading-Performance-Measurement/

[5] Investopedia. "Maximum Drawdown (MDD) Definition." https://www.investopedia.com/terms/m/maximum-drawdown-mdd.asp

---

*This report is for informational purposes. Implementation changes should be tested thoroughly before deployment.*
