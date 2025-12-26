# Professional Backtesting Engine Research

## Key Findings from QuantConnect

### Equity Calculation
- **Equity** = "The total portfolio value if all of the holdings were sold at current market rates"
- This is **mark-to-market** - values ALL positions at current prices
- Updated on EVERY bar/iteration, not just when trades close

### Built-in Charts
- **Strategy Equity**: Time series of equity AND periodic returns
- **Drawdown**: Time series of equity peak-to-trough value (calculated continuously)
- **Benchmark**: Time series of benchmark closing price (SPY by default)

### Key Insight
QuantConnect calculates equity on EVERY bar iteration, not just on trade closes. This means:
- Open positions are valued at current market price
- Drawdown captures intraday/intrabar fluctuations
- Returns are calculated from bar-to-bar equity changes

---

## Key Findings from Backtrader

### Broker Simulator
- "keeping track of cash and value for **each iteration** of cerebro"
- "cash is adjusted on **each iteration** for instruments like futures"

### get_value() Method
- "Returns the portfolio value of the given datas"
- Called on EVERY bar to get current portfolio value
- Values open positions at current market prices

### Key Insight
Backtrader also uses bar-by-bar equity calculation:
- Portfolio value updated every bar
- Cash adjusted for futures mark-to-market
- This is the industry standard approach

---

## Comparison: Industry Standard vs Our Implementation

| Aspect | Industry Standard | Our Implementation |
|--------|-------------------|-------------------|
| **Equity Update Frequency** | Every bar/day | Only on trade close |
| **Open Position Valuation** | Mark-to-market at current price | Not valued until closed |
| **Drawdown Calculation** | Peak-to-trough on bar-by-bar equity | Peak-to-trough on closed-trade equity |
| **Return Calculation** | Bar-to-bar equity change | Trade-to-trade equity change |
| **Time Series Granularity** | One point per bar/day | One point per trade |

---

## Critical Issues Identified

### 1. No Bar-by-Bar Equity
Our system only updates equity when trades close. Professional engines update on every bar.

**Impact**: 
- Misses intraday P&L fluctuations
- Understates drawdown
- Irregular time intervals for returns

### 2. No Mark-to-Market for Open Positions
We don't value open positions at current market prices.

**Impact**:
- Equity curve doesn't reflect actual account value
- Drawdown may be significantly understated
- Risk metrics don't capture open position risk

### 3. Sharpe Ratio Annualization Mismatch
We use sqrt(252) but our returns aren't daily.

**Impact**:
- Sharpe ratio is mathematically incorrect
- Not comparable to industry benchmarks

---

## What We Need to Fix

### Priority 1: Daily Equity Curve
Create one equity point per trading day by:
1. Grouping all trades by date
2. Summing P&L for trades closing on each day
3. Forward-filling days with no trades

### Priority 2: Correct Sharpe Annualization
After implementing daily equity:
1. Calculate daily returns from consecutive equity points
2. Use sqrt(252) correctly on actual daily returns

### Priority 3: Consider Mark-to-Market (Future Enhancement)
For multi-day positions:
1. Track entry price and current price
2. Calculate unrealized P&L daily
3. Add to equity curve

---

## Important Note on Our Data

Our strategies are **intraday** - positions are opened and closed within the same day. This means:
- Mark-to-market is less critical (no overnight positions)
- BUT we still need daily equity points for correct Sharpe calculation
- Multiple trades per day should be aggregated to one daily P&L

---

## References

1. QuantConnect Docs: https://www.quantconnect.com/docs/v2/cloud-platform/backtesting/results
2. Backtrader Broker: https://www.backtrader.com/docu/broker/
3. Build Alpha: https://www.buildalpha.com/equity-curve-trading/


---

# DETAILED CODE AUDIT

## Current Implementation Analysis

### 1. Equity Curve Construction (`calculateEquityCurve`, lines 89-125)

```typescript
for (const trade of sortedTrades) {
  const pnlDollars = trade.pnl / 100;
  equity += pnlDollars;
  peak = Math.max(peak, equity);
  const drawdown = peak > 0 ? ((peak - equity) / peak) * 100 : 0;

  points.push({
    date: trade.exitDate,  // <-- KEY ISSUE: Only adds point when trade CLOSES
    equity,
    drawdown,
  });
}
```

**Issues Identified:**

1. **Trade-by-Trade, Not Bar-by-Bar**: Equity only updates when trades close
2. **No Daily Aggregation**: Multiple trades on same day = multiple equity points
3. **Time Gaps**: Days with no trades have no equity points
4. **Irregular Time Series**: Returns calculated between trade closes, not daily

### 2. Sharpe Ratio Calculation (`calculatePerformanceMetrics`, lines 524-546)

```typescript
// Calculate daily returns for Sharpe and Sortino
const dailyReturns: number[] = [];
for (let i = 1; i < equityCurve.length; i++) {
  const prevEquity = equityCurve[i - 1]!.equity;
  const currEquity = equityCurve[i]!.equity;
  const dailyReturn = (currEquity - prevEquity) / prevEquity;  // <-- NOT DAILY!
  dailyReturns.push(dailyReturn);
}

const sharpeRatio = stdDev > 0
  ? (avgDailyReturn / stdDev) * Math.sqrt(252)  // <-- ASSUMES 252 DAILY RETURNS
  : 0;
```

**Issues Identified:**

1. **Misnomer**: Variable called `dailyReturns` but they're actually trade-to-trade returns
2. **Wrong Annualization**: Uses sqrt(252) assuming daily returns, but data isn't daily
3. **Volatility Overstated**: Ignores flat days, making volatility appear higher
4. **Sharpe Understated**: Higher volatility = lower Sharpe ratio

### 3. Forward Fill Function (`forwardFillEquityCurve`, lines 144-183)

This function EXISTS but is applied AFTER metrics are calculated, not before:

```typescript
export function forwardFillEquityCurve(
  points: EquityPoint[],
  startDate: Date,
  endDate: Date
): EquityPoint[] {
  // Creates daily points by forward-filling
}
```

**The Problem**: Forward-fill is used for DISPLAY purposes only, not for Sharpe calculation.

### 4. Monthly Returns Calendar (`calculateMonthlyReturnsCalendar`, lines 1703-1773)

This function uses the raw equity curve (trade-by-trade), not forward-filled:

```typescript
for (const point of equityCurve) {
  const year = point.date.getFullYear();
  const month = point.date.getMonth() + 1;
  // Groups by month, but equity curve has irregular points
}
```

**Issue**: Monthly returns may be inaccurate if equity curve has gaps.

---

## Specific Problems Found

### Problem 1: Sharpe Ratio is Mathematically Incorrect

**Current Behavior:**
- 500 trades over 1 year
- 500 "daily returns" calculated
- Annualized with sqrt(252)

**Correct Behavior:**
- 252 trading days in a year
- 252 daily returns calculated (one per day)
- Annualized with sqrt(252)

**Impact**: Sharpe ratio is calculated on ~500 data points but annualized as if there were 252. This makes the ratio incomparable to industry benchmarks.

### Problem 2: Drawdown May Be Understated

**Current Behavior:**
- Drawdown calculated only at trade closes
- If account drops 20% intraday but recovers by close, drawdown = 0%

**Correct Behavior:**
- Drawdown should capture worst-case scenario
- For intraday strategies, this is less critical since positions close same day

### Problem 3: Multiple Trades Per Day Create Multiple Points

**Current Behavior:**
- Day 1: 3 trades close → 3 equity points for Day 1
- Day 2: 0 trades close → 0 equity points for Day 2
- Day 3: 1 trade closes → 1 equity point for Day 3

**Correct Behavior:**
- Day 1: Sum of 3 trades → 1 equity point
- Day 2: Forward-fill → 1 equity point (same as Day 1)
- Day 3: 1 trade → 1 equity point

### Problem 4: Return Calculation Doesn't Account for Time

**Example:**
- Trade 1 closes Monday with +2% return
- Trade 2 closes Thursday with -1% return

**Current**: Two returns (+2%, -1%), no consideration that 3 days passed

**Correct**: Four daily returns (+2%, 0%, 0%, -1%)

---

## Compounding Analysis

### Current Approach: Simple Addition

```typescript
equity += pnlDollars;  // Simple addition, not compounding
```

This is actually **correct** for fixed-size trading (same position size each trade).

### Industry Standard: Depends on Strategy Type

| Strategy Type | Capital Method | Our Implementation |
|--------------|----------------|-------------------|
| Fixed Size | Simple addition | ✅ Correct |
| Fixed Percentage | Compound | ❌ Not supported |
| Kelly Sizing | Compound | ❌ Not supported |

For your intraday strategies with fixed contract sizes, simple addition is appropriate.

---

## Time Handling Analysis

### Issue: No Timezone Awareness

Trades have `entryDate` and `exitDate` but no timezone handling. This could cause issues if:
- Data comes from different exchanges
- Server timezone differs from market timezone

### Issue: Weekend/Holiday Gaps

The forward-fill function fills ALL days, including weekends. This could:
- Create 365 points per year instead of 252
- Affect annualization calculations

---

## Edge Cases

### 1. Overlapping Trades
If two trades are open simultaneously (different strategies), each is tracked independently. This is correct.

### 2. Trades Spanning Multiple Days
For intraday strategies, this shouldn't happen. But if it does, the current implementation handles it correctly (P&L recorded at exit).

### 3. Negative Equity
No protection against equity going negative. If a catastrophic loss occurs, equity could go below zero.

### 4. Zero Starting Capital
Division by zero is not protected in some calculations.

---

## Summary of All Issues

| Issue | Severity | Impact | Fix Complexity |
|-------|----------|--------|----------------|
| Sharpe uses trade-to-trade returns | HIGH | Incorrect ratio | Medium |
| sqrt(252) with non-daily data | HIGH | Wrong annualization | Medium |
| No daily aggregation | HIGH | Irregular time series | Medium |
| Drawdown on closed trades only | MEDIUM | May understate risk | Low |
| No timezone handling | LOW | Potential data issues | Low |
| Weekend days in forward-fill | LOW | Minor annualization error | Low |

