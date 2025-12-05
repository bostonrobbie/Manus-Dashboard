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
