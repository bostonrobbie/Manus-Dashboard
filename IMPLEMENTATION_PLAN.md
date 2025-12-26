# Comprehensive Dashboard Enhancement - Implementation Plan

**Start Date:** December 4, 2025  
**Data Format:** Mini/Standard contracts (TradingView/Tradeovate)  
**Execution:** One-shot implementation

---

## 🎯 IMPLEMENTATION PHASES

### PHASE 1: Critical Bug Fixes
**Priority:** CRITICAL  
**Estimated Time:** 15 minutes

1. **Fix Strategy Routing Bug**
   - Investigate why strategy cards link to wrong IDs
   - Fix link generation in Strategies.tsx
   - Test all 8 strategy links

2. **Verify Duplicate Trades Fix**
   - Confirm 9,335 trades in database
   - Run duplicate check script
   - Verify all strategies have correct counts

---

### PHASE 2: Contract Size System
**Priority:** CRITICAL  
**Estimated Time:** 45 minutes

**2.1 Database Schema Updates**
- Add `contractSize` enum field to strategies table ('mini' | 'micro')
- Add `contractMultiplier` field for conversion calculations
- Migrate existing strategies to 'mini' (default)
- Define multipliers for each instrument:
  - ES: mini=$50/pt, micro=$5/pt (10x)
  - NQ: mini=$20/pt, micro=$2/pt (10x)
  - CL: mini=$1000/pt, micro=$100/pt (10x)
  - BTC: mini=5 BTC, micro=0.1 BTC (50x)
  - GC: mini=100oz, micro=10oz (10x)
  - YM: mini=$5/pt, micro=$0.50/pt (10x)

**2.2 Backend Logic**
- Create contract conversion utilities in `server/lib/contracts.ts`
- Add conversion functions to analytics calculations
- Update all P&L calculations to support both sizes
- Add contract size parameter to tRPC procedures

**2.3 Frontend UI**
- Create ContractSizeToggle component
- Add toggle to Overview page header
- Add toggle to Strategy Detail pages
- Store preference in React state (global context)
- Update all P&L displays with conversion
- Add indicator showing current contract size

---

### PHASE 3: Enhanced Performance Breakdown
**Priority:** HIGH  
**Estimated Time:** 60 minutes

**3.1 Backend Analytics**
- `getTopPerformers(timeframe, limit)` - Best N periods by return %
- `getWorstPerformers(timeframe, limit)` - Worst N periods by return %
- `getDayOfWeekAnalysis()` - Performance by Mon-Fri
- `getMonthOfYearAnalysis()` - Seasonality by Jan-Dec
- `getTimeOfDayAnalysis()` - Entry/exit time patterns

**3.2 Frontend Components**
- Redesign PerformanceBreakdown with tabs:
  - "Timeline" - Current chronological view
  - "Top Performers" - Best 10 days/weeks/months
  - "Worst Performers" - Worst 10 periods
  - "Patterns" - Day-of-week, month-of-year heatmaps
- Add sorting and filtering options
- Color-code performance tiers

---

### PHASE 4: Rolling Metrics
**Priority:** HIGH  
**Estimated Time:** 90 minutes

**4.1 Rolling Calculations**
- `calculateRollingSharpe(windowDays)` - 30/90/365-day windows
- `calculateRollingSortino(windowDays)`
- `calculateRollingDrawdown(windowDays)`
- `calculateRollingCorrelation(benchmark, windowDays)`
- `calculateRollingWinRate(windowDays)`
- `calculateRollingProfitFactor(windowDays)`

**4.2 Visualization Components**
- RollingMetricsChart component (multi-line time series)
- Window size selector (30/90/180/365 days)
- Metric selector (Sharpe/Sortino/Win Rate/PF)
- Add to Overview page in new "Rolling Analytics" section

---

### PHASE 5: Advanced Visualizations
**Priority:** MEDIUM  
**Estimated Time:** 90 minutes

**5.1 Underwater Equity Curve**
- Calculate drawdown from peak at each point
- Visualize as area chart below zero line
- Highlight recovery periods
- Show max drawdown duration
- Component: UnderwaterChart.tsx

**5.2 Monthly Returns Heatmap**
- Calendar-style heatmap (rows=years, cols=months)
- Color scale: red (losses) to green (gains)
- Tooltip showing exact return %
- Component: ReturnsHeatmap.tsx

**5.3 S&P 500 Comparison**
- Side-by-side equity curves
- Relative performance chart
- Correlation coefficient display
- Beta calculation
- Component: BenchmarkComparison.tsx

**5.4 Additional Charts**
- Win rate by time period (bar chart)
- Profit factor by time period (line chart)
- Trade distribution histogram (P&L buckets)
- Holding period analysis

---

### PHASE 6: UI/UX Enhancements
**Priority:** MEDIUM  
**Estimated Time:** 30 minutes

**6.1 Overview Page Restructure**
- Section 1: Key Metrics (existing)
- Section 2: Equity Curve (existing)
- Section 3: Contract Size Toggle (new)
- Section 4: Performance Breakdown (enhanced)
- Section 5: Rolling Analytics (new)
- Section 6: Advanced Visualizations (new)
- Section 7: Trade Statistics (existing)

**6.2 Strategy Detail Page Enhancements**
- Add contract size toggle
- Add performance breakdown
- Add underwater curve
- Keep recent trades table

**6.3 Compare Page Fixes**
- Fix empty comparison issue
- Ensure all strategies can be compared
- Add contract size consistency check

---

### PHASE 7: Testing & Validation
**Priority:** CRITICAL  
**Estimated Time:** 60 minutes

**7.1 Unit Tests**
- Contract conversion accuracy tests
- Rolling metric calculation tests
- Performance breakdown sorting tests
- Day-of-week analysis tests
- Heatmap data generation tests

**7.2 Integration Tests**
- Full equity curve with contract conversion
- Multi-strategy comparison
- Time range filtering with rolling metrics
- Performance breakdown with all timeframes

**7.3 Manual Testing**
- Test all 8 strategies individually
- Test contract size toggle on all pages
- Verify calculations match expectations
- Cross-check with TradingView data

---

## 📊 CONTRACT SIZE SPECIFICATIONS

### Instrument Multipliers (Mini → Micro)

| Instrument | Mini Value | Micro Value | Ratio | Notes |
|------------|-----------|-------------|-------|-------|
| ES (S&P 500) | $50/point | $5/point | 10:1 | E-mini vs Micro E-mini |
| NQ (NASDAQ) | $20/point | $2/point | 10:1 | E-mini vs Micro E-mini |
| CL (Crude Oil) | $1,000/barrel | $100/barrel | 10:1 | Standard vs Micro |
| BTC (Bitcoin) | 5 BTC | 0.1 BTC | 50:1 | CME Bitcoin vs Micro |
| GC (Gold) | 100 oz | 10 oz | 10:1 | Standard vs Micro |
| YM (Dow Jones) | $5/point | $0.50/point | 10:1 | E-mini vs Micro E-mini |

### Conversion Formula
```typescript
microPnL = miniPnL / ratio
miniPnL = microPnL * ratio
```

---

## 🗂️ FILE STRUCTURE

### New Files to Create
```
server/lib/contracts.ts          - Contract conversion utilities
server/lib/rolling-metrics.ts    - Rolling window calculations
client/src/components/ContractSizeToggle.tsx
client/src/components/UnderwaterChart.tsx
client/src/components/ReturnsHeatmap.tsx
client/src/components/BenchmarkComparison.tsx
client/src/components/RollingMetricsChart.tsx
client/src/contexts/ContractSizeContext.tsx
server/rolling-metrics.test.ts   - Rolling metrics tests
server/contracts.test.ts         - Contract conversion tests
```

### Files to Modify
```
drizzle/schema.ts                - Add contractSize fields
server/db.ts                     - Add contract-aware queries
server/routers.ts                - Add new procedures
server/analytics.ts              - Enhance with rolling metrics
client/src/pages/Overview.tsx    - Add new sections
client/src/pages/StrategyDetail.tsx - Add enhancements
client/src/pages/Compare.tsx     - Fix bugs
client/src/components/PerformanceBreakdown.tsx - Redesign
```

---

## ✅ SUCCESS CRITERIA

1. ✅ All 8 strategies load correctly with proper routing
2. ✅ Contract size toggle works on all pages
3. ✅ P&L values convert accurately between mini/micro
4. ✅ Performance breakdown shows top/worst performers
5. ✅ Day-of-week and month-of-year analysis working
6. ✅ Rolling Sharpe/Sortino charts display correctly
7. ✅ Underwater equity curve shows drawdown periods
8. ✅ Monthly returns heatmap renders properly
9. ✅ S&P 500 comparison displays side-by-side
10. ✅ All tests passing (unit + integration)
11. ✅ No console errors or warnings
12. ✅ Responsive design maintained

---

## 🚀 EXECUTION ORDER

1. Fix strategy routing bug (5 min)
2. Add contract size to schema + migrate (10 min)
3. Implement contract conversion logic (15 min)
4. Add contract size toggle UI (15 min)
5. Test contract conversions (10 min)
6. Enhance performance breakdown backend (30 min)
7. Redesign performance breakdown UI (30 min)
8. Implement rolling metrics calculations (45 min)
9. Build rolling metrics charts (30 min)
10. Create underwater equity curve (30 min)
11. Build monthly returns heatmap (30 min)
12. Add S&P 500 comparison (30 min)
13. Write comprehensive tests (45 min)
14. Final integration testing (30 min)
15. Create checkpoint and deliver (10 min)

**Total Estimated Time:** 6-7 hours

---

**Status:** READY TO EXECUTE
