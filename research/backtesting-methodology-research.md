# Backtesting Methodology Research

## Source 1: Build Alpha - Equity Curve Trading
URL: https://www.buildalpha.com/equity-curve-trading/

### How to Calculate an Equity Curve (Industry Standard)
- Simply add each successive trade to the rolling sum
- Example: Trades +450, +200, -250, -200, +500
- Equity curve values: +450, +650, +400, +200, +700

### Key Definition
- An equity curve is a plot showing the growth of capital over time
- Shows cumulative profit of a trading strategy over time

### Important Notes
- This is a **trade-by-trade** approach (not mark-to-market)
- Each point on the curve represents the account value AFTER a trade closes
- No intraday fluctuations are captured

---

## Questions to Research Further:
1. Trade-by-trade vs Mark-to-market equity curves
2. How to handle open positions in equity curve
3. Drawdown calculation methodology (peak-to-trough)
4. Sharpe ratio calculation (daily returns vs trade returns)
5. Annualization conventions (252 trading days vs 365 days)


---

## Source 2: Investopedia - Maximum Drawdown (MDD)
URL: https://www.investopedia.com/terms/m/maximum-drawdown-mdd.asp

### Industry Standard Formula
```
MDD = (Trough Value - Peak Value) / Peak Value
```

### Key Points
1. MDD represents the largest observed decline from peak to subsequent lowest point, BEFORE a new peak is attained
2. The formula compares peak value to trough value, expressed as percentage loss from peak
3. MDD only measures largest loss SIZE, not frequency of losses
4. MDD doesn't show recovery time

### Critical Calculation Rules (from example)
- Use the HIGHEST peak before the drawdown began (not interim peaks)
- Use the LOWEST trough before a NEW peak is achieved
- Example: $750K peak → $400K drop → $600K recovery → $350K drop → $800K new peak
  - MDD = ($350K - $750K) / $750K = -53.33%
  - The $600K interim peak is NOT used (not a new high)
  - The $400K first drop is NOT used (the $350K is lower)

---


## Source 3: QuantStart - Sharpe Ratio for Algorithmic Trading
URL: https://www.quantstart.com/articles/Sharpe-Ratio-for-Algorithmic-Trading-Performance-Measurement/

### Industry Standard Formula
```
S = E(Ra - Rb) / sqrt(Var(Ra - Rb))

Annualized Sharpe = sqrt(N) * E(Ra - Rb) / sqrt(Var(Ra - Rb))
```

Where:
- Ra = period return of asset/strategy
- Rb = period return of benchmark (often risk-free rate)
- N = number of trading periods in a year

### Critical Annualization Rules
| Period Type | N Value | Notes |
|-------------|---------|-------|
| Daily | 252 | Trading days, NOT 365 calendar days |
| Hourly | 1638 | 252 × 6.5 hours per trading day |
| Crypto (24hr) | 6048 | 252 × 24 for 24-hour markets |

### Key Points
1. Returns MUST match the period type (daily returns for daily Sharpe)
2. Transaction costs MUST be included in returns before calculating Sharpe
3. For market-neutral strategies, use 0 as benchmark (not risk-free rate)
4. Sharpe < 1 after costs = ignore the strategy
5. Sharpe > 2 = very good for retail traders

### Python Implementation (from QuantStart)
```python
def annualised_sharpe(returns, N=252):
    return np.sqrt(N) * returns.mean() / returns.std()
```

---


## Source 4: Trading Blox Forum - Closed-trade vs Open-trade Drawdown
URL: https://www.tradingblox.com/tbforum/viewtopic.php?t=614

### Two Types of Equity Curves / Drawdowns

**1. Closed-Trade Equity/Drawdown**
- Only updates when a trade is CLOSED
- Can distort reality - if you close one losing trade while other positions are profitable, closed-trade DD drops even though overall equity may have risen
- Simpler to calculate but less accurate for multi-position systems

**2. Open-Trade (Mark-to-Market) Equity/Drawdown**
- Calculated daily based on the close of ALL positions (open and closed)
- More accurate representation of actual account value
- Industry standard for managed accounts (Managed Accounts Review, IASG use this)
- Preferred for systems trading multiple markets

### Key Insight from Forum
> "For systems trading multiple markets I prefer open-trade DD calculated every day on the close. I found that closed-trade DD often distorts the reality."

### Professional Practice (Forum Mgmnt)
Two drawdowns tracked:
1. **Open Equity Drawdown** - Calculated daily on basis of close of all positions
2. **Closed Trade Drawdown (modified)** - Uses greater of actual closed trade equity OR closed trade equity plus locked-in profits

---


---

# PART 2: CURRENT IMPLEMENTATION AUDIT

## Current Implementation Analysis

### File: server/analytics.ts

#### Equity Curve Calculation (lines 89-125)
```typescript
export function calculateEquityCurve(
  trades: Trade[],
  startingCapital: number = 100000
): EquityPoint[] {
  const sortedTrades = [...trades].sort((a, b) => 
    a.exitDate.getTime() - b.exitDate.getTime()
  );

  const points: EquityPoint[] = [];
  let equity = startingCapital;
  let peak = startingCapital;

  // Add starting point
  if (sortedTrades.length > 0) {
    points.push({
      date: sortedTrades[0]!.entryDate,
      equity: startingCapital,
      drawdown: 0,
    });
  }

  for (const trade of sortedTrades) {
    const pnlDollars = trade.pnl / 100;
    equity += pnlDollars;
    peak = Math.max(peak, equity);
    const drawdown = peak > 0 ? ((peak - equity) / peak) * 100 : 0;

    points.push({
      date: trade.exitDate,
      equity,
      drawdown,
    });
  }

  return points;
}
```

**Current Method: CLOSED-TRADE EQUITY CURVE**
- Only updates equity when a trade CLOSES (exitDate)
- Does NOT mark-to-market open positions
- Drawdown calculated at each trade close, not daily

#### Sharpe Ratio Calculation (lines 524-546)
```typescript
// Calculate daily returns for Sharpe and Sortino
const dailyReturns: number[] = [];
for (let i = 1; i < equityCurve.length; i++) {
  const prevEquity = equityCurve[i - 1]!.equity;
  const currEquity = equityCurve[i]!.equity;
  const dailyReturn = (currEquity - prevEquity) / prevEquity;
  dailyReturns.push(dailyReturn);
}

const sharpeRatio = stdDev > 0
  ? (avgDailyReturn / stdDev) * Math.sqrt(252) // Annualized
  : 0;
```

**Current Method Issues:**
1. Returns are calculated between TRADE CLOSES, not daily
2. Using sqrt(252) assumes daily returns, but these are trade-to-trade returns
3. If trades close on same day, multiple "returns" counted
4. If no trades for 5 days, that period is invisible

### File: server/core/metrics.ts

This file has cleaner implementations but still relies on equity curve input:

```typescript
export function sharpe(
  returns: number[],
  riskFreeAnnual: number = 0,
  tradingDaysPerYear: number = 252
): number {
  if (returns.length < 2) return 0;
  
  const { mean, vol } = dailyMeanAndVol(returns);
  
  if (vol === 0) return 0;
  
  const dailyRiskFree = riskFreeAnnual / tradingDaysPerYear;
  const excessReturn = mean - dailyRiskFree;
  
  return (excessReturn / vol) * Math.sqrt(tradingDaysPerYear);
}
```

**Note:** The formula is correct IF the input returns are actually daily returns. The problem is upstream - the equity curve isn't daily.

---

## Summary of Current Implementation Issues

| Metric | Current Method | Issue |
|--------|---------------|-------|
| **Equity Curve** | Closed-trade only | Doesn't show intraday P&L or mark-to-market |
| **Drawdown** | Peak-to-trough on closed trades | May understate actual drawdown experienced during open positions |
| **Sharpe Ratio** | Trade-to-trade returns × sqrt(252) | Returns aren't daily; annualization factor is wrong |
| **Daily Returns** | Calculated from trade closes | Not actual daily returns; irregular time intervals |
| **Max Drawdown** | From closed-trade equity | Misses intraday drawdowns |

---

