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
