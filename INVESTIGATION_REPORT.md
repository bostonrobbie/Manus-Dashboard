# Dashboard Investigation Report
**Date:** December 4, 2025  
**Investigator:** AI Assistant  
**Status:** In Progress

## Executive Summary

This report documents the investigation into critical data quality issues, max drawdown calculation anomalies, and missing features in the Intraday Trading Strategies Dashboard.

---

## Critical Issues Identified

### 1. **DUPLICATE TRADES IN DATABASE** ⚠️ CRITICAL

**Severity:** HIGH  
**Impact:** All metrics are incorrect (doubled)

**Evidence:**
- Recent Trades table shows every trade appearing TWICE
- Example from NQ ORB strategy detail page:
  ```
  9/29/2025 | 10/6/2025 | Long | $24952.50 | $25195.00 | $-158.00 | -0.03%
  9/29/2025 | 10/6/2025 | Long | $24952.50 | $25195.00 | $-158.00 | -0.03%  (DUPLICATE)
  ```

**Root Cause:** Likely the seed script is inserting trades twice, or there's a JOIN issue causing duplicates

**Action Required:**
1. Query database to confirm duplicate trade IDs
2. Identify if duplicates have same ID or different IDs
3. If same data but different IDs: delete duplicates
4. If seed script issue: fix script and re-seed
5. Re-calculate all metrics after deduplication

---

### 2. **STRATEGY ROUTING BUG** ⚠️ CRITICAL

**Severity:** HIGH  
**Impact:** Users cannot view correct strategy details

**Evidence:**
- Clicking "CL Trend Following" (should be strategy ID 5) redirects to wrong strategy
- URL shows `/strategy/12` but displays "NQ Opening Range Breakout"
- Strategy list page shows 8 strategies but IDs may not match correctly

**Root Cause:** Strategy ID mapping issue or routing problem

**Action Required:**
1. Verify strategy IDs in database match expected values
2. Check routing logic in StrategyDetail page
3. Verify strategy list card links use correct IDs

---

### 3. **MAX DRAWDOWN CALCULATION ANOMALY**

**Severity:** MEDIUM  
**Impact:** Confusing/incorrect risk metrics

**User Report:**
> "On the portfolio overview page, on the equity curve, if we're on the one year time frame it says the max drawdown is 50% but then if we go to any other time frame it gets lower and lower. How does that make sense that the max drawdown can decrease the longer time we go back?"

**Hypothesis:**
- Max drawdown is calculated ONLY within the selected time range
- 1Y period may have had a severe drawdown event
- Longer periods (3Y, 5Y, ALL) dilute this by including recovery periods
- This is actually CORRECT behavior if we're calculating "max drawdown within the selected period"
- However, it may be confusing to users

**Possible Explanations:**
1. **Correct Calculation:** Max DD is period-specific (peak-to-trough within that range)
2. **Data Issue:** Duplicate trades causing inflated losses in recent period
3. **Calculation Bug:** Forward-fill or equity curve logic error

**Action Required:**
1. Verify max drawdown calculation logic in analytics.ts
2. Check if duplicates are causing inflated drawdowns
3. Test with deduplicated data
4. Consider adding "All-Time Max Drawdown" as separate metric

---

### 4. **MISSING/INCOMPLETE TRADE DATA**

**User Report:**
> "On the strategies page and on the compare page, some of the strategies don't have any trades on their database. Like the CL trend following, it only goes until 2017 it looks like and then there's no trades since then."

**CSV File Analysis:**
- CLTrend.csv exists with 4,742 rows
- Date range: 2010-10-20 to 2025-10-09
- CSV has complete data through October 2025

**Database Status:** UNKNOWN (need to query)

**Possible Causes:**
1. Seed script didn't run completely
2. Seed script has date parsing errors
3. Database constraint violations
4. Trades were inserted but not linked to correct strategy ID

**Action Required:**
1. Query database for actual trade counts per strategy
2. Compare with CSV file counts
3. Check seed script logs for errors
4. Re-run seed script if necessary

**Expected Counts (from CSV):**
- ESTrend: 878 trades
- CLTrend: 2,370 trades  
- BTCTrend: 806 trades
- GCTrend: 692 trades
- NQTrend: 1,334 trades
- ESORB: 825 trades
- NQORB: 1,448 trades
- YMORB: 995 trades
- **TOTAL: 9,348 trades**

---

### 5. **PERFORMANCE BREAKDOWN MISUNDERSTANDING**

**User Expectation:**
> "When I said I wanted like by day like that type stuff of a performance breakdown I meant like like which days are the highest performing which ones are the lowest performing things like that."

**Current Implementation:**
- Shows ALL periods (daily/weekly/monthly/quarterly/yearly)
- Lists them chronologically
- Does NOT highlight best/worst performers

**User Wants:**
- Top 10 Best Days
- Top 10 Worst Days  
- Best/Worst Weeks
- Best/Worst Months
- Performance patterns (e.g., "Mondays vs Fridays")

**Action Required:**
1. Add "Top Performers" and "Worst Performers" sections
2. Sort by return % to show extremes
3. Add day-of-week analysis
4. Add month-of-year analysis
5. Consider adding regime analysis (bull/bear/sideways)

---

### 6. **MISSING ADVANCED METRICS**

**User Request:**
> "We can certainly put more like the rolling drawdown, or rolling sharp, like a ton of different metrics like that that show us what our sort of breakdown performances, just insights that we wouldn't get otherwise."

**Requested Features:**
- Rolling Sharpe Ratio chart
- Rolling Sortino Ratio chart
- Rolling Drawdown visualization (underwater equity curve)
- Rolling correlation with S&P 500
- Win rate by time period chart
- Profit factor by time period chart
- Monthly returns heatmap (calendar view)
- Side-by-side comparison with S&P 500

**Action Required:**
1. Implement rolling window calculations (30-day, 90-day, 1-year windows)
2. Create visualization components for each metric
3. Add to Overview page below existing content

---

### 7. **MICRO VS MINI CONTRACT CONFUSION** ⚠️ CRITICAL

**User Requirement:**
> "We need to have maybe a toggle or something for all our stats to switch from micro to minis, because there's a big difference between the two of those, so we need to check that. Make sure that we're doing the correct calculations and conversions."

**Current Status:** NO CONTRACT SIZE HANDLING

**Impact:** All P&L calculations may be incorrect

**Contract Specifications (Need to Research):**
- **ES (S&P 500):** 
  - E-mini: $50 per point
  - Micro: $5 per point (1/10th)
- **NQ (NASDAQ-100):**
  - E-mini: $20 per point
  - Micro: $2 per point (1/10th)
- **CL (Crude Oil):**
  - Standard: $1,000 per point
  - Micro: $100 per point (1/10th)
- **BTC (Bitcoin):**
  - Standard: 5 BTC
  - Micro: 0.1 BTC (1/50th)
- **GC (Gold):**
  - Standard: 100 oz
  - Micro: 10 oz (1/10th)
- **YM (Dow Jones):**
  - E-mini: $5 per point
  - Micro: $0.50 per point (1/10th)

**Action Required:**
1. Research official CME contract specifications
2. Determine which contract size the CSV data represents
3. Add contract size field to strategies table
4. Implement toggle UI (Micro/Mini switch)
5. Add conversion logic to all P&L calculations
6. Update equity curves with correct scaling
7. Verify math against industry standards

---

## Investigation Plan

### Phase 1: Data Audit ✅ IN PROGRESS
- [x] Check CSV files for completeness
- [ ] Query database for actual trade counts
- [ ] Identify duplicate trades
- [ ] Verify strategy ID mappings

### Phase 2: Fix Critical Bugs
- [ ] Deduplicate trades in database
- [ ] Fix strategy routing issue
- [ ] Re-seed database if necessary
- [ ] Verify all strategies have complete data

### Phase 3: Max Drawdown Analysis
- [ ] Review calculation logic
- [ ] Test with deduplicated data
- [ ] Add unit tests for edge cases
- [ ] Document expected behavior

### Phase 4: Enhanced Performance Breakdown
- [ ] Implement Top/Worst performers analysis
- [ ] Add day-of-week/month-of-year analysis
- [ ] Create new UI components

### Phase 5: Advanced Metrics
- [ ] Implement rolling window calculations
- [ ] Create rolling Sharpe/Sortino charts
- [ ] Add underwater equity curve
- [ ] Build monthly returns heatmap

### Phase 6: Contract Size Implementation
- [ ] Research CME specifications
- [ ] Add contract size to database schema
- [ ] Implement toggle UI
- [ ] Add conversion logic
- [ ] Write comprehensive tests

### Phase 7: Testing & Validation
- [ ] Write tests for all new features
- [ ] Validate calculations against known benchmarks
- [ ] User acceptance testing

---

## Next Steps

1. **IMMEDIATE:** Query database to confirm duplicate trades
2. **IMMEDIATE:** Fix strategy routing bug
3. **HIGH PRIORITY:** Deduplicate trades and re-calculate metrics
4. **HIGH PRIORITY:** Research contract specifications
5. **MEDIUM PRIORITY:** Implement enhanced performance breakdown
6. **MEDIUM PRIORITY:** Add advanced rolling metrics
7. **LOW PRIORITY:** Polish UI and add documentation

---

## Questions for User

1. Which contract size does the CSV data represent (Micro or Mini/Standard)?
2. Should we show both contract sizes or just allow toggling?
3. Do you want all-time max drawdown as a separate metric?
4. Any specific rolling window periods preferred (30-day, 90-day, 1-year)?
5. Priority order for new features?

---

**Report Status:** DRAFT - Awaiting database query results
