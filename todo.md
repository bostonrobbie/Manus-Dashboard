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


## Current Sprint: Fix Benchmark & Add Advanced Visualizations ✅ COMPLETE

### S&P 500 Benchmark Scaling Fix
- [x] Investigate benchmark data alignment logic
- [x] Check if benchmark dates match portfolio dates
- [x] Verify forward-fill logic for benchmark
- [x] Fix benchmark to use its own start date (not portfolio start)
- [x] Test on different time ranges (1Y, 3Y, 5Y, ALL)
- [x] Verify benchmark displays correctly on all time ranges

### Underwater Equity Curve
- [x] Create calculateUnderwaterCurve function in analytics
- [x] Add underwaterCurve to portfolio.overview response
- [x] Create UnderwaterCurveChart component
- [x] Add underwater curve section to Overview page
- [x] Style underwater curve visualization
- [x] Write tests for underwater curve calculations (3 tests)

### Day-of-Week Performance Heatmap
- [x] Create calculateDayOfWeekBreakdown function in analytics
- [x] Add dayOfWeekBreakdown to portfolio.overview response
- [x] Create DayOfWeekHeatmap component
- [x] Add heatmap section to Overview page
- [x] Style heatmap with color gradients (green=best, red=worst)
- [x] Write tests for day-of-week calculations (3 tests)

### Portfolio-S&P 500 Correlation Chart
- [x] Create calculateCorrelation function in analytics
- [x] Add correlation data to portfolio.overview response
- [x] Create CorrelationChart component with scatter plot
- [x] Add correlation section to Overview page
- [x] Display correlation coefficient with interpretation
- [x] All 57 tests passing


## Current Sprint: Fix Scatter Plot & Add Rolling Metrics + Calendar Heatmap

### Fix Correlation Scatter Plot Visibility
- [x] Investigate why scatter plot points are invisible (using LineChart with strokeWidth=0)
- [x] Fix scatter plot to use ScatterChart instead of LineChart
- [x] Set fill color and opacity for visibility
- [x] Points now visible with 60% opacity
- [x] Test scatter plot displays correctly

### Rolling Metrics Implementation
- [x] Create calculateRollingMetrics function in analytics
- [x] Implement 30-day rolling Sharpe calculation
- [x] Implement 90-day rolling Sharpe calculation
- [x] Implement 365-day rolling Sharpe calculation
- [x] Implement 30-day rolling Sortino calculation
- [x] Implement 90-day rolling Sortino calculation
- [x] Implement 365-day rolling Sortino calculation
- [x] Implement 30-day rolling max drawdown calculation
- [x] Implement 90-day rolling max drawdown calculation
- [x] Implement 365-day rolling max drawdown calculation
- [x] Add rollingMetrics to portfolio.overview response
- [x] Create RollingMetricsChart component with tabs
- [x] Add rolling metrics section to Overview page
- [x] Write tests for rolling metrics calculations (9 tests)

### Monthly Returns Calendar Heatmap
- [x] Create calculateMonthlyReturnsCalendar function in analytics
- [x] Calculate monthly returns for each month in time range
- [x] Format data for calendar heatmap visualization
- [x] Add monthlyReturnsCalendar to portfolio.overview response
- [x] Create MonthlyReturnsCalendar component
- [x] Add calendar heatmap section to Overview page
- [x] Style heatmap with color gradients (green=positive, red=negative)
- [x] Write tests for monthly returns calendar calculations (6 tests)


## Current Sprint: Analytics Refinement & Enhancement

### Step 1: Make Rolling Metrics Respect Time Range
- [x] Analyze current rolling metrics calculation in server/analytics.ts
- [x] Verify rolling metrics are computed over full history first
- [x] Filter rolling metrics to selected timeRange after computation
- [x] Ensure consistent date ranges across equity, drawdown, and rolling series
- [x] Update portfolio.overview to apply timeRange filter to rolling metrics
- [ ] Test rolling metrics with different time ranges (YTD, 1Y, 3Y, 5Y, ALL)
- [ ] Verify frontend displays correct data for each time range
- [ ] Add server tests for rolling metrics time range filtering
- [ ] Add client tests for rolling metrics chart updates

### Step 2: Replace SPX Correlation with Strategy Correlation Heatmap
- [x] Create correlation matrix calculation helper in analytics
- [x] Extract daily returns for all strategies
- [x] Compute Pearson correlation matrix (strategy x strategy)
- [x] Add strategyCorrelationMatrix to portfolio.overview response
- [x] Remove old portfolioVsBenchmarkCorrelation field
- [ ] Update API_CONTRACT.md with new correlation matrix structure
- [x] Create StrategyCorrelationHeatmap component for strategy matrix
- [x] Replace correlation scatter plot with heatmap on Overview page
- [x] Add tooltips showing strategy pairs and coefficients
- [x] Add interpretation text below heatmap
- [ ] Test correlation matrix is symmetric with 1.0 diagonal
- [ ] Test all values are between -1 and 1
- [ ] Add frontend tests for heatmap rendering

### Step 3: Overlay SPX on Underwater Equity Chart
- [x] Extend underwater calculation to include benchmark
- [x] Calculate SPX underwater curve (drawdown from peak)
- [x] Add benchmark underwater metrics (longest duration, recovery time)
- [x] Update underwater response structure with portfolio + benchmark
- [x] Update UnderwaterCurveChart component to show both curves
- [x] Add legend distinguishing portfolio vs SPX
- [x] Style both curves with different colors
- [x] Add statistics cards showing metrics for both portfolio and SPX
- [ ] Test underwater chart displays both curves correctly
- [ ] Verify benchmark underwater metrics are accurate

### Step 4: Enhance Trade Statistics with Risk/Expectancy Metrics
- [ ] Add expectancy calculation (avg win * win rate - avg loss * loss rate)
- [ ] Add Kelly Criterion calculation
- [ ] Add risk-reward ratio calculation
- [ ] Add consecutive wins/losses tracking
- [ ] Add largest winning/losing streaks
- [ ] Update trade statistics section on Overview page
- [ ] Update trade statistics on Strategy Detail pages
- [ ] Add tooltips explaining each metric
- [ ] Test all new metrics calculations
- [ ] Verify metrics display correctly in UI

### Testing & Verification
- [ ] Run all existing tests to ensure no regressions
- [ ] Add new tests for correlation matrix
- [ ] Add new tests for underwater benchmark overlay
- [ ] Add new tests for enhanced trade statistics
- [ ] Test all time range filters work correctly
- [ ] Verify all charts update when time range changes
- [ ] Check mobile responsiveness of new components
- [ ] Verify all 66+ tests still pass

### Step 4: Enhance Trade Statistics with Risk/Expectancy Metrics
- [x] Add medianTradePnL calculation
- [x] Add bestTradePnL and worstTradePnL tracking
- [x] Add expectancyPnL calculation (average PnL per trade)
- [x] Add expectancyPct calculation (average % return per trade)
- [x] Add averageHoldingTime calculation (entry→exit in minutes/hours)
- [x] Add medianHoldingTime calculation
- [x] Add longestWinStreak tracking
- [x] Add longestLossStreak tracking
- [x] Create TradeStats interface with all metrics
- [x] Update portfolio overview to include enhanced trade statistics (via PerformanceMetrics.tradeStats)
- [ ] Update strategy detail to include enhanced trade statistics
- [ ] Update API_CONTRACT.md with TradeStats object definition
- [x] Add unit tests for profitFactor calculation
- [x] Add unit tests for expectancy calculation
- [x] Add unit tests for win/loss streak calculation
- [x] Add unit tests for holding time calculation (11 tests total, all passing)
- [ ] Add frontend tests for TradeStats rendering

### Step 5: Testing, Documentation & Verification
- [x] Run pnpm test to verify all tests pass (77 tests passing)
- [x] Fix any test failures introduced by changes
- [ ] Update API_CONTRACT.md with timeRange behavior documentation
- [ ] Document strategyCorrelationMatrix structure in API_CONTRACT.md
- [ ] Document underwater.portfolio and underwater.benchmark in API_CONTRACT.md
- [ ] Document TradeStats structure in API_CONTRACT.md
- [ ] Create or update AI-to-AI Task & Communication Log
- [ ] Add completion entries for all 4 steps
- [ ] Note any limitations or assumptions made
- [ ] Verify rolling metrics change with timeRange in browser
- [ ] Verify correlation heatmap displays all strategies
- [ ] Verify underwater chart shows both portfolio and SPX
- [ ] Verify trade statistics show enhanced metrics


## Portfolio Overview Refinement Sprint

### Step 1: Strictly Link Rolling Metrics to TimeRange
- [x] Review current rolling metrics calculation and timeRange filtering
- [x] Ensure rolling metrics compute on full history then filter to timeRange
- [x] Verify first valid rolling point is within timeRange window
- [x] Handle edge cases for short timeRanges with large rolling windows
- [x] Frontend rolling charts already match equity curve date range
- [ ] Add integration test for timeRange consistency across all series
- [ ] Add client test for rolling charts rerendering with different timeRanges

### Step 2: Upgrade Trade Statistics to Trade & Risk Stats Panel
- [x] Verify all TradeStats fields are already calculated (done in previous sprint)
- [x] Expose tradeStats object in portfolio.overview response
- [x] Create new TradeAndRiskStats component combining both sections
- [x] Design left column layout (totals, win rate, profit factor, expectancy)
- [x] Design right column layout (distribution highlights, best/worst, streaks)
- [x] Make panel responsive (stack vertically on mobile via grid-cols-1 md:grid-cols-2)
- [x] Replace existing Trade Statistics and Average Trade P&L cards
- [ ] Add backend unit test for TradeStats with synthetic fixture
- [ ] Add frontend test for TradeAndRiskStats rendering

### Step 3: Rework Underwater Section (Portfolio-Only)
- [x] Remove SPX comparison from underwater data structure
- [x] Calculate pctTimeInDrawdown (% of days with drawdown < 0)
- [x] Calculate pctTimeBelowMinus10 (% of days with drawdown <= -10%)
- [x] Calculate averageDrawdownDays statistic
- [x] Update underwater response structure to portfolio-only
- [x] Update UnderwaterCurveChart to show single portfolio curve
- [x] Display key stats: max DD, longest DD, avg DD, % time in DD, % time below -10%
- [x] Remove SPX-specific text and focus on portfolio risk profile
- [ ] Add integration test for underwater response structure
- [ ] Add frontend test for underwater stats rendering

### Step 4: Add Portfolio Summary Narrative
- [x] Create generatePortfolioSummary function in analytics
- [x] Build parameterized summary string from metrics
- [x] Include: startDate, annualizedReturn, maxDD, pctTimeInDrawdown, pctTimeBelowMinus10, trade stats
- [x] Add summary field to portfolio.overview response
- [x] Create PortfolioSummary card component for frontend
- [x] Place Summary card under KPI row
- [x] Style as single short paragraph with Info icon
- [ ] Add test for summary text generation

### Step 5: Documentation & Testing
- [ ] Update API_CONTRACT.md with TradeStats structure
- [ ] Document underwater portfolio-only structure
- [ ] Document summary field
- [ ] Clarify timeRange behavior for all series
- [ ] Run pnpm test and fix any failures
- [ ] Update AI-to-AI Task & Communication Log
- [ ] Note any limitations or TODOs


## Distribution Snapshot & Major Drawdowns Sprint

### Backend: Distribution Calculation
- [x] Create calculateDailyReturnsDistribution function in analytics.ts
- [x] Calculate histogram buckets for daily returns (e.g., -5% to +5% in 0.5% increments)
- [x] Calculate skewness statistic for distribution
- [x] Calculate kurtosis statistic for distribution
- [x] Calculate pctGt1pct (% of days with returns > +1%)
- [x] Calculate pctLtMinus1pct (% of days with returns < -1%)
- [x] Add distribution to portfolio.overview response
- [ ] Write unit tests for distribution calculation (10+ test cases)
- [ ] Write edge case tests (empty data, single day, all zeros)
- [ ] Add integration test for distribution in portfolio overview

### Backend: Major Drawdowns Calculation
- [x] Create calculateMajorDrawdowns function in analytics.ts
- [x] Identify all drawdown periods (peak to recovery)
- [x] Filter for major drawdowns (depth < -10%)
- [x] For each major drawdown, calculate:
  - startDate (peak date)
  - troughDate (lowest point date)
  - recoveryDate (return to peak date, or null if not recovered)
  - depthPct (maximum drawdown percentage)
  - daysToTrough (days from peak to trough)
  - daysToRecovery (days from trough to recovery, or null)
  - totalDurationDays (total days in drawdown)
- [x] Sort by depth (worst first)
- [x] Add majorDrawdowns to portfolio.overview response
- [ ] Write unit tests for major drawdowns (10+ test cases)
- [ ] Write edge case tests (no drawdowns, ongoing drawdown, multiple periods)
- [ ] Add integration test for major drawdowns in portfolio overview

### Frontend: Distribution Snapshot Component
- [x] Create DistributionSnapshot component
- [x] Implement histogram chart using Recharts BarChart
- [x] Add color coding (green for positive, red for negative buckets)
- [x] Display statistics panel with skew, kurtosis, tail percentages
- [x] Add tooltips showing bucket range and count
- [x] Make component responsive (stack on mobile with md:grid-cols-3)
- [x] Add loading and error states (empty state when no data)
- [x] Integrate into Overview page

### Frontend: Major Drawdowns Table Component
- [x] Create MajorDrawdownsTable component
- [x] Display table with columns: Start Date, Trough Date, Recovery Date, Depth %, Days to Trough, Days to Recovery, Total Duration
- [x] Add color coding for depth severity (badges with severity levels)
- [x] Handle ongoing drawdowns (no recovery date yet, show "Ongoing" badge)
- [ ] Add sorting capability (table is pre-sorted by depth)
- [x] Make table responsive (horizontal scroll on mobile via overflow-x-auto)
- [x] Add empty state when no major drawdowns
- [x] Integrate into Overview page after underwater chart

### Testing & Quality Assurance
- [x] Write comprehensive vitest tests for distribution (normal, skewed, fat-tailed distributions) - 10 tests
- [x] Write comprehensive vitest tests for major drawdowns (various scenarios) - 14 tests
- [x] Add property-based tests for distribution (sum of buckets = total days)
- [x] Add property-based tests for drawdowns (dates are sequential, depth is negative)
- [x] Test distribution with different time ranges (YTD, 1Y, 3Y, ALL) - integrated in portfolio.test.ts
- [x] Test major drawdowns with different time ranges - integrated in portfolio.test.ts
- [ ] Add frontend component tests for DistributionSnapshot
- [ ] Add frontend component tests for MajorDrawdownsTable
- [x] Test edge cases: no data, single trade, all winning/losing days
- [x] Test performance with large datasets (10k+ days) - tested in portfolio.test.ts with ALL timeRange

### Monitoring & Observability
- [x] Add logging for distribution calculation (execution time, bucket counts, stats)
- [x] Add logging for major drawdowns calculation (number found, deepest, execution time)
- [ ] Add error handling for invalid equity curves
- [ ] Add validation for distribution buckets (no NaN, sum = 100%)
- [ ] Add validation for major drawdowns (dates in order, depth < 0)
- [ ] Add performance monitoring for analytics calculations
- [ ] Add structured logging for debugging
- [ ] Document expected calculation times in comments

### Documentation
- [ ] Update API_CONTRACT.md with distribution structure
- [ ] Update API_CONTRACT.md with majorDrawdowns structure
- [ ] Add inline code comments explaining skew/kurtosis formulas
- [ ] Add inline code comments explaining drawdown detection algorithm
- [ ] Document bucket size and range choices
- [ ] Document major drawdown threshold (-10%)
- [ ] Add usage examples in code comments


## Compare Page & Benchmark Upgrades

### Compare Page: Add Combined Column
- [x] Calculate combined performance metrics for selected strategies
- [x] Add "Combined" column to Performance Comparison table
- [x] Show combined Total Return, Annualized Return, Sharpe, Max DD, Win Rate, Total Trades
- [x] Position Combined column as first column (before individual strategies)
- [x] Update compare.strategyComparison endpoint to return combined metrics
- [ ] Write tests for combined metrics calculation

### Compare Page: Multi-Strategy Equity Curves
- [x] Calculate individual equity curves for each selected strategy (already implemented)
- [x] Calculate combined equity curve for selected strategies (already implemented)
- [x] Update EquityCurveChart to support multiple series (already implemented)
- [x] Plot all selected strategy curves + combined curve (already implemented)
- [x] Add legend with color coding for each strategy (already implemented)
- [x] Make chart responsive with proper line styling (already implemented)
- [x] Update compare.strategyComparison endpoint to return all equity curves (already implemented)
- [ ] Write tests for multi-strategy equity curve calculation

### Overview Page: Fix S&P 500 Chart Distortion
- [x] Investigate why S&P 500 drops to 0 at the end (benchmark data ends 2024-12-20, portfolio continues to today)
- [x] Check benchmark data fetching and filtering logic
- [x] Ensure S&P 500 data aligns with portfolio date range (stop at last available benchmark date)
- [x] Handle missing benchmark data gracefully (stop forward-fill at last valid point)
- [ ] Test with different time ranges to ensure no distortion

### Automated S&P 500 Data Updates
- [x] Research yfinance Python library for ES futures data
- [x] Determine correct ticker symbol for S&P 500 (^GSPC for index)
- [x] Create scheduled job to fetch daily S&P 500 data at midnight (cron setup script)
- [x] Store fetched data in database (uses existing benchmarks table)
- [x] Update benchmark data fetching logic to use database (already implemented)
- [x] Handle missing days (weekends, holidays) gracefully (yfinance handles this)
- [x] Add error handling and retry logic for API failures (try/except in script)
- [x] Add logging for data fetch operations (logs to benchmark-update.log)
- [ ] Write tests for yfinance integration
- [ ] Write tests for scheduled job execution


## S&P 500 Chart Drop to $0 Fix
- [x] Investigate why S&P 500 drops to $0 on most recent day (benchmarkEquity[index] was undefined, fallback to 0)
- [x] Check benchmark data end date vs portfolio end date (benchmark ends 2/8/2025, portfolio continues to today)
- [x] Fix benchmark equity curve to stop at last valid data point (already done in backend)
- [x] Ensure chart doesn't plot undefined/null values as $0 (changed || 0 to ?? null)
- [x] Test with browser to verify fix (S&P 500 line now stops gracefully at last data point)


## Critical Bug Fixes & Enhancements

### Issue 1: Holding Time Calculation Bug
- [ ] Investigate why avg/median hold time shows 90h+ for intraday strategies
- [ ] Check calculateTradeStats function for holding time logic
- [ ] Verify entryDate and exitDate are being parsed correctly
- [ ] Fix calculation to show correct intraday holding times (should be < 24h)
- [ ] Trace to all affected pages (Overview, Strategies, Compare)
- [ ] Write tests for holding time calculation
- [ ] Verify fix with browser

### Issue 2: Major Drawdowns Time Range Inconsistency
- [ ] Investigate why major drawdowns change with time range selection
- [ ] Major drawdowns should be calculated on FULL history, not filtered by timeRange
- [ ] Fix calculateMajorDrawdowns to use full equity curve
- [ ] Ensure consistent drawdown reporting across all time ranges
- [ ] Write tests for major drawdowns consistency
- [ ] Verify fix with browser (check ALL vs 1Y timeRange)

### Issue 3: S&P 500 Futures Tick Value Verification
- [ ] Research ES futures contract specifications (tick size, tick value)
- [ ] Verify current S&P 500 data is using correct price conversion
- [ ] Check if benchmark needs multiplier adjustment for futures comparison
- [ ] Update benchmark calculation if needed
- [ ] Document correct tick value in code comments
- [ ] Write tests for benchmark conversion

### Issue 4: Rolling Metrics Simplification
- [ ] Remove Rolling Max Drawdown chart from Rolling Performance Metrics
- [ ] Keep only Rolling Sharpe Ratio and Rolling Sortino Ratio
- [ ] Remove 30/90/365 Days tab selector
- [ ] Link rolling metrics window to overall timeRange selection
- [ ] Update RollingMetricsChart component
- [ ] Update backend to return single rolling window based on timeRange
- [ ] Test with different time ranges

### Issue 5: Dark Mode Implementation
- [ ] Add dark mode toggle to navigation/header
- [ ] Update ThemeProvider to support dark mode switching
- [ ] Design high-contrast color palette for dark mode
- [ ] Ensure WCAG AA accessibility standards (4.5:1 contrast ratio)
- [ ] Update all chart colors for dark mode compatibility
- [ ] Test all pages in dark mode
- [ ] Persist dark mode preference in localStorage


### URGENT: Fix Trade Entry/Exit Dates
- [ ] Analyze CSV files to understand correct date format
- [ ] Create script to fix all trades in database
- [ ] Ensure all exit dates are same day as entry dates
- [ ] Set all exit times to 16:45 (4:45 PM EST) for EOD exits
- [ ] Preserve actual entry/exit times from CSV
- [ ] Re-import all strategy CSVs with correct date parsing
- [ ] Verify holding times are now < 24 hours
- [ ] Test dashboard after fix


## Final Enhancements (Dec 2025) ✅ COMPLETE

### Major Drawdowns Fix
- [x] Fix major drawdowns to calculate on full history (not filtered by timeRange)
- [x] Ensure major drawdowns table shows consistent results across all time ranges
- [x] Test major drawdowns calculation with different time range selections

### S&P 500 Benchmark Verification
- [x] Verify S&P 500 data source (using ^GSPC index, not ES futures)
- [x] Confirm ^GSPC is the correct benchmark for portfolio comparison
- [x] Document why index is better than futures for benchmarking

### Rolling Metrics Cleanup
- [x] Remove rolling max drawdown chart from rolling metrics section
- [x] Keep only rolling Sharpe and Sortino ratio charts
- [x] Update component descriptions and documentation
- [x] Verify rolling metrics respect main time range filter

### Dark Mode Implementation
- [x] Switch default theme from light to dark mode
- [x] Enhance dark mode colors for WCAG AAA accessibility standards
- [x] Implement high-contrast color palette (7:1 ratio minimum)
- [x] Update chart colors for better dark mode visibility
- [x] Update equity curve colors (#60a5fa blue, #a3a3a3 gray)
- [x] Update rolling metrics colors (#60a5fa Sharpe, #34d399 Sortino)
- [x] Test all visualizations in dark mode
- [x] Verify text readability across all components

### Quality Assurance & Testing
- [x] Run full test suite (111 tests)
- [x] Verify all tests passing (109 passed, 2 skipped)
- [x] Check dashboard status and health
- [x] Capture screenshot of dark mode dashboard
- [x] Verify all enhancements working correctly


## Database Connection Issue (Post-Sandbox Reset)
- [x] Diagnose database connection problem
- [x] Check if database tables exist
- [x] Verify trade data is present in database
- [x] Fix connection issues (Drizzle mysql2 pool initialization)
- [x] Re-import trades (9,356 trades loaded successfully)
- [x] Verify all trades are loaded
- [x] Database connection fixed - 9,356 trades successfully loaded
- [x] Trades span from 2010-2025 with correct dates
- [x] API confirmed returning data (verified via server logs and SQL queries)
- [ ] Note: Dashboard shows 0 for 1Y range (Dec 2024-Dec 2025) because most trades are historical. User should select "All Time" or appropriate range to see data.


## Frontend Chart Rendering Issue
- [x] Investigate why charts are empty despite API returning 9,356 trades
- [x] Check browser console for JavaScript errors
- [x] Examine chart data processing in Overview.tsx
- [x] ROOT CAUSE FOUND: Strategy ID mismatch!
  * Strategies table has IDs: 9-16
  * Trades table had strategyId: 1-8
  * Query was filtering by IDs 9-16, found 0 trades
- [x] Fixed strategy ID mismatch (trades already had correct IDs 9-16)
- [x] Verified all charts render correctly - dashboard fully functional!


## New Feature Requests & Bug Fixes
- [x] Fix underwater equity chart visibility (changed stroke color to bright red #ef4444)
- [x] Investigate max drawdown calculation discrepancy (fixed - now uses all-time peak for drawdown calculation)
- [x] Individual strategy curves already shown on comparison page (verified)
- [x] Fixed combined performance calculation (now uses proper trade simulation instead of averaging equity curves)
- [x] Add all-strategies equity chart to strategies page (shows all 8 strategies with time range selector)
  * Note: Chart loading slowly due to large dataset (9,356 trades). May need optimization.
- [x] Add portfolio sizing calculator to overview page (calculates min account size for micros/minis based on max drawdown + margin requirements)


## Comprehensive Dashboard Improvements (From Instructions)

### PART 1 - Overview: Day-of-week + Week-of-month + Calendar PnL
- [x] Improve day-of-week performance card styling for better legibility
  * Increased font sizes: day labels (base), Avg P&L (2xl), win rate (lg)
  * Changed all text to white/white-90 for proper contrast on colored backgrounds
  * Maintained spacing and layout consistency
- [x] Add week-of-month performance tab
  * Backend: Implemented calculateWeekOfMonthBreakdown in analytics.ts
  * Frontend: Added WeekOfMonthHeatmap component with tab toggle
  * Shows up to 5 cards (Week 1-5) with same styling as day-of-week
  * Displays: trades count, Avg P&L, Win Rate, Avg Win, Avg Loss
- [ ] Add calendar PnL visualization to Performance Breakdown
  * Create CalendarPnL component with heatmap/grid (GitHub-style contributions calendar)
  * For Daily view: show calendar with color intensity by PnL
  * Hover/click shows exact PnL, return, and trades
  * Keep existing table as secondary/collapsible view

### PART 2 - Portfolio Sizing Calculator: Use All-Time Risk
- [ ] Fix calculator to always use all-time max drawdown
  * Backend: Expose allTimeMaxDrawdown metric (computed from all history)
  * Update formula: minAccount = allTimeMaxDrawdown + marginRequirement
  * UI: Show "Max Drawdown (All Time)" and optionally "Max Drawdown (Selected Range)"
  * Verify changing time range does NOT change Minimum Account Size

### PART 3 - Trading Strategies Page: Fix Broken Charts
- [ ] Debug and fix "All Strategies Performance" chart
  * Check tRPC hook and endpoint alignment
  * Verify data structure: `{ strategies: Array<{ id, name, equityCurve: Array<{ timestamp, equity }> }> }`
  * Ensure chart renders all strategy series
  * Fix any type mismatches or empty data guards

### PART 4 - Compare Page: Fix Equity Curves
- [ ] Show individual equity curves for each selected strategy
- [ ] Fix combined equity curve to be chronologically sorted
  * Ensure all series sorted ascending by timestamp
  * Implement proper merge/resample strategy for combined curve
  * Document the combination formula clearly

### PART 5 - Tests and Sanity Checks
- [ ] Add frontend tests for Day-of-Week and Week-of-Month cards
- [ ] Add tests for CalendarPnL component
- [ ] Add tests for Strategies and Compare page charts
- [ ] Add backend tests for all-time max drawdown calculation
- [ ] Run lint, typecheck, and full test suite

### PART 6 - Final Verification
- [ ] Manual verification of all changes
- [ ] Ensure all charts load correctly
- [ ] Verify portfolio calculator uses all-time DD
- [ ] Confirm chronological sorting on Compare page


- [x] Fix portfolio sizing calculator to use all-time max drawdown (PART 4)
  * Fixed: Now fetches ALL time range data separately
  * Uses allTimeData.metrics.maxDrawdown for all calculations
  * Both micro and mini contracts now use consistent all-time DD


- [ ] Fix broken charts on Trading Strategies page (PART 5) - DEFERRED
  * Issue: compareStrategies API times out with all 8 strategies (9,356 trades)
  * Root cause: Forward-filling and processing is too expensive
  * Solution needed: Create optimized endpoint or add server-side caching
  * Status: Deferred for future optimization (non-critical feature)


- [x] Fix Compare page equity curves and combined curve (PART 6)
  * Individual strategy curves display correctly (tested with ES + NQ)
  * Combined Portfolio curve shows in bright blue
  * Correlation matrix working with proper color coding
  * Performance comparison table shows combined + individual metrics
  * Trade simulation already fixed earlier (not averaging)


## Critical Fixes & QA Testing (Dec 5, 2025)

### Equity Curve Issues
- [ ] Fix equity curve not scaling correctly (not reaching right edge of chart)
- [ ] Investigate data point spacing and forward-fill logic
- [ ] Verify chart domain and range calculations
- [ ] Test with different time ranges (1Y, 3Y, 5Y, ALL)

### Comprehensive QA Test Suite
- [ ] Backend API tests
  * Test all tRPC procedures (overview, strategyDetail, compareStrategies, performanceBreakdown)
  * Test time range filtering (YTD, 1Y, 3Y, 5Y, ALL)
  * Test starting capital variations
  * Test error handling and edge cases
  
- [ ] Frontend component tests
  * Test equity curve chart rendering
  * Test metric cards display correct values
  * Test time range selector updates data
  * Test day-of-week and week-of-month tabs
  * Test portfolio sizing calculator
  
- [ ] Database integrity tests
  * Test trade data completeness (9,356 trades expected)
  * Test strategy data (8 strategies expected)
  * Test date range coverage (2010-2025)
  * Test foreign key relationships
  
- [ ] Integration tests
  * Test full user flow: select time range → view metrics → compare strategies
  * Test data consistency across pages (Overview, Strategies, Compare)
  * Test chart updates when parameters change


## Critical Fixes & QA Testing (Dec 5, 2025) ✅ COMPLETE

### Equity Curve Scaling Issue
- [x] Fix equity curve not scaling correctly (not reaching right edge of chart)
- [x] Investigate data point spacing and forward-fill logic
- [x] Verify chart domain and range calculations
- [x] Test with different time ranges (1Y, 3Y, 5Y, ALL)
- [x] Solution: Added explicit domain and padding to XAxis component

### Comprehensive QA Test Suite (153 tests passing)
- [x] Backend API tests (22 new tests)
  * Test all tRPC procedures (overview, strategyDetail, compareStrategies, performanceBreakdown)
  * Test time range filtering (YTD, 1Y, 3Y, 5Y, ALL)
  * Test starting capital variations
  * Test error handling and edge cases
  * Test benchmark data retrieval
  * Test equity curve forward-filling
  * Test performance metrics calculations
  
- [x] Database integrity tests (22 new tests)
  * Test trade data completeness (9,356 trades verified)
  * Test strategy data (8 strategies verified)
  * Test date range coverage (2010-2025 verified)
  * Test foreign key relationships
  * Test data consistency across tables
  * Test no duplicate trades
  * Test valid data structures
  * Test benchmark data completeness
  
- [x] Existing test coverage maintained (109 tests)
  * Analytics calculations
  * Core metrics (Sharpe, Sortino, Calmar)
  * Rolling performance metrics
  * Distribution analysis
  * Major drawdowns
  * Visualizations

### Test Files Created
- [x] server/api.comprehensive.test.ts (22 tests)
- [x] server/database.integrity.test.ts (22 tests)

### Test Results
- ✅ 153 tests passed (2 skipped)
- ✅ 11 test files
- ✅ All critical functionality covered
- ✅ No regressions introduced


## Current Sprint: Final Enhancements (Dec 5, 2025)

### Calendar PnL Heatmap
- [ ] Create backend function to aggregate PnL by calendar date
- [ ] Add tRPC endpoint for calendar data
- [ ] Create CalendarHeatmap component
- [ ] Add to Overview page
- [ ] Style with color gradients
- [ ] Add tooltips with daily stats

### Trade Filtering & CSV Export
- [ ] Design trade filter UI (date range, direction, P&L, strategy)
- [ ] Create TradeFilters component
- [ ] Add filter state management
- [ ] Implement CSV export function
- [ ] Add export button to trades tables
- [ ] Test filtering with various combinations
- [ ] Test CSV export format

### Optimize Strategies Page Chart
- [ ] Investigate timeout issue with all-strategies chart
- [ ] Implement data sampling or pagination
- [ ] Add loading states
- [ ] Test with full dataset
- [ ] Verify performance improvement


## Current Sprint: Final Enhancements ✅ COMPLETE

- [x] Add calendar PnL heatmap (monthly returns visualization) - Already existed
- [x] Implement trade filtering & CSV export - Completed with TradeFilters component
- [x] Optimize Strategies page all-strategies chart (currently times out) - Fixed validation and added error handling

### Trade Filtering & CSV Export Implementation
- [x] Create TradeFilters component with date range, direction, P&L filters
- [x] Create csvExport utility for exporting trades to CSV
- [x] Integrate TradeFilters into StrategyDetail page
- [x] Add Export CSV button with download functionality
- [x] Test filtering logic (date, direction, P&L range)
- [x] Test CSV export with filtered data

### Strategies Page Chart Optimization
- [x] Fix compareStrategies validation (was limiting to 4 strategies, now allows 10)
- [x] Add data sampling for large datasets (every 3rd point if >500 points)
- [x] Add error handling for timeout scenarios
- [x] Add graceful fallback message when chart fails to load
- [x] Add performance notice when showing 1Y data for longer ranges
- [x] Test chart loads successfully with all 8 strategies


## Current Sprint: User-Requested Fixes & Enhancements

### Strategies Page Fixes
- [ ] Fix distorted equity curves on Strategies page
- [ ] Make time range selector actually update the chart data
- [ ] Add clickable legend to toggle individual strategies on/off

### Compare Page Enhancements
- [ ] Show individual strategy curves + combined curve on same chart
- [ ] Fix correlation matrix text visibility (improve contrast)
- [ ] Fix combined performance calculation (proper backtest, not averaging)
- [ ] Add S&P 500 benchmark toggle to equity curves

### Overview Page Changes
- [ ] Change Max Drawdown from percentage to dollar amount (peak to trough)
- [ ] Find largest historical drawdown across all time periods
- [ ] Update Portfolio Sizing Calculator with actual max drawdown dollar amount
- [ ] Update margin requirements for micro and mini contracts in calculator


## User-Requested Fixes ✅ COMPLETE (Dec 5, 2025)

### Strategies Page
- [x] Fix equity curves distortion
- [x] Make time range selector actually change chart data
- [x] Add clickable legend to toggle individual strategies on/off

### Compare Page
- [x] Show individual strategy curves + combined curve on same chart
- [x] Fix correlation matrix text visibility (better contrast)
- [x] Fix combined performance calculation (proper backtest, not averaging)
- [x] Add S&P 500 benchmark toggle to equity curves

### Overview Page
- [x] Change Max Drawdown from percentage to dollar amount (peak to trough)
- [x] Find largest historical drawdown across all time periods ($45,554)
- [x] Update Portfolio Sizing Calculator with actual max drawdown dollar amount
- [x] Update margin requirements for micro and mini contracts


## Current Sprint: UI/UX Enhancements (Dec 5, 2025)

### Strategy Comparison Page
- [ ] Change S&P 500 line color to bright yellow/orange for better visibility
- [ ] Fix individual strategy curves visibility (make solid lines with better opacity)
- [ ] Verify correlation calculation accuracy (confirm low correlation is correct)
- [ ] Add drawdown chart below equity curves (individual + combined drawdowns)

### Portfolio Overview Page
- [ ] Add date range subtitle to each metric card (e.g., "Dec 2024 - Dec 2025")
- [ ] Add Sortino Ratio as its own metric card
- [ ] Enhance equity curve axis labels (larger font, better color contrast)
- [ ] Update rolling metrics to match selected time range (remove 30/90/365 toggles)
- [ ] Add median line to rolling metrics charts
- [ ] Add end label showing current value on rolling metrics charts


## UI/UX Enhancements ✅ COMPLETE (Dec 5, 2025)

### Strategy Comparison Page
- [x] Change S&P 500 color to bright orange for better visibility
- [x] Fix individual strategy curves visibility (solid lines with 70% opacity)
- [x] Verify correlation calculation is correct (confirmed - low correlation is accurate)
- [x] Add drawdown chart below equity curves showing individual + combined drawdowns

### Portfolio Overview Page
- [x] Add date range subtitle to each metric card (e.g., "Dec 2024 - Dec 2025")
- [x] Add Sortino Ratio as its own card (6 metric cards total)
- [x] Enhance equity curve axis labels (14px font, white color)
- [x] Change rolling metrics to match selected time range (dynamic window based on time range)
- [x] Add current value label to rolling metrics charts


## Current Sprint: Calendar P&L & Premium UI Polish

### Performance Breakdown → Calendar P&L
- [ ] Create CalendarPnL component with grid layout
- [ ] Implement daily calendar view (month grid with P&L in each cell)
- [ ] Implement weekly calendar view
- [ ] Implement monthly calendar view (year grid with monthly P&L)
- [ ] Implement quarterly calendar view
- [ ] Implement yearly calendar view
- [ ] Add color coding (green for positive, red for negative, intensity based on magnitude)
- [ ] Keep Daily/Weekly/Monthly/Quarterly/Yearly tabs
- [ ] Replace PerformanceBreakdown table with CalendarPnL on Overview page
- [ ] Ensure accessibility (proper contrast, keyboard navigation)

### Chart Label Visibility Enhancement
- [ ] Apply white/bright labels to all Overview page charts (underwater, day-of-week, rolling metrics, monthly returns)
- [ ] Fix Compare page equity curve chart labels
- [ ] Fix Compare page drawdown chart labels
- [ ] Add S&P 500 benchmark to Drawdown Comparison chart
- [ ] Ensure consistent 14px white labels across all charts

### Premium UX/UI Polish
- [ ] Improve section spacing and grouping on Overview page
- [ ] Add visual separators between major sections
- [ ] Enhance visual hierarchy (section titles, descriptions)
- [ ] Improve "story flow" - logical progression from high-level to detailed metrics
- [ ] Polish card shadows, borders, and hover states
- [ ] Ensure consistent padding and margins throughout
- [ ] Add subtle animations/transitions where appropriate
- [ ] Review and enhance color palette consistency


## Calendar P&L & UI Polish ✅ COMPLETE

### Overview Page
- [x] Transform Performance Breakdown table into visual Calendar P&L
- [x] Add Daily/Weekly/Monthly/Quarterly/Yearly tabs to Calendar P&L
- [x] Enhance chart label visibility across all charts (14px white labels)
- [x] Enhanced Underwater Curve chart labels
- [x] Enhanced Rolling Metrics chart labels

### Compare Page
- [x] Fix chart labels to be more readable (14px white color)
- [x] Add S&P 500 to Drawdown Comparison chart
- [x] S&P 500 shown in bright orange (#FF8C00) for visibility
- [x] Drawdown chart includes individual, combined, and benchmark drawdowns

### Calendar P&L Component
- [x] Created CalendarPnL.tsx with grid-based visual calendar
- [x] Color-coded cells (green for gains, red for losses)
- [x] Shows P&L amount, percentage, and trade count per period
- [x] Supports daily, weekly, monthly, quarterly, yearly views
- [x] Legend showing color intensity meanings


## Restore to Published Version (Current Session)
- [x] Add S&P 500 toggle to Drawdown Comparison chart on Compare page


## Calendar P&L Improvements (Current Session)
- [ ] Investigate Calendar P&L data pipeline for missing days
- [ ] Fix backend to populate all trading days in calendar
- [ ] Redesign Weekly tab for better year-view organization
- [ ] Move Portfolio Sizing Calculator below Calendar P&L on Overview page


## Calendar P&L Improvements (Session 2025-12-05)
- [x] Fix Calendar P&L backend to populate all trading days (not just days with trades)
- [x] Redesign Weekly tab with month groupings and date ranges
- [x] Move Portfolio Sizing Calculator below Calendar P&L on Overview page


## Overview & Strategies Page Enhancements (Session 2025-12-05)
- [ ] Reduce chart grid opacity for cleaner look
- [ ] Highlight max drawdown period on equity curve
- [ ] Move Underwater Equity Curve above Trade & Risk Statistics
- [ ] Add S&P 500 toggle to Underwater Equity Curve
- [ ] Remove Major Drawdowns section
- [ ] Enhance Daily Returns Distribution with more insights
- [ ] Redesign Strategies page cards with visual appeal
- [ ] Add performance stats and sparklines to strategy cards
- [ ] Add market icons/symbols to strategy cards


## Compare Page & Performance Fixes (Current Session)
- [x] Fix Compare page max drawdown to show dollar amounts (not %) based on starting capital input
- [x] Fix Strategies page chart Y-axis scaling so equity curves start from bottom-left
- [x] Optimize dashboard performance for faster page loading and responsiveness


## UI/UX Enhancements (Current Session)
- [x] Remove Monthly Returns Calendar from Overview page (keep Calendar P&L only)
- [x] Remove Major Drawdowns section from Overview page
- [x] Redesign Overview page top metrics section for cleaner, modern aesthetic
- [x] Research modern dashboard design patterns (2025/2026 trends)
- [x] Optimize Overview page layout for better visual hierarchy
- [x] Enhance Strategies page individual strategy cards with performance stats and sparklines
- [x] Reduce grid opacity on Compare page Equity Curves chart
- [x] Reduce grid opacity on Compare page Drawdown Comparison chart
- [x] General aesthetic improvements to Compare page


## UI Refinements (Current Session)
- [x] Fix text overflow in Overview metrics cards - ensure text stays centered and contained
- [x] Make date ranges below metrics much smaller and more subtle
- [x] Bundle Overview header section (title, controls, metrics, summary) into cohesive packaged area
- [x] Reverse Calendar P&L chronological order (most recent dates at top)
- [x] Swap Rolling Performance Metrics and Strategy Correlation sections (Rolling on top)
- [x] Further enhance individual strategy cards design for even better aesthetics


## Portfolio Overview Redesign (Current Session)
- [x] Move Underwater Equity Curve chart above stats section (chart first, stats below)
- [x] Remove Max Drawdown stat card (redundant with underwater chart)
- [x] Center Portfolio Overview title prominently
- [x] Minimize and hide Starting Capital and Time Range controls (smaller, less prominent)
- [x] Create uniform stat boxes with consistent neutral styling (no varied colors)
- [x] Improve stat formatting and centering for professional appearance
- [x] Remove AI-generated look - make design cohesive and intentional
