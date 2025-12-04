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
- [ ] Create page layout with DashboardLayout
- [ ] Implement combined equity curve chart (portfolio vs S&P 500)
- [ ] Add time-range filter buttons (YTD, 1Y, 3Y, 5Y, All)
- [ ] Add starting capital input field
- [ ] Display KPI cards (total return, Sharpe, Sortino, max drawdown, win rate)
- [ ] Create performance breakdown table (day/week/month/quarter/year)
- [ ] Add regime analysis section
- [ ] Ensure all metrics are annualized and in percentages

## Phase 5: Individual Strategy Pages
- [ ] Create strategy detail page component
- [ ] Implement strategy selector/navigation
- [ ] Display equity curve for single strategy
- [ ] Show full performance metrics dashboard
- [ ] Add recent trades table
- [ ] Implement time-range filtering

## Phase 6: Strategy Comparison Page
- [ ] Create comparison page layout
- [ ] Implement multi-select for 2-4 strategies
- [ ] Display individual equity curves (forward-filled, different colors)
- [ ] Calculate and display combined equity curve
- [ ] Create correlation matrix heatmap
- [ ] Build comparison metrics table
- [ ] Ensure continuous lines without gaps

## Phase 7: Testing & QA
- [ ] Write unit tests for analytics calculations
- [ ] Write integration tests for tRPC endpoints
- [ ] Test authentication flow (Google OAuth)
- [ ] Test admin vs user role access
- [ ] Test mobile responsiveness
- [ ] Test all time-range filters
- [ ] Verify webhook ingestion
- [ ] End-to-end QA of all features

## Phase 8: Deployment
- [ ] Final code review
- [ ] Create production checkpoint
- [ ] Verify all features work in production
- [ ] Document deployment and usage
- [ ] Deliver permanent URL to user
