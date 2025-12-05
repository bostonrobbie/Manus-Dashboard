# Intraday Trading Dashboard - TODO

## Current Sprint: Dashboard Enhancement & Analysis

### Phase 1: Comprehensive Dashboard Analysis
- [x] Audit all existing pages for bugs and UX issues
- [x] Review backend API performance and optimization opportunities
- [x] Check mobile responsiveness across all pages
- [x] Identify missing features and improvement opportunities
- [x] Document findings and prioritize fixes

### Phase 2: Performance Breakdown Tables
- [x] Design backend analytics for time period breakdowns (daily/weekly/monthly/quarterly/yearly)
- [x] Implement backend API endpoint for performance breakdown data
- [x] Create PerformanceBreakdown component with table UI
- [x] Add breakdown tables to Overview page
- [ ] Add breakdown tables to Strategy Detail page
- [x] Write unit tests for breakdown calculations
- [ ] Write integration tests for breakdown API

### Phase 3: Drawdown Visualization
- [ ] Implement drawdown calculation function in analytics engine
- [ ] Create DrawdownChart component using Recharts
- [ ] Add drawdown chart to Overview page (below equity curve)
- [ ] Add drawdown chart to Strategy Detail page
- [ ] Add drawdown metrics (max drawdown duration, recovery time)
- [ ] Write tests for drawdown calculations
- [ ] Verify drawdown visualization accuracy

### Phase 4: Trade Filtering & Export
- [ ] Design trade filtering UI (date range, direction, P&L range, strategy)
- [ ] Implement backend API for filtered trade queries
- [ ] Create TradeFilters component with form controls
- [ ] Implement CSV export functionality (client-side)
- [ ] Add filtering to Overview page trades table
- [ ] Add filtering to Strategy Detail page trades table
- [ ] Add filtering to Compare page
- [ ] Write tests for trade filtering logic
- [ ] Test CSV export with various filter combinations

### Phase 5: Identified Issues & Improvements
- [ ] (To be populated after analysis)

---

## Completed Features

### Phase 1: Database & Data Migration
- [x] Design database schema (strategies, trades, benchmarks tables)
- [x] Copy normalized seed data from GitHub repo
- [x] Create TypeScript seed scripts for database population
- [x] Run migrations and seed database

### Phase 2: Backend Analytics & API
- [x] Implement portfolio analytics engine (metrics calculations)
- [x] Create tRPC endpoint: portfolio.overview
- [x] Create tRPC endpoint: portfolio.strategyDetail
- [x] Create tRPC endpoint: portfolio.compareStrategies
- [x] Implement time-range filtering logic
- [x] Implement forward-fill for equity curves

### Phase 3: TradingView Webhook
- [x] Create webhook endpoint for trade signals
- [x] Implement authentication/security for webhook
- [x] Add trade validation and database insertion logic
- [x] Add error handling and logging

### Phase 4: Portfolio Overview Page
- [x] Create page layout with DashboardLayout
- [x] Implement combined equity curve chart (portfolio vs S&P 500)
- [x] Add time-range filter controls
- [x] Add starting capital input field
- [x] Display KPI cards (total return, Sharpe, Sortino, max drawdown, win rate)
- [x] Ensure all metrics are annualized and in percentages

### Phase 5: Individual Strategy Pages
- [x] Create strategy list page
- [x] Create strategy detail page component
- [x] Display equity curve for single strategy
- [x] Show full performance metrics dashboard
- [x] Add recent trades table
- [x] Implement time-range filtering

### Phase 6: Strategy Comparison Page
- [x] Create comparison page layout
- [x] Implement multi-select for 2-4 strategies
- [x] Display individual equity curves (forward-filled, different colors)
- [x] Calculate and display combined equity curve
- [x] Create correlation matrix heatmap
- [x] Build comparison metrics table
- [x] Ensure continuous lines without gaps

### Phase 7: Testing & QA
- [x] Write unit tests for analytics calculations
- [x] Write integration tests for tRPC endpoints
- [x] Test authentication flow (Google OAuth)
- [x] Test all time-range filters
- [x] Verify equity curves display correctly

### Bug Fixes (Resolved)
- [x] Fixed equity curve not rendering on Overview page
- [x] Fixed benchmark data seed script (onDuplicateKeyUpdate bug causing duplicate values)
- [x] Fixed chart stroke colors (hsl() wrapper incompatible with OKLCH CSS variables)
- [x] Added forward-fill logic to portfolio.overview endpoint
- [x] Added forward-fill logic to portfolio.strategyDetail endpoint

---

## Future Enhancements (Backlog)
- [ ] Add regime analysis (bull/bear/sideways market conditions)
- [ ] Mobile UI optimization
- [ ] Real-time TradingView webhook testing
- [ ] Admin panel for strategy management
- [ ] User role-based access control testing
- [ ] Performance optimization for large datasets
- [ ] Add more benchmark options (NASDAQ, Russell 2000, etc.)


## Critical Issues & Enhancements (User Reported)

### Data Quality & Verification
- [x] Investigate max drawdown calculation logic (CORRECT - not a bug)
- [x] Audit trade data completeness for all 8 strategies
- [x] Fix duplicate trades in database (11,000 → 9,335 clean trades)
- [x] Verify CL Trend Following strategy has trades after 2017 (2,357 trades total)
- [x] Check all strategies have complete trade history (all verified)
- [x] Verify all trades are plotted on correct datetime (validated)
- [x] Fix strategy routing bug on Strategies page
- [ ] Fix strategies with missing trades on Compare page

### Performance Breakdown Enhancements
- [ ] Redesign performance breakdown to show best/worst performing periods
- [ ] Add "Top 10 Best Days" analysis
- [ ] Add "Top 10 Worst Days" analysis
- [ ] Add "Best/Worst Weeks" analysis
- [ ] Add "Best/Worst Months" analysis
- [ ] Add rolling drawdown visualization
- [ ] Add rolling Sharpe ratio chart
- [ ] Add rolling Sortino ratio chart
- [ ] Add rolling correlation with S&P 500
- [ ] Add win rate by time period chart
- [ ] Add profit factor by time period chart
- [ ] Add monthly returns heatmap (calendar view)
- [ ] Add underwater equity curve (drawdown visualization)
- [ ] Compare portfolio metrics vs S&P 500 side-by-side

### Micro vs Mini Contract Toggle (CRITICAL - Data is in Mini format)
- [x] Research standard micro/mini contract specifications for each instrument
- [x] Research accurate conversion ratios (ES, NQ, CL, BTC, GC, YM)
- [x] Add contractSize enum field to strategies schema
- [x] Add contractMultiplier field for calculations
- [x] Run database migration
- [x] Create contract conversion utilities (server/lib/contracts.ts)
- [x] Design toggle UI component (micro/mini switch)
- [x] Create ContractSizeContext for global state
- [x] Add contract size toggle to Overview page
- [ ] Implement backend conversion logic in analytics (integrate with tRPC)
- [ ] Update all P&L calculations to respect contract size
- [ ] Update equity curves with correct scaling
- [ ] Update all metrics displays (Total Return, Sharpe, etc.)
- [ ] Write tests for conversion accuracy
- [ ] Verify math against industry standards

### Backend Quality & Testing
- [ ] Add comprehensive data validation tests
- [ ] Add tests for edge cases (missing data, incomplete strategies)
- [ ] Improve error handling for strategies with no trades
- [ ] Add data quality checks in seed scripts
- [ ] Implement database constraints for data integrity


## Current Sprint: P&L Verification & Contract Integration

### P&L Calculation Verification
- [x] Verify CSV data format and P&L values
- [x] Trace P&L calculation from seed script to database
- [x] Verify analytics calculations use correct P&L values
- [x] Cross-check sample calculations manually
- [x] Document P&L calculation methodology (TradingView Mini → CSV $ → DB ¢ → Analytics $)
- [x] Verify contract multipliers are correct for each instrument

### Contract Conversion Integration (PRIORITY)
- [x] Add contractSize parameter to portfolio.overview procedure
- [ ] Add contractSize parameter to portfolio.strategyDetail procedure
- [ ] Add contractSize parameter to portfolio.compareStrategies procedure
- [x] Add contractSize parameter to portfolio.performanceBreakdown procedure
- [x] Update calculateEquityCurve to support contract conversion
- [x] Update calculatePerformanceMetrics to support contract conversion
- [x] Update calculatePerformanceBreakdown to support contract conversion
- [x] Update all frontend components to pass contractSize from context
- [x] Test Mini vs Micro toggle updates all values correctly
- [x] Verify equity curves scale correctly with contract size
- [x] Verify all metrics (Sharpe, Sortino, etc.) calculate correctly
- [x] Verify Performance Breakdown table updates with contract size

### Enhanced Performance Breakdown UI
- [ ] Add tRPC procedure for top performers
- [ ] Add tRPC procedure for worst performers
- [ ] Add tRPC procedure for day-of-week analysis
- [ ] Add tRPC procedure for month-of-year analysis
- [ ] Redesign PerformanceBreakdown component with new tabs
- [ ] Add "Top Performers" tab with best 10 periods
- [ ] Add "Worst Performers" tab with worst 10 periods
- [ ] Add "Patterns" tab with day/month heatmaps
- [ ] Test all tabs display correct data

### Rolling Metrics Implementation
- [ ] Create rolling-metrics.ts utility file
- [ ] Implement rolling Sharpe calculation
- [ ] Implement rolling Sortino calculation
- [ ] Implement rolling drawdown calculation
- [ ] Add tRPC procedure for rolling metrics
- [ ] Create RollingMetricsChart component
- [ ] Add rolling metrics section to Overview page
- [ ] Test rolling calculations accuracy


## Metrics Math Audit & Hardening ✅ COMPLETE

### Step 0: Inspect Current Implementation
- [x] Read server/analytics.ts to identify all metrics calculations
- [x] Identify where Sharpe, Sortino, Calmar, drawdown are calculated
- [x] Review existing tests in server/*.test.ts
- [x] Document current metrics locations and formulas

### Step 1: Centralize Formulas in Metrics Module
- [x] Create server/core/metrics.ts module
- [x] Implement equityToDailyReturns function
- [x] Implement totalReturn function
- [x] Implement annualizedReturn function (252 trading days/year)
- [x] Implement dailyMeanAndVol function
- [x] Implement annualizedVol function
- [x] Implement sharpe function (risk-free = 0)
- [x] Implement sortino function (downside deviation only)
- [x] Implement maxDrawdown function
- [x] Implement calmar function (annualizedReturn / |maxDD|)
- [x] Implement breakdownByWeekday helper
- [x] Implement breakdownByMonth helper (geometric compounding)

### Step 2: Wire Breakdown Helpers
- [ ] Refactor portfolio overview to use new metrics helpers (DEFERRED - existing implementation works)
- [ ] Add breakdownByWeekday to portfolio overview response (FUTURE ENHANCEMENT)
- [ ] Add breakdownByMonth to portfolio overview response (FUTURE ENHANCEMENT)
- [x] Ensure API compatibility with frontend

### Step 3: Golden Unit Tests for Core Metrics
- [x] Create server/coreMetrics.test.ts (30 tests)
- [x] Test Case A: Constant +1% daily returns (3 days)
- [x] Test Case B: Volatile returns with drawdown
- [x] Test totalReturn calculation
- [x] Test annualizedReturn calculation
- [x] Test Sharpe ratio calculation
- [x] Test Sortino ratio calculation
- [x] Test maxDrawdown calculation
- [x] Test Calmar ratio calculation
- [x] Assert no NaN/Infinity values

### Step 4: Golden Tests for Breakdowns
- [x] Create synthetic equity curve fixture
- [x] Pre-compute expected weekday averages by hand
- [x] Pre-compute expected monthly returns by hand
- [x] Test breakdownByWeekday accuracy
- [x] Test breakdownByMonth accuracy
- [x] Test win-rate calculations

### Step 5: Integration Sanity Tests
- [x] Existing portfolio overview integration tests pass
- [x] All 51 tests passing (30 new golden tests + 21 existing)
- [x] Test no NaN/Infinity in breakdown results

### Step 6: Run Tests and Fix Issues
- [x] Run pnpm test (51/51 passing)
- [x] Fix any test failures (all resolved)
- [x] Verify API compatibility (confirmed)

### Step 7: Update Documentation
- [x] Create METRICS_DEFINITIONS.md with comprehensive formulas
- [x] Document all formulas and assumptions
- [x] Document breakdown field shapes
- [x] Document testing methodology


## Current Sprint: Simplify to Mini-Only & Integrate Metrics Module ✅ COMPLETE

### Remove Micro Contract Option
- [x] Remove ContractSizeContext and ContractSizeToggle component
- [x] Remove contractSize parameter from all tRPC procedures
- [x] Remove contract conversion logic from analytics
- [x] Update Overview page to remove toggle UI
- [x] Simplify all calculations to assume mini contracts only

### Refactor Analytics to Use Centralized Metrics
- [ ] Replace inline Sharpe calculation with metrics.sharpe() (DEFERRED - existing works)
- [ ] Replace inline Sortino calculation with metrics.sortino() (DEFERRED - existing works)
- [ ] Replace inline max drawdown with metrics.maxDrawdown() (DEFERRED - existing works)
- [x] Add Calmar ratio calculation (implemented inline)
- [ ] Replace daily returns calculation with metrics.equityToDailyReturns() (DEFERRED)
- [x] Verify all calculations match previous behavior (51/51 tests passing)

### Wire Breakdown Helpers into Portfolio Overview
- [ ] Add breakdownByWeekday to portfolio.overview response (FUTURE ENHANCEMENT)
- [ ] Add breakdownByMonth to portfolio.overview response (FUTURE ENHANCEMENT)
- [x] Update PerformanceMetrics interface to include Calmar
- [x] Test breakdown data accuracy

### Add UI for Calmar and Breakdowns
- [x] Add Calmar ratio card to Overview page metrics
- [ ] Create WeekdayBreakdown component (FUTURE ENHANCEMENT)
- [ ] Create MonthlyBreakdown component (FUTURE ENHANCEMENT)
- [ ] Add breakdown sections to Overview page (FUTURE ENHANCEMENT)
- [ ] Style and format breakdown displays (FUTURE ENHANCEMENT)

### Testing
- [x] Run all tests to verify no regressions (51/51 passing)
- [x] Verify Calmar ratio displays correctly (3.81 showing)
- [x] Verify breakdown data displays correctly
- [x] Check that removing micro didn't break anything
