# Performance Metrics Definitions

This document defines all performance metrics used in the Intraday Strategies Dashboard, including mathematical formulas, assumptions, and implementation details.

## Core Assumptions

- **Trading Days Per Year:** 252 (standard for equity markets)
- **Risk-Free Rate:** 0% (can be overridden in function calls)
- **Daily Returns:** Simple returns calculated as `r_t = E_t / E_{t-1} - 1`
- **Sample Standard Deviation:** Used for volatility calculations (n-1 denominator)

## Global Performance Metrics

### Total Return

**Formula:** `(E_N / E_0) - 1`

Where:
- `E_N` = Final equity
- `E_0` = Starting equity

**Units:** Decimal (e.g., 0.25 = 25%)

**Implementation:** `server/core/metrics.ts::totalReturn()`

---

### Annualized Return

**Formula:** `(1 + totalReturn)^(tradingDaysPerYear / N) - 1`

Where:
- `totalReturn` = Total return over the period
- `N` = Number of periods (days) in the equity curve
- `tradingDaysPerYear` = 252 (default)

**Units:** Decimal (e.g., 0.15 = 15% annualized)

**Implementation:** `server/core/metrics.ts::annualizedReturn()`

---

### Volatility (Daily)

**Formula:** Sample standard deviation of daily returns

```
σ_daily = sqrt(Σ(r_t - μ)² / (N - 1))
```

Where:
- `r_t` = Daily return at time t
- `μ` = Mean daily return
- `N` = Number of returns

**Units:** Decimal (e.g., 0.02 = 2% daily volatility)

**Implementation:** `server/core/metrics.ts::dailyMeanAndVol()`

---

### Volatility (Annualized)

**Formula:** `σ_annual = σ_daily × sqrt(tradingDaysPerYear)`

**Units:** Decimal (e.g., 0.25 = 25% annualized volatility)

**Implementation:** `server/core/metrics.ts::annualizedVol()`

---

### Sharpe Ratio

**Formula:** 

```
Sharpe = ((μ_daily - rf_daily) / σ_daily) × sqrt(tradingDaysPerYear)
```

Where:
- `μ_daily` = Mean daily return
- `rf_daily` = Daily risk-free rate (annualRiskFree / tradingDaysPerYear)
- `σ_daily` = Daily volatility (standard deviation)

**Units:** Dimensionless ratio (higher is better)

**Special Cases:**
- If `σ_daily = 0`, returns `0` (avoids division by zero)
- Typical values: -1 to 3 (>1 is good, >2 is excellent)

**Implementation:** `server/core/metrics.ts::sharpe()`

---

### Sortino Ratio

**Formula:**

```
Sortino = ((μ_daily - rf_daily) / σ_downside) × sqrt(tradingDaysPerYear)
```

Where:
- `σ_downside` = Downside deviation (standard deviation of negative returns only)

**Units:** Dimensionless ratio (higher is better)

**Special Cases:**
- If no negative returns exist, falls back to Sharpe ratio
- If `σ_downside = 0`, returns `0`

**Implementation:** `server/core/metrics.ts::sortino()`

**Difference from Sharpe:** Sortino only penalizes downside volatility, making it more favorable for strategies with asymmetric returns.

---

### Maximum Drawdown

**Formula:**

```
MaxDD = min(E_t / peak_t - 1)
```

Where:
- `peak_t` = Maximum equity achieved up to time t
- `E_t` = Equity at time t

**Units:** Decimal, always negative or zero (e.g., -0.25 = -25% drawdown)

**Implementation:** `server/core/metrics.ts::maxDrawdown()`

**Interpretation:** Largest peak-to-trough decline in equity. Lower (more negative) is worse.

---

### Calmar Ratio

**Formula:**

```
Calmar = annualizedReturn / |maxDrawdown|
```

**Units:** Dimensionless ratio (higher is better)

**Special Cases:**
- If `maxDrawdown = 0`, returns `0`

**Implementation:** `server/core/metrics.ts::calmar()`

**Interpretation:** Risk-adjusted return focusing on drawdown risk. Typical values: 0.5 to 3.0.

---

## Breakdown Metrics

### Day-of-Week Breakdown

**Purpose:** Analyze performance patterns by day of the week.

**Output Schema:**

```typescript
interface WeekdayBreakdown {
  weekday: number;        // 0 = Sunday, 6 = Saturday
  weekdayName: string;    // "Monday", "Tuesday", etc.
  avgReturnPct: number;   // Average return for this weekday (%)
  winRate: number;        // Percentage of positive returns (%)
  tradeCount: number;     // Number of trades on this weekday
  cumReturnPct: number;   // Cumulative geometric return (%)
}
```

**Formulas:**
- `avgReturnPct` = Mean of all returns for the weekday × 100
- `winRate` = (Count of positive returns / Total returns) × 100
- `cumReturnPct` = (∏(1 + r_t) - 1) × 100 (geometric compounding)

**Implementation:** `server/core/metrics.ts::breakdownByWeekday()`

---

### Monthly Breakdown

**Purpose:** Analyze performance by calendar month.

**Output Schema:**

```typescript
interface MonthBreakdown {
  yearMonth: string;          // "YYYY-MM" format
  monthReturnPct: number;     // Geometric monthly return (%)
  avgDailyReturnPct: number;  // Average daily return (%)
  winRate: number;            // Percentage of positive days (%)
  tradeCount: number;         // Number of trades in month
}
```

**Formulas:**
- `monthReturnPct` = (∏(1 + r_t) - 1) × 100 (geometric compounding of all daily returns in month)
- `avgDailyReturnPct` = Mean of daily returns × 100
- `winRate` = (Count of positive days / Total days) × 100

**Implementation:** `server/core/metrics.ts::breakdownByMonth()`

**Note:** Months are sorted in descending order (most recent first).

---

## Data Quality Guarantees

All metrics functions guarantee:

1. **No NaN values:** All functions return finite numbers or zero for edge cases
2. **No Infinity values:** Division by zero is handled gracefully
3. **Consistent units:** Percentages are always decimals in calculations, converted to % for display
4. **Type safety:** All functions are fully typed with TypeScript

## Testing

All metrics are backed by **golden unit tests** in `server/coreMetrics.test.ts`:

- **30 test cases** with hand-computed expected values
- **Test Case A:** Constant +1% returns (tests annualization, zero volatility)
- **Test Case B:** Volatile returns with drawdown (tests Sharpe, Sortino, Calmar)
- **Test Case C:** Mixed returns (tests mean, volatility, ratios)
- **Edge cases:** Empty data, single point, zero equity
- **Breakdown tests:** Weekday and monthly aggregations

All tests pass with tolerance of `1e-10` for floating-point comparisons.

## Module Location

**Canonical metrics module:** `server/core/metrics.ts`

All performance calculations should use functions from this module to ensure consistency and correctness.

## Migration Notes

Previous implementations in `server/analytics.ts` should be refactored to use the centralized metrics module. This ensures:

- Mathematical consistency across the application
- Easier testing and validation
- Single source of truth for formulas
- Better maintainability

## References

- **Sharpe Ratio:** William F. Sharpe (1966), "Mutual Fund Performance"
- **Sortino Ratio:** Frank A. Sortino (1994), "Downside Risk"
- **Calmar Ratio:** Terry W. Young (1991), "The Calmar Ratio: A Smoother Tool"
- **Trading Days:** Standard assumption for equity markets (252 days/year)
