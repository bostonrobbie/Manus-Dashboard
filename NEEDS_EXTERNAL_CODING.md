# External Coding Requirements

**Project:** Manus Intraday Strategies Dashboard  
**Created:** December 4, 2025  
**For:** Codex / ChatGPT / External AI Coding  
**Status:** Ready for External Development

---

## 🎯 Purpose

This document lists all tasks that require external coding (via Codex, ChatGPT, or other AI tools) because they are either:
1. Too complex for single-session implementation
2. Require extensive testing and validation
3. Need performance optimization
4. Require infrastructure setup

**Important:** All code must be 100% compatible with the existing Manus Dashboard codebase (React 19, tRPC, MySQL, TypeScript).

---

## 🚨 Critical Requirements

### Data Requirements (BLOCKING)

**Priority: URGENT - Cannot proceed without this**

**1. Strategy Trade Data**
- **What:** Historical trade data for all 8 intraday strategies
- **Format:** CSV files with the following columns:
  ```
  strategyId, strategyName, symbol, side, quantity, entryPrice, exitPrice, entryTime, exitTime
  ```
- **Example:**
  ```csv
  1,Intraday Strategy 1,SPY,long,100,450.25,451.50,2024-01-02 09:30:00,2024-01-02 15:55:00
  1,Intraday Strategy 1,SPY,short,100,452.00,451.25,2024-01-03 09:30:00,2024-01-03 15:55:00
  ```
- **Requirements:**
  - At least 6 months of data per strategy
  - Include winning and losing trades
  - Timestamps in ISO 8601 format or "YYYY-MM-DD HH:MM:SS"
  - All 8 strategies should have data

**2. S&P 500 Benchmark Data**
- **What:** Daily S&P 500 (SPY) price data for comparison
- **Format:** CSV with columns:
  ```
  date, symbol, open, high, low, close, volume
  ```
- **Example:**
  ```csv
  2024-01-02,SPY,475.20,476.50,474.80,476.00,85000000
  2024-01-03,SPY,476.10,477.20,475.50,476.80,82000000
  ```
- **Requirements:**
  - Same date range as strategy data
  - Daily frequency (not intraday)

**3. Strategy Metadata**
- **What:** Information about each of the 8 strategies
- **Format:** JSON or CSV:
  ```json
  [
    {
      "id": 1,
      "name": "Intraday Strategy 1",
      "description": "Brief description of strategy logic",
      "symbol": "SPY",
      "type": "intraday"
    },
    ...
  ]
  ```

**Where to Place Data:**
- Create folder: `/home/ubuntu/Manus-Dashboard/data/seed/`
- Place CSV files there
- Name them: `strategies.csv`, `trades.csv`, `spy_benchmark.csv`

---

## 🔧 Infrastructure & Environment Setup

### 1. Database Configuration

**Status:** Schema exists, needs MySQL instance

**What's Needed:**
- MySQL/TiDB database instance (Manus platform provides this)
- Connection string in `.env` file:
  ```
  DATABASE_URL="mysql://user:password@host:port/database"
  ```

**Current Schema:** Already defined in `drizzle/schema.ts` (MySQL-compatible)

**Tables:**
- ✅ users
- ✅ strategies  
- ✅ trades
- ✅ positions
- ✅ equityCurve
- ✅ analytics
- ✅ benchmarks
- ✅ webhookLogs
- ✅ uploadLogs
- ✅ auditLogs

**Action Required:**
1. Set up MySQL database on Manus platform
2. Run migrations: `pnpm migrate`
3. Verify tables are created

---

### 2. Authentication Setup

**Status:** Framework exists, needs Manus OAuth configuration

**What's Needed:**
- Manus OAuth credentials
- Environment variables:
  ```
  MANUS_MODE=true
  MANUS_AUTH_HEADER_USER=x-manus-user-json
  MANUS_AUTH_HEADER_WORKSPACE=x-manus-workspace-id
  MANUS_JWT_SECRET=<your-secret>
  ```

**Current Implementation:** 
- Auth middleware exists in `server/_core/trpc.ts`
- Uses `protectedProcedure` for authenticated endpoints
- Mock mode available for local development

**Action Required:**
1. Configure Manus OAuth in platform settings
2. Add environment variables
3. Test login flow

---

### 3. TradingView Webhook Secret

**Status:** Endpoint will be implemented, needs secret

**What's Needed:**
- Webhook secret key for security
- Environment variable:
  ```
  TRADINGVIEW_WEBHOOK_SECRET=<your-secret-key>
  ```

**Action Required:**
1. Generate a strong random secret (32+ characters)
2. Add to `.env` file
3. Configure in TradingView alert settings

---

## 💻 Code Implementation Tasks

### Backend Tasks

#### 1. Enhanced Portfolio Overview Endpoint

**File:** `server/routers/portfolio.ts`  
**Endpoint:** `portfolio.overview`  
**Status:** Exists but needs enhancements

**What to Add:**
- [x] Time-range filtering (YTD, 1Y, 3Y, 5Y, ALL)
- [x] Starting capital parameter
- [x] Day/week/month/quarter breakdown calculations
- [ ] **NEEDS EXTERNAL:** Regime analysis (bull/bear/sideways market detection)
- [ ] **NEEDS EXTERNAL:** Advanced risk metrics (VaR, CVaR, Omega ratio)

**Complexity:** Medium  
**Estimated Time:** 4-6 hours  
**Priority:** High

**Implementation Notes:**
```typescript
// Add to input schema
timeRange: z.enum(["YTD", "1Y", "3Y", "5Y", "ALL"]),
startingCapital: z.number().default(100000),

// Calculate time-based breakdowns
const breakdown = {
  daily: calculatePeriodReturn(data, 'day'),
  weekly: calculatePeriodReturn(data, 'week'),
  monthly: calculatePeriodReturn(data, 'month'),
  quarterly: calculatePeriodReturn(data, 'quarter'),
  ytd: calculatePeriodReturn(data, 'ytd')
};
```

---

#### 2. Strategy Detail Endpoint (NEW)

**File:** `server/routers/portfolio.ts`  
**Endpoint:** `portfolio.strategyDetail` (create new)  
**Status:** Does not exist

**What to Build:**
- [ ] **NEEDS EXTERNAL:** Complete endpoint implementation
- [ ] Strategy-specific equity curve generation
- [ ] Strategy-specific metrics calculation
- [ ] Trade history filtering
- [ ] Unit tests

**Complexity:** Medium  
**Estimated Time:** 6-8 hours  
**Priority:** High

**API Spec:** See `API_CONTRACT.md` section 2

**Implementation Outline:**
```typescript
strategyDetail: protectedProcedure
  .input(z.object({
    strategyId: z.number(),
    timeRange: z.enum(["YTD", "1Y", "3Y", "5Y", "ALL"]),
    startingCapital: z.number().default(100000)
  }))
  .query(async ({ input, ctx }) => {
    // 1. Fetch strategy metadata
    // 2. Get trades for this strategy in time range
    // 3. Build equity curve
    // 4. Calculate metrics
    // 5. Get recent trades
    // 6. Return structured response
  })
```

---

#### 3. Strategy Comparison Endpoint (NEW)

**File:** `server/routers/portfolio.ts`  
**Endpoint:** `portfolio.compareStrategies` (create new)  
**Status:** Does not exist

**What to Build:**
- [ ] **NEEDS EXTERNAL:** Complete endpoint implementation
- [ ] Correlation matrix calculation
- [ ] Combined portfolio equity curve (equal-weight)
- [ ] Forward-fill logic for non-trading days
- [ ] Individual and combined metrics
- [ ] Unit tests

**Complexity:** High  
**Estimated Time:** 8-12 hours  
**Priority:** High

**API Spec:** See `API_CONTRACT.md` section 3

**Key Algorithms Needed:**
1. **Forward-Fill Algorithm:**
   ```typescript
   function forwardFill(data: EquityPoint[]): EquityPoint[] {
     // Create complete date range
     // For each date, use last known value if missing
     // Ensures continuous line on charts
   }
   ```

2. **Correlation Matrix:**
   ```typescript
   function calculateCorrelation(strategies: Strategy[]): number[][] {
     // Calculate daily returns for each strategy
     // Compute pairwise correlation coefficients
     // Return NxN matrix
   }
   ```

3. **Combined Portfolio:**
   ```typescript
   function combineStrategies(strategies: Strategy[], weights: number[]): EquityCurve {
     // For each date, sum weighted returns
     // Build combined equity curve
     // Calculate combined metrics
   }
   ```

---

#### 4. TradingView Webhook Endpoint (NEW)

**File:** `server/routers/webhooks.ts` or create `server/webhook-handler.ts`  
**Endpoint:** `POST /api/webhook/tradingview`  
**Status:** Schema exists, endpoint needs implementation

**What to Build:**
- [ ] **NEEDS EXTERNAL:** Secure webhook endpoint
- [ ] Secret token validation
- [ ] Trade signal parsing
- [ ] Database insertion
- [ ] Webhook logging
- [ ] Error handling
- [ ] Integration tests

**Complexity:** Medium  
**Estimated Time:** 6-8 hours  
**Priority:** High

**API Spec:** See `API_CONTRACT.md` Webhook section

**Security Requirements:**
- Validate `x-webhook-secret` header
- Reject invalid/malformed payloads
- Log all attempts (success and failure)
- Rate limiting (prevent abuse)

**Implementation Outline:**
```typescript
app.post('/api/webhook/tradingview', async (req, res) => {
  // 1. Validate secret
  // 2. Parse payload
  // 3. Validate trade data
  // 4. Insert into trades table
  // 5. Log to webhookLogs
  // 6. Return success/error
});
```

---

### Frontend Tasks

#### 1. Enhanced Overview Page

**File:** `client/src/pages/Overview.tsx`  
**Status:** Exists but needs enhancements

**What to Add:**
- [ ] **NEEDS EXTERNAL:** Time-range filter buttons (YTD, 1Y, 3Y, 5Y, All)
- [ ] **NEEDS EXTERNAL:** Starting capital input field
- [ ] **NEEDS EXTERNAL:** Performance breakdown table
- [ ] **NEEDS EXTERNAL:** Drawdown comparison chart
- [ ] Mobile responsiveness improvements

**Complexity:** Medium  
**Estimated Time:** 6-8 hours  
**Priority:** High

**UI Components Needed:**
```typescript
<TimeRangeSelector 
  value={timeRange} 
  onChange={setTimeRange} 
  options={["YTD", "1Y", "3Y", "5Y", "ALL"]} 
/>

<StartingCapitalInput 
  value={capital} 
  onChange={setCapital} 
/>

<PerformanceBreakdownTable 
  data={breakdown} 
/>

<DrawdownChart 
  portfolioData={portfolioDrawdown} 
  benchmarkData={spyDrawdown} 
/>
```

---

#### 2. Individual Strategy Page (NEW)

**File:** `client/src/pages/StrategyDetail.tsx` (create new)  
**Status:** Does not exist

**What to Build:**
- [ ] **NEEDS EXTERNAL:** Complete page implementation
- [ ] Strategy selector/navigation
- [ ] Equity curve chart
- [ ] Metrics dashboard
- [ ] Recent trades table
- [ ] Time-range filtering
- [ ] Mobile responsive layout

**Complexity:** High  
**Estimated Time:** 8-10 hours  
**Priority:** High

**Page Structure:**
```typescript
export default function StrategyDetail() {
  const { strategyId } = useParams();
  const [timeRange, setTimeRange] = useState("1Y");
  const [capital, setCapital] = useState(100000);
  
  const { data, isLoading, error } = trpc.portfolio.strategyDetail.useQuery({
    strategyId: Number(strategyId),
    timeRange,
    startingCapital: capital
  });
  
  return (
    <div>
      <StrategyHeader strategy={data.strategy} />
      <TimeRangeSelector />
      <EquityChart data={data.equityCurve} />
      <MetricsGrid metrics={data.metrics} />
      <TradesTable trades={data.recentTrades} />
    </div>
  );
}
```

---

#### 3. Strategy Comparison Page (NEW)

**File:** `client/src/pages/StrategyComparison.tsx` (create new)  
**Status:** Does not exist

**What to Build:**
- [ ] **NEEDS EXTERNAL:** Complete page implementation
- [ ] Multi-select strategy picker (2-4 strategies)
- [ ] Multi-line equity chart (individual + combined)
- [ ] Correlation matrix heatmap
- [ ] Comparison metrics table
- [ ] Time-range filtering
- [ ] Mobile responsive layout

**Complexity:** Very High  
**Estimated Time:** 12-16 hours  
**Priority:** High

**Key Components:**
```typescript
<StrategyMultiSelect 
  strategies={allStrategies}
  selected={selectedIds}
  onChange={setSelectedIds}
  min={2}
  max={4}
/>

<ComparisonChart 
  individualCurves={data.individualCurves}
  combinedCurve={data.combinedCurve}
  colors={STRATEGY_COLORS}
/>

<CorrelationHeatmap 
  matrix={data.correlationMatrix}
  strategyNames={strategyNames}
/>

<ComparisonMetricsTable 
  combined={data.combinedMetrics}
  individual={data.individualMetrics}
/>
```

**Chart Requirements:**
- Use different colors for each strategy
- Combined curve should be thicker/distinct
- Continuous lines (no gaps) - forward-fill applied
- Interactive legend (show/hide strategies)
- Responsive to screen size

---

### Testing Tasks

#### 1. Backend Unit Tests

**Files:** `server/tests/*.test.ts`  
**Status:** Some tests exist, need comprehensive coverage

**What to Build:**
- [ ] **NEEDS EXTERNAL:** Unit tests for all calculation functions
- [ ] **NEEDS EXTERNAL:** Tests for Sharpe, Sortino, Calmar ratios
- [ ] **NEEDS EXTERNAL:** Tests for correlation calculations
- [ ] **NEEDS EXTERNAL:** Tests for forward-fill logic
- [ ] **NEEDS EXTERNAL:** Tests for portfolio combination

**Complexity:** Medium  
**Estimated Time:** 8-10 hours  
**Priority:** High

**Example Test:**
```typescript
import { describe, it, expect } from 'vitest';
import { calculateSharpeRatio } from '../portfolio-engine';

describe('calculateSharpeRatio', () => {
  it('should calculate correct Sharpe ratio', () => {
    const returns = [0.01, 0.02, -0.01, 0.03, 0.01];
    const riskFreeRate = 0.02;
    const result = calculateSharpeRatio(returns, riskFreeRate);
    expect(result).toBeCloseTo(1.48, 2);
  });
  
  it('should handle negative Sharpe ratio', () => {
    const returns = [-0.01, -0.02, -0.01, -0.03, -0.01];
    const riskFreeRate = 0.02;
    const result = calculateSharpeRatio(returns, riskFreeRate);
    expect(result).toBeLessThan(0);
  });
});
```

---

#### 2. Integration Tests

**Files:** `server/tests/integration/*.test.ts`  
**Status:** Need to create

**What to Build:**
- [ ] **NEEDS EXTERNAL:** API endpoint tests with real database
- [ ] **NEEDS EXTERNAL:** CSV import pipeline tests
- [ ] **NEEDS EXTERNAL:** Webhook processing tests
- [ ] **NEEDS EXTERNAL:** Authentication flow tests

**Complexity:** High  
**Estimated Time:** 10-12 hours  
**Priority:** Medium

---

#### 3. E2E Tests

**Files:** `e2e/*.spec.ts`  
**Status:** Basic structure exists, need comprehensive tests

**What to Build:**
- [ ] **NEEDS EXTERNAL:** Login flow test
- [ ] **NEEDS EXTERNAL:** Overview page navigation test
- [ ] **NEEDS EXTERNAL:** Time-range filter test
- [ ] **NEEDS EXTERNAL:** Strategy comparison test
- [ ] **NEEDS EXTERNAL:** Mobile responsiveness test

**Complexity:** High  
**Estimated Time:** 8-10 hours  
**Priority:** Medium

**Example E2E Test:**
```typescript
import { test, expect } from '@playwright/test';

test('user can compare strategies', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Strategy Comparison');
  
  // Select 3 strategies
  await page.click('[data-testid="strategy-1"]');
  await page.click('[data-testid="strategy-2"]');
  await page.click('[data-testid="strategy-3"]');
  
  // Verify chart appears
  await expect(page.locator('[data-testid="comparison-chart"]')).toBeVisible();
  
  // Verify combined curve is shown
  await expect(page.locator('text=Combined Portfolio')).toBeVisible();
  
  // Verify correlation matrix
  await expect(page.locator('[data-testid="correlation-matrix"]')).toBeVisible();
});
```

---

## 🎨 UI/UX Enhancements

### 1. Chart Library Optimization

**Current:** Using Recharts  
**Issue:** May be slow with 1000+ data points

**Options:**
- [ ] **NEEDS EXTERNAL:** Optimize Recharts with data downsampling
- [ ] **NEEDS EXTERNAL:** Consider switching to Plotly.js or Chart.js
- [ ] **NEEDS EXTERNAL:** Implement canvas rendering for large datasets

**Complexity:** Medium  
**Estimated Time:** 6-8 hours  
**Priority:** Medium

---

### 2. Mobile Responsiveness

**Current:** Some pages are responsive, needs comprehensive review

**What to Test:**
- [ ] **NEEDS EXTERNAL:** All pages on mobile (320px - 768px width)
- [ ] **NEEDS EXTERNAL:** Charts render correctly on small screens
- [ ] **NEEDS EXTERNAL:** Tables are scrollable/collapsible
- [ ] **NEEDS EXTERNAL:** Navigation menu works on mobile

**Complexity:** Medium  
**Estimated Time:** 4-6 hours  
**Priority:** High

---

### 3. Loading States & Error Handling

**Current:** Basic implementation exists

**What to Enhance:**
- [ ] **NEEDS EXTERNAL:** Skeleton loaders for all pages
- [ ] **NEEDS EXTERNAL:** Error boundaries for chart components
- [ ] **NEEDS EXTERNAL:** Retry logic for failed API calls
- [ ] **NEEDS EXTERNAL:** User-friendly error messages

**Complexity:** Low  
**Estimated Time:** 3-4 hours  
**Priority:** Medium

---

## 🔍 Performance Optimization

### 1. Database Query Optimization

**What to Do:**
- [ ] **NEEDS EXTERNAL:** Add indexes to frequently queried columns
- [ ] **NEEDS EXTERNAL:** Optimize equity curve queries
- [ ] **NEEDS EXTERNAL:** Use database aggregations instead of in-memory calculations
- [ ] **NEEDS EXTERNAL:** Implement query result caching

**Indexes Needed:**
```sql
CREATE INDEX idx_trades_strategy_time ON trades(strategyId, entryTime);
CREATE INDEX idx_trades_user_strategy ON trades(userId, strategyId);
CREATE INDEX idx_equity_strategy_date ON equityCurve(strategyId, date);
CREATE INDEX idx_benchmarks_symbol_date ON benchmarks(symbol, date);
```

**Complexity:** Medium  
**Estimated Time:** 4-6 hours  
**Priority:** High

---

### 2. Frontend Performance

**What to Do:**
- [ ] **NEEDS EXTERNAL:** Implement React.memo for expensive components
- [ ] **NEEDS EXTERNAL:** Use useMemo for complex calculations
- [ ] **NEEDS EXTERNAL:** Lazy load pages with React.lazy
- [ ] **NEEDS EXTERNAL:** Optimize bundle size (code splitting)

**Complexity:** Medium  
**Estimated Time:** 4-6 hours  
**Priority:** Medium

---

## 📊 Monitoring & Logging

### 1. Error Tracking Setup

**Tool:** Sentry (recommended) or alternative

**What to Do:**
- [ ] **NEEDS EXTERNAL:** Set up Sentry account
- [ ] **NEEDS EXTERNAL:** Install Sentry SDK
- [ ] **NEEDS EXTERNAL:** Configure error tracking
- [ ] **NEEDS EXTERNAL:** Set up alert rules

**Environment Variables:**
```
SENTRY_DSN=<your-sentry-dsn>
SENTRY_ENVIRONMENT=production
```

**Complexity:** Low  
**Estimated Time:** 2-3 hours  
**Priority:** Medium

---

### 2. Structured Logging

**Current:** Basic console.log usage

**What to Enhance:**
- [ ] **NEEDS EXTERNAL:** Implement structured JSON logging
- [ ] **NEEDS EXTERNAL:** Add request/response logging
- [ ] **NEEDS EXTERNAL:** Log all errors with context
- [ ] **NEEDS EXTERNAL:** Set up log aggregation (optional)

**Complexity:** Medium  
**Estimated Time:** 4-6 hours  
**Priority:** Medium

---

## 🚀 Deployment Tasks

### 1. Environment Configuration

**What to Provide:**
- [ ] **NEEDS EXTERNAL:** Production `.env` file with all variables
- [ ] **NEEDS EXTERNAL:** Database connection string
- [ ] **NEEDS EXTERNAL:** OAuth credentials
- [ ] **NEEDS EXTERNAL:** Webhook secrets

**Required Environment Variables:**
```bash
# Database
DATABASE_URL=mysql://user:password@host:port/database

# Authentication
MANUS_MODE=true
MANUS_AUTH_HEADER_USER=x-manus-user-json
MANUS_AUTH_HEADER_WORKSPACE=x-manus-workspace-id
MANUS_JWT_SECRET=<secret>

# Webhooks
TRADINGVIEW_WEBHOOK_SECRET=<secret>

# Monitoring (optional)
SENTRY_DSN=<dsn>
SENTRY_ENVIRONMENT=production

# Application
NODE_ENV=production
PORT=3001
```

---

### 2. Database Migration

**What to Do:**
- [ ] **NEEDS EXTERNAL:** Run migrations on production database
- [ ] **NEEDS EXTERNAL:** Seed initial data (strategies, admin user)
- [ ] **NEEDS EXTERNAL:** Verify all tables are created
- [ ] **NEEDS EXTERNAL:** Import historical trade data

**Commands:**
```bash
# Run migrations
pnpm migrate

# Seed data (create script)
pnpm db:seed:production
```

---

### 3. Deployment to Manus Platform

**What to Do:**
- [ ] **NEEDS EXTERNAL:** Build production bundle
- [ ] **NEEDS EXTERNAL:** Deploy to Manus platform
- [ ] **NEEDS EXTERNAL:** Verify health checks pass
- [ ] **NEEDS EXTERNAL:** Test authentication flow
- [ ] **NEEDS EXTERNAL:** Monitor for errors

**Commands:**
```bash
# Build
pnpm build

# Start production server
pnpm start
```

---

## 📝 Documentation Tasks

### 1. User Documentation

**What to Create:**
- [ ] **NEEDS EXTERNAL:** User guide for dashboard
- [ ] **NEEDS EXTERNAL:** TradingView webhook setup guide
- [ ] **NEEDS EXTERNAL:** CSV import guide
- [ ] **NEEDS EXTERNAL:** Troubleshooting guide

**Complexity:** Low  
**Estimated Time:** 4-6 hours  
**Priority:** Low

---

### 2. Developer Documentation

**What to Create:**
- [ ] **NEEDS EXTERNAL:** Setup instructions for new developers
- [ ] **NEEDS EXTERNAL:** Architecture diagrams
- [ ] **NEEDS EXTERNAL:** Database schema documentation
- [ ] **NEEDS EXTERNAL:** API examples and use cases

**Complexity:** Medium  
**Estimated Time:** 6-8 hours  
**Priority:** Low

---

## 🎯 Priority Summary

### 🔴 URGENT (Blocking)
1. ✅ Strategy trade data (CSV)
2. ✅ S&P 500 benchmark data (CSV)
3. ✅ Strategy metadata (JSON/CSV)
4. Database setup on Manus platform
5. Authentication configuration

### 🟠 HIGH PRIORITY (Core Features)
1. Strategy Detail endpoint implementation
2. Strategy Comparison endpoint implementation
3. Enhanced Overview page
4. Individual Strategy page
5. Strategy Comparison page
6. TradingView webhook endpoint
7. Backend unit tests
8. Database query optimization

### 🟡 MEDIUM PRIORITY (Quality)
1. Integration tests
2. E2E tests
3. Mobile responsiveness review
4. Error tracking setup
5. Performance optimization
6. Structured logging

### 🟢 LOW PRIORITY (Nice to Have)
1. User documentation
2. Developer documentation
3. Advanced UI enhancements
4. Additional metrics (VaR, CVaR, etc.)

---

## 📞 Questions & Clarifications Needed

### Strategy Configuration
1. **Q:** What are the names of your 8 intraday strategies?
2. **Q:** Do all strategies trade the same symbol (SPY) or different symbols?
3. **Q:** What is the typical holding period for intraday strategies? (hours? minutes?)
4. **Q:** Should we support fractional shares or only whole shares?

### Portfolio Combination
1. **Q:** For strategy comparison, should we use equal weighting (default) or allow custom weights?
2. **Q:** Should the combined portfolio rebalance daily or maintain fixed weights?

### Performance Metrics
1. **Q:** What risk-free rate should we use for Sharpe/Sortino calculations? (default: 2% annual)
2. **Q:** Should we calculate metrics on daily returns or trade-level returns?
3. **Q:** Do you want regime analysis (bull/bear market detection)? If yes, what criteria?

### TradingView Integration
1. **Q:** What format will TradingView alerts use? (JSON? specific fields?)
2. **Q:** Should we support both entry and exit signals, or only entries?
3. **Q:** How should we handle partial fills or multiple fills for one signal?

### Deployment
1. **Q:** What is your preferred deployment schedule? (continuous? weekly updates?)
2. **Q:** Do you need staging environment for testing before production?
3. **Q:** What are your uptime requirements? (99%? 99.9%?)

---

## 🔗 Compatibility Checklist

### Technology Stack Compatibility
- ✅ React 19 (latest)
- ✅ TypeScript 5.9+
- ✅ Node.js 22.13.0
- ✅ pnpm 8.15.8
- ✅ MySQL/TiDB (Manus platform)
- ✅ tRPC for API
- ✅ Drizzle ORM
- ✅ Vite for bundling
- ✅ TailwindCSS for styling
- ✅ Recharts for visualization

### Manus Platform Compatibility
- ✅ MySQL syntax (not PostgreSQL)
- ✅ camelCase column names
- ✅ Two-role auth (admin/user)
- ✅ Manus OAuth integration
- ✅ Single-tenant architecture
- ✅ Health check endpoints
- ✅ No workspace tables

### Code Quality Standards
- ✅ TypeScript strict mode
- ✅ ESLint configuration
- ✅ Prettier formatting
- ✅ Vitest for testing
- ✅ Playwright for E2E
- ✅ Type-safe API with tRPC

---

## 📦 Deliverables Expected from External Coding

### Code Files
1. Enhanced `server/routers/portfolio.ts` with new endpoints
2. New `client/src/pages/StrategyDetail.tsx`
3. New `client/src/pages/StrategyComparison.tsx`
4. Comprehensive test files in `server/tests/`
5. E2E test files in `e2e/`
6. Database seed scripts in `server/scripts/`

### Documentation
1. Updated `API_CONTRACT.md` with implemented endpoints
2. `TRADINGVIEW_SETUP.md` webhook guide
3. `USER_GUIDE.md` for dashboard usage
4. Updated `README.md` with new features

### Data Files
1. `data/seed/strategies.csv`
2. `data/seed/trades.csv`
3. `data/seed/spy_benchmark.csv`

### Configuration
1. Production `.env.example` with all variables
2. Database migration scripts
3. Deployment instructions

---

## 🚀 Getting Started for External Developers

### 1. Clone Repository
```bash
git clone https://github.com/bostonrobbie/Manus-Dashboard.git
cd Manus-Dashboard
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Set Up Environment
```bash
cp .env.example .env
# Edit .env with your values
```

### 4. Run Development Servers
```bash
# Terminal 1: Backend
pnpm --filter server dev

# Terminal 2: Frontend
pnpm --filter client dev
```

### 5. Run Tests
```bash
pnpm test:all
```

### 6. Check Code Quality
```bash
pnpm lint
pnpm typecheck
```

---

## 📋 Task Tracking

Use `TASK_LOG.md` to track progress on these tasks. Update the log when:
- Starting a task
- Completing a task
- Encountering blockers
- Discovering bugs

---

**End of External Coding Requirements**

*This document will be updated as tasks are completed and new requirements emerge.*
