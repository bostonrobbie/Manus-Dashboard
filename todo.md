# Intraday Trading Dashboard - TODO

## Phase 1: Database & Data Migration
- [x] Design database schema (strategies, trades, benchmarks tables)
- [x] Copy normalized seed data from GitHub repo
- [x] Create TypeScript seed scripts for database population
- [x] Run migrations and seed database

## Phase 2: Backend Analytics & API
- [x] Implement portfolio analytics engine (metrics calculations)
- [x] Create tRPC endpoint: portfolio.overview
- [x] Create tRPC endpoint: portfolio.strategyDetail
- [x] Create tRPC endpoint: portfolio.compareStrategies
- [x] Implement time-range filtering logic
- [x] Implement forward-fill for equity curves

## Phase 3: TradingView Webhook
- [x] Create webhook endpoint for trade signals
- [x] Implement authentication/security for webhook
- [x] Add trade validation and database insertion logic
- [x] Add error handling and logging

## Phase 4: Portfolio Overview Page
- [x] Create page layout with DashboardLayout
- [x] Implement combined equity curve chart (portfolio vs S&P 500)
- [x] Add time-range filter controls
- [x] Add starting capital input field
- [x] Display KPI cards (total return, Sharpe, Sortino, max drawdown, win rate)
- [x] Ensure all metrics are annualized and in percentages
- [ ] Create performance breakdown table (day/week/month/quarter/year)
- [ ] Add regime analysis section

## Phase 5: Individual Strategy Pages
- [x] Create strategy list page
- [x] Create strategy detail page component
- [x] Display equity curve for single strategy
- [x] Show full performance metrics dashboard
- [x] Add recent trades table
- [x] Implement time-range filtering

## Phase 6: Strategy Comparison Page
- [x] Create comparison page layout
- [x] Implement multi-select for 2-4 strategies
- [x] Display individual equity curves (forward-filled, different colors)
- [x] Calculate and display combined equity curve
- [x] Create correlation matrix heatmap
- [x] Build comparison metrics table
- [x] Ensure continuous lines without gaps

## Phase 7: Testing & QA
- [x] Write unit tests for analytics calculations
- [x] Write integration tests for tRPC endpoints
- [x] Test authentication flow (Google OAuth)
- [x] Test all time-range filters
- [x] Verify equity curves display correctly
- [ ] Test admin vs user role access
- [ ] Test mobile responsiveness
- [ ] Verify webhook ingestion
- [ ] End-to-end QA of all features

## Phase 8: Deployment
- [ ] Final code review
- [ ] Create production checkpoint
- [ ] Verify all features work in production
- [ ] Document deployment and usage
- [ ] Deliver permanent URL to user

## Bug Fixes (Resolved)
- [x] Fixed equity curve not rendering on Overview page
- [x] Fixed benchmark data seed script (onDuplicateKeyUpdate bug causing duplicate values)
- [x] Fixed chart stroke colors (hsl() wrapper incompatible with OKLCH CSS variables)
- [x] Added forward-fill logic to portfolio.overview endpoint
- [x] Added forward-fill logic to portfolio.strategyDetail endpoint

## Future Enhancements
- [ ] Add performance breakdown tables (daily/weekly/monthly/quarterly)
- [ ] Implement regime analysis (bull/bear/sideways market conditions)
- [ ] Add drawdown visualization chart
- [ ] Implement trade filtering and search
- [ ] Add CSV export functionality
- [ ] Mobile UI optimization
- [ ] Real-time TradingView webhook testing
