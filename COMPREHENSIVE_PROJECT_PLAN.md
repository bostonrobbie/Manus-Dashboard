# Comprehensive Project Plan: Production-Ready Intraday Trading Dashboard

**Project Name:** Manus Intraday Strategies Dashboard  
**Repository:** https://github.com/bostonrobbie/Manus-Dashboard  
**Created:** December 4, 2025  
**Status:** Planning Phase  

---

## Executive Summary

This document outlines the complete plan for building a production-ready, scalable intraday trading strategies dashboard. The project will transform the existing codebase into a professional-grade application featuring 8 intraday strategies, comprehensive analytics, real-time webhook integration, and enterprise-level quality assurance.

**Key Objectives:**
1. Build a high-performance, scalable dashboard supporting multiple concurrent users
2. Implement comprehensive testing and monitoring infrastructure
3. Create three core pages: Overview, Individual Strategies, and Strategy Comparison
4. Integrate TradingView webhooks for automated trade signal capture
5. Ensure frontend-backend synchronization with robust error handling
6. Provide extensive documentation for AI-to-AI collaboration

---

## Current State Analysis

### Existing Codebase Strengths

**Architecture:**
- ✅ Modern monorepo structure with pnpm workspaces
- ✅ React 19 + Vite frontend with TypeScript
- ✅ Express + tRPC backend with type-safe API
- ✅ Drizzle ORM with MySQL (Manus-compatible)
- ✅ Existing authentication framework (Manus OAuth ready)
- ✅ Portfolio engine with analytics capabilities

**Database Schema (Already Implemented):**
- ✅ `users` - User authentication and roles
- ✅ `strategies` - Strategy definitions (swing/intraday types)
- ✅ `trades` - Trade history with deduplication
- ✅ `positions` - Current open positions
- ✅ `equityCurve` - Pre-calculated equity data
- ✅ `analytics` - Rolling metrics and statistics
- ✅ `benchmarks` - S&P 500 comparison data
- ✅ `webhookLogs` - TradingView webhook tracking
- ✅ `uploadLogs` - CSV import audit trail
- ✅ `auditLogs` - System action logging

**Existing Features:**
- ✅ Portfolio overview with equity curves
- ✅ Trade ingestion from CSV
- ✅ Benchmark data management
- ✅ Monte Carlo simulation
- ✅ Rolling metrics calculation
- ✅ Export functionality
- ✅ Admin data manager
- ✅ Health check endpoints

### Gaps to Address

**Missing Features:**
1. ❌ Individual strategy detail pages
2. ❌ Strategy comparison page with correlation analysis
3. ❌ Combined equity curve for selected strategies
4. ❌ Time-range filtering UI (YTD, 1Y, 3Y, 5Y, All-Time)
5. ❌ Starting account value input
6. ❌ Regime-based performance breakdown
7. ❌ Day/week/month performance tables
8. ❌ Active TradingView webhook endpoint implementation
9. ❌ Comprehensive E2E testing
10. ❌ Production monitoring and alerting
11. ❌ AI collaboration task log system

**Quality Improvements Needed:**
1. ❌ Frontend-backend connection validation tests
2. ❌ API contract documentation
3. ❌ Error tracking and logging system
4. ❌ Performance optimization for concurrent users
5. ❌ Mobile responsiveness verification
6. ❌ Data pipeline integrity checks

---

## Technical Architecture Plan

### Technology Stack (Confirmed)

**Frontend:**
- React 19 with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- Recharts for data visualization
- tRPC client for type-safe API calls

**Backend:**
- Node.js with Express
- tRPC for API layer
- Drizzle ORM
- MySQL/TiDB (Manus platform)

**Testing:**
- Vitest for unit/integration tests
- Playwright for E2E tests
- Property-based testing for calculations

**Monitoring:**
- Structured JSON logging
- Sentry for error tracking (to be added)
- Custom health check endpoints

**Deployment:**
- Manus platform (primary)
- GitHub for version control
- Vercel-compatible build process

### Database Schema Enhancements

**No major schema changes needed** - existing schema is comprehensive. Minor additions:

```typescript
// Add to strategies table (already has type field)
// Ensure all 8 strategies are properly seeded

// Add index for performance
// CREATE INDEX idx_trades_strategy_time ON trades(strategyId, entryTime);
// CREATE INDEX idx_equity_strategy_date ON equityCurve(strategyId, date);
```

### API Contract Design

#### Core Endpoints (New/Enhanced)

**1. Portfolio Overview**
```
GET /api/trpc/portfolio.overview
Input: { timeRange: "YTD" | "1Y" | "3Y" | "5Y" | "ALL", startingCapital: number }
Output: {
  equityCurve: { date, portfolio, spy }[],
  drawdownCurve: { date, portfolio, spy }[],
  metrics: {
    portfolio: { totalReturn, annualizedReturn, sharpe, maxDrawdown, ... },
    spy: { totalReturn, annualizedReturn, sharpe, maxDrawdown, ... }
  },
  breakdown: {
    daily: { portfolio, spy },
    weekly: { portfolio, spy },
    monthly: { portfolio, spy },
    quarterly: { portfolio, spy },
    ytd: { portfolio, spy }
  }
}
```

**2. Individual Strategy Detail**
```
GET /api/trpc/portfolio.strategyDetail
Input: { strategyId: number, timeRange: string, startingCapital: number }
Output: {
  strategy: { id, name, description, type },
  equityCurve: { date, equity }[],
  drawdownCurve: { date, drawdown }[],
  metrics: { totalReturn, sharpe, maxDrawdown, winRate, ... },
  trades: { recent trades list },
  breakdown: { daily, weekly, monthly performance }
}
```

**3. Strategy Comparison**
```
POST /api/trpc/portfolio.compareStrategies
Input: { 
  strategyIds: number[], 
  timeRange: string, 
  startingCapital: number 
}
Output: {
  individualCurves: { [strategyId]: { date, equity }[] },
  combinedCurve: { date, equity }[],
  correlationMatrix: number[][],
  metrics: {
    combined: { totalReturn, sharpe, maxDrawdown, ... },
    individual: { [strategyId]: { ... } }
  }
}
```

**4. TradingView Webhook**
```
POST /api/webhook/tradingview
Headers: { x-webhook-secret: string }
Input: {
  strategy: string,
  symbol: string,
  side: "long" | "short",
  action: "entry" | "exit",
  price: number,
  quantity: number,
  timestamp: string,
  alertId: string
}
Output: { success: boolean, tradeId?: number, error?: string }
```

---

## Implementation Roadmap

### Phase 1: Foundation & Setup (Current Phase)
**Duration:** 1 day  
**Status:** In Progress

**Tasks:**
1. ✅ Clone GitHub repository
2. ✅ Analyze existing codebase
3. ✅ Document current state
4. ⏳ Create comprehensive project plan
5. ⏳ Set up TASK_LOG.md for AI collaboration
6. ⏳ Initialize project with webdev tools
7. ⏳ Verify all dependencies install correctly

**Deliverables:**
- Comprehensive project plan (this document)
- TASK_LOG.md for AI coordination
- Clean, initialized project structure

---

### Phase 2: Backend API Development
**Duration:** 3-4 days  
**Dependencies:** Phase 1

**Tasks:**

**2.1 Portfolio Overview Enhancements**
- [ ] Extend `portfolio.overview` endpoint with time-range support
- [ ] Add starting capital parameter handling
- [ ] Implement day/week/month/quarter breakdown calculations
- [ ] Add regime-based performance analysis
- [ ] Write unit tests for all calculations
- [ ] Create API contract documentation

**2.2 Individual Strategy Endpoints**
- [ ] Create `portfolio.strategyDetail` endpoint
- [ ] Implement strategy-specific equity curve generation
- [ ] Add strategy-specific metrics calculation
- [ ] Implement trade history filtering
- [ ] Write unit tests
- [ ] Document API contract

**2.3 Strategy Comparison Engine**
- [ ] Create `portfolio.compareStrategies` endpoint
- [ ] Implement correlation matrix calculation
- [ ] Build combined portfolio equity curve logic
- [ ] Add forward-fill logic for non-trading days
- [ ] Implement equal-weight portfolio combination
- [ ] Write comprehensive unit tests
- [ ] Document API contract

**2.4 TradingView Webhook Integration**
- [ ] Create secure webhook endpoint with secret validation
- [ ] Implement trade signal parsing and validation
- [ ] Add database insertion logic
- [ ] Create webhook log entries
- [ ] Implement error handling and retry logic
- [ ] Add webhook testing utilities
- [ ] Document webhook setup guide

**Testing Requirements:**
- [ ] Unit tests for all calculation functions (Sharpe, Sortino, Drawdown, etc.)
- [ ] Integration tests for each API endpoint
- [ ] Property-based tests for portfolio math
- [ ] Webhook security tests
- [ ] Database transaction tests

**Success Criteria:**
- All endpoints return data in documented format
- 100% test coverage for calculation functions
- API response time < 500ms for typical queries
- Webhook processes signals within 1 second

---

### Phase 3: Frontend Development
**Duration:** 4-5 days  
**Dependencies:** Phase 2

**Tasks:**

**3.1 Overview Page Enhancement**
- [ ] Add time-range filter buttons (YTD, 1Y, 3Y, 5Y, All)
- [ ] Add starting capital input field
- [ ] Create main performance chart (Portfolio vs SPY)
- [ ] Build KPI cards (Total Return, Sharpe, Max DD, etc.)
- [ ] Create performance breakdown table (day/week/month)
- [ ] Add drawdown comparison chart
- [ ] Implement loading states
- [ ] Add error handling UI
- [ ] Ensure mobile responsiveness

**3.2 Individual Strategy Page (New)**
- [ ] Create strategy selection/navigation
- [ ] Build strategy detail page layout
- [ ] Add strategy equity curve chart
- [ ] Create strategy metrics dashboard
- [ ] Add recent trades table
- [ ] Implement time-range filtering
- [ ] Add export functionality
- [ ] Ensure mobile responsiveness

**3.3 Strategy Comparison Page (New)**
- [ ] Create strategy multi-select component
- [ ] Build comparison chart with multiple lines
- [ ] Implement combined equity curve visualization
- [ ] Create correlation matrix heatmap
- [ ] Add comparison metrics table
- [ ] Implement forward-fill visualization (continuous lines)
- [ ] Add time-range filtering
- [ ] Ensure mobile responsiveness

**3.4 State Management**
- [ ] Implement global time-range context
- [ ] Add starting capital state management
- [ ] Create loading/error state handlers
- [ ] Implement data caching strategy

**Testing Requirements:**
- [ ] Component unit tests
- [ ] Integration tests for data fetching
- [ ] E2E tests for each page
- [ ] Mobile responsiveness tests
- [ ] Cross-browser compatibility tests

**Success Criteria:**
- All pages load in < 2 seconds
- Charts render smoothly with 1000+ data points
- Mobile experience is seamless
- No console errors or warnings

---

### Phase 4: Testing Infrastructure
**Duration:** 2-3 days  
**Dependencies:** Phase 3

**Tasks:**

**4.1 Unit Testing**
- [ ] Write tests for all backend calculation functions
- [ ] Write tests for all frontend components
- [ ] Achieve 80%+ code coverage
- [ ] Set up coverage reporting

**4.2 Integration Testing**
- [ ] Test all API endpoints with real database
- [ ] Test frontend-backend data flow
- [ ] Test CSV import pipeline
- [ ] Test webhook processing pipeline

**4.3 End-to-End Testing**
- [ ] Write Playwright tests for user journeys:
  - [ ] Login flow
  - [ ] Navigate to Overview page
  - [ ] Change time range and verify chart updates
  - [ ] Navigate to Strategy Comparison
  - [ ] Select strategies and verify combined curve
  - [ ] Export data
- [ ] Set up CI/CD test automation

**4.4 Performance Testing**
- [ ] Load test API endpoints (100 concurrent users)
- [ ] Test database query performance
- [ ] Optimize slow queries
- [ ] Test chart rendering performance

**Success Criteria:**
- All tests pass consistently
- Test suite runs in < 5 minutes
- No flaky tests
- Performance benchmarks met

---

### Phase 5: Monitoring & Observability
**Duration:** 2 days  
**Dependencies:** Phase 4

**Tasks:**

**5.1 Logging Infrastructure**
- [ ] Implement structured JSON logging
- [ ] Add request/response logging
- [ ] Log all errors with stack traces
- [ ] Add performance metrics logging
- [ ] Create log rotation policy

**5.2 Error Tracking**
- [ ] Integrate Sentry (or alternative)
- [ ] Configure error alerting
- [ ] Add custom error boundaries
- [ ] Implement error recovery strategies

**5.3 Health Monitoring**
- [ ] Enhance `/health` endpoint
- [ ] Add database connection checks
- [ ] Add external service checks
- [ ] Create uptime monitoring

**5.4 Analytics**
- [ ] Add user action tracking
- [ ] Track API endpoint usage
- [ ] Monitor query performance
- [ ] Create dashboard for metrics

**Success Criteria:**
- All errors are logged and tracked
- Alerts trigger for critical issues
- Health checks provide accurate status
- Performance metrics are visible

---

### Phase 6: Documentation & Collaboration
**Duration:** 2 days  
**Dependencies:** Phase 5

**Tasks:**

**6.1 API Documentation**
- [ ] Create comprehensive API_CONTRACT.md
- [ ] Document all endpoints with examples
- [ ] Add request/response schemas
- [ ] Include error codes and meanings

**6.2 Code Documentation**
- [ ] Add JSDoc comments to all functions
- [ ] Document complex algorithms
- [ ] Create architecture diagrams
- [ ] Document database schema

**6.3 AI Collaboration System**
- [ ] Create TASK_LOG.md with templates
- [ ] Document workflow for Manus/Codex collaboration
- [ ] Add task tracking sections
- [ ] Create error reporting format

**6.4 User Documentation**
- [ ] Create user guide for dashboard
- [ ] Document TradingView webhook setup
- [ ] Create CSV import guide
- [ ] Add troubleshooting section

**Success Criteria:**
- Any AI can understand the codebase
- All APIs are fully documented
- Setup process is clear and repeatable
- Users can self-serve for common tasks

---

### Phase 7: Deployment & Launch
**Duration:** 1-2 days  
**Dependencies:** Phase 6

**Tasks:**

**7.1 Pre-Deployment Checklist**
- [ ] Run full test suite
- [ ] Verify all environment variables
- [ ] Check database migrations
- [ ] Verify webhook security
- [ ] Test authentication flow

**7.2 Deployment**
- [ ] Deploy to Manus platform
- [ ] Verify health checks
- [ ] Test in production environment
- [ ] Monitor for errors

**7.3 Post-Deployment**
- [ ] Verify all pages load correctly
- [ ] Test webhook integration
- [ ] Monitor performance metrics
- [ ] Create backup procedures

**Success Criteria:**
- Application is live and accessible
- All features work in production
- No critical errors
- Performance meets requirements

---

## Quality Assurance Strategy

### Testing Pyramid

**Level 1: Unit Tests (70% of tests)**
- Test individual functions in isolation
- Mock external dependencies
- Fast execution (< 1 second per test)
- Examples:
  - `calculateSharpeRatio(returns, riskFreeRate)`
  - `forwardFillEquityCurve(data)`
  - `calculateCorrelationMatrix(strategies)`

**Level 2: Integration Tests (20% of tests)**
- Test API endpoints with real database
- Test service layer interactions
- Moderate execution time (< 5 seconds per test)
- Examples:
  - `POST /api/trpc/portfolio.compareStrategies`
  - CSV import pipeline
  - Webhook processing

**Level 3: E2E Tests (10% of tests)**
- Test complete user workflows
- Use real browser automation
- Slower execution (10-30 seconds per test)
- Examples:
  - Login → Overview → Change time range → Verify chart
  - Strategy Comparison → Select 3 strategies → Verify combined curve

### Frontend-Backend Synchronization

**Problem Prevention:**
1. **API Contract as Source of Truth**
   - Document all endpoints before implementation
   - Frontend and backend both reference the contract
   - Use TypeScript types from shared package

2. **Automated Contract Testing**
   - Generate tests from API contract
   - Verify response shapes match contract
   - Fail build if contract is violated

3. **Mock API for Frontend Development**
   - Create mock server with contract-compliant responses
   - Frontend can develop independently
   - Switch to real API when ready

4. **Integration Test Suite**
   - Test every frontend component with real API
   - Verify data flows correctly
   - Catch mismatches early

### Error Handling Strategy

**Backend Error Handling:**
```typescript
// Every API endpoint follows this pattern
try {
  // Business logic
  const result = await calculateMetrics(data);
  return result;
} catch (error) {
  logger.error('Failed to calculate metrics', {
    error: error.message,
    stack: error.stack,
    userId: ctx.user.id,
    timestamp: new Date().toISOString()
  });
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Failed to calculate metrics',
    cause: error
  });
}
```

**Frontend Error Handling:**
```typescript
// Every data fetch follows this pattern
const { data, isLoading, error } = trpc.portfolio.overview.useQuery(params);

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
if (!data) return <NoDataMessage />;

return <Dashboard data={data} />;
```

### Performance Optimization

**Backend:**
1. **Database Indexing**
   - Index on `(userId, strategyId, entryTime)` for trades
   - Index on `(strategyId, date)` for equityCurve
   - Use EXPLAIN to verify query plans

2. **Query Optimization**
   - Pre-calculate equity curves (already in schema)
   - Use database aggregations instead of in-memory
   - Implement pagination for large datasets

3. **Caching**
   - Cache S&P 500 data (rarely changes)
   - Cache calculated metrics for 5 minutes
   - Use Redis if needed for high traffic

**Frontend:**
1. **Code Splitting**
   - Lazy load pages
   - Split vendor bundles
   - Use dynamic imports

2. **Chart Optimization**
   - Downsample data for display (show every Nth point)
   - Use canvas rendering for large datasets
   - Implement virtual scrolling for tables

3. **State Management**
   - Minimize re-renders
   - Use React.memo for expensive components
   - Debounce user inputs

---

## AI Collaboration System

### TASK_LOG.md Structure

```markdown
# AI-to-AI Task & Communication Log

## Open Tasks for AI (Manus/Codex)
- [ ] Task 1: Description
- [ ] Task 2: Description

## In Progress
- [Manus] Task 3: Description (Started: 2025-12-04)

## Completed
- [x] Task 4: Description (Completed: 2025-12-04 by Manus)

## Known Bugs
- BUG-001: Description (Reported: 2025-12-04)

## Questions for Human
- Q1: Should we use equal weighting or custom weighting for combined portfolios?
```

### Communication Protocol

**When Manus Completes Work:**
1. Update TASK_LOG.md with completed tasks
2. Commit to GitHub with message: `[MANUS] Completed: X`
3. Push to main branch
4. Document any blockers or questions

**When Codex/Other AI Works:**
1. Pull latest from GitHub
2. Read TASK_LOG.md for assigned tasks
3. Complete work
4. Update TASK_LOG.md
5. Commit with message: `[CODEX] Completed: X`
6. Push to GitHub

**For Bug Reports:**
1. Add to "Known Bugs" section
2. Include: Description, Steps to Reproduce, Expected vs Actual
3. Assign severity level
4. Link to relevant code/files

---

## Risk Mitigation

### Technical Risks

**Risk 1: Frontend-Backend Mismatch**
- **Mitigation:** API contract documentation + automated contract tests
- **Fallback:** Mock API for independent development

**Risk 2: Performance Issues with Concurrent Users**
- **Mitigation:** Load testing + database optimization + caching
- **Fallback:** Implement rate limiting

**Risk 3: Data Loss from Webhook Failures**
- **Mitigation:** Webhook logging + retry mechanism + manual import fallback
- **Fallback:** CSV import as backup

**Risk 4: Calculation Errors**
- **Mitigation:** Unit tests + property-based tests + manual verification
- **Fallback:** Compare against known benchmarks

### Process Risks

**Risk 1: Scope Creep**
- **Mitigation:** Strict adherence to this plan + phase gates
- **Fallback:** Defer non-critical features to v2

**Risk 2: AI Coordination Issues**
- **Mitigation:** TASK_LOG.md + clear communication protocol
- **Fallback:** Human intervention to resolve conflicts

---

## Success Metrics

### Technical Metrics
- ✅ 100% of API endpoints documented
- ✅ 80%+ code coverage
- ✅ All E2E tests passing
- ✅ API response time < 500ms (p95)
- ✅ Page load time < 2 seconds
- ✅ Zero critical bugs in production

### User Experience Metrics
- ✅ Dashboard loads successfully on mobile and desktop
- ✅ All charts render correctly with 1000+ data points
- ✅ Time-range filters work instantly
- ✅ Webhook processes signals within 1 second
- ✅ CSV import handles 10,000+ trades

### Quality Metrics
- ✅ All calculations match manual verification
- ✅ No frontend-backend sync issues
- ✅ Error tracking captures 100% of errors
- ✅ Documentation is complete and clear

---

## Next Steps

### Immediate Actions (Today)
1. ✅ Complete this comprehensive plan
2. ⏳ Create TASK_LOG.md
3. ⏳ Set up project with webdev_init_project
4. ⏳ Verify dependencies install
5. ⏳ Create API_CONTRACT.md skeleton

### This Week
1. Implement Phase 2 (Backend API Development)
2. Write comprehensive tests for calculations
3. Document all new endpoints
4. Begin Phase 3 (Frontend Development)

### This Month
1. Complete all 7 phases
2. Deploy to production
3. Monitor for issues
4. Iterate based on feedback

---

## Appendix

### Technology Reference

**Frontend Libraries:**
- React 19: https://react.dev
- Vite: https://vitejs.dev
- TailwindCSS: https://tailwindcss.com
- Recharts: https://recharts.org
- tRPC: https://trpc.io

**Backend Libraries:**
- Express: https://expressjs.com
- Drizzle ORM: https://orm.drizzle.team
- Zod: https://zod.dev

**Testing Libraries:**
- Vitest: https://vitest.dev
- Playwright: https://playwright.dev

**Monitoring:**
- Sentry: https://sentry.io

### Calculation Formulas

**Sharpe Ratio:**
```
Sharpe = (Mean Return - Risk Free Rate) / Standard Deviation of Returns
Annualized Sharpe = Sharpe * sqrt(252) for daily data
```

**Sortino Ratio:**
```
Sortino = (Mean Return - Risk Free Rate) / Downside Deviation
Downside Deviation = sqrt(mean(min(0, returns)^2))
```

**Maximum Drawdown:**
```
For each point: Drawdown = (Current Value - Peak Value) / Peak Value
Max Drawdown = min(all drawdowns)
```

**Correlation:**
```
Correlation(A, B) = Covariance(A, B) / (StdDev(A) * StdDev(B))
```

---

**End of Comprehensive Project Plan**

*This document will be updated as the project progresses. All changes will be tracked in Git.*
