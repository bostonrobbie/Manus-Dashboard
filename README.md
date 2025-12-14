# Manus Intraday Strategies Dashboard

A production-ready, scalable dashboard for tracking and analyzing intraday trading strategies with comprehensive analytics, real-time webhook integration, and institutional-grade quality assurance.

**Status:** ✅ Quality-first hardening in progress
**Version:** 1.0.0
**Last Updated:** March 2026

---

## 🎯 Project Overview

This dashboard provides professional-grade portfolio analytics for 8 intraday trading strategies, featuring:

- **Portfolio Overview** - Combined performance vs S&P 500 with time-range filtering
- **Individual Strategy Analysis** - Detailed metrics and equity curves for each strategy
- **Strategy Comparison** - Multi-strategy correlation analysis and combined portfolios
- **TradingView Integration** - Automated trade signal capture via webhooks
- **Comprehensive Testing** - Unit, integration, and E2E tests for reliability
- **Production Monitoring** - Error tracking, logging, and health checks

---

## 📋 Key Documentation

### For Developers
- **[COMPREHENSIVE_PROJECT_PLAN.md](./COMPREHENSIVE_PROJECT_PLAN.md)** - Complete 7-phase development roadmap
- **[API_CONTRACT.md](./API_CONTRACT.md)** - Full API documentation with schemas
- **[TASK_LOG.md](./TASK_LOG.md)** - AI collaboration and task tracking
- **[NEEDS_EXTERNAL_CODING.md](./NEEDS_EXTERNAL_CODING.md)** - ⚠️ **Tasks requiring external development**
- **[MANUS_REQUIREMENTS.md](./MANUS_REQUIREMENTS.md)** - Manus platform compatibility guide

### Quick Links
- **Repository:** https://github.com/bostonrobbie/Manus-Dashboard
- **Tech Stack:** React 19 + Vite + TypeScript + tRPC + MySQL + TailwindCSS
- **Testing:** Vitest + Playwright
- **Deployment:** Manus Platform

### Navigation Highlights
- **Portfolio Overview** (`/overview`): equity vs SPY, drawdowns, KPIs, and breakdowns with time range + starting capital controls.
- **Strategy Detail** (`/strategies/:strategyId`): per-strategy equity, drawdowns, metrics grid, recent trades, and breakdowns.
- **Strategy Comparison** (`/compare`): select 2–4 strategies to view combined/individual curves, correlations, and metrics.
- **Visual Analytics** (`/analytics`): heatmaps, return calendars, and Monte Carlo outputs backed by live tRPC calls.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 22.13.0+
- pnpm 8.15.8+
- MySQL/TiDB database (provided by Manus platform)

### Installation

```bash
# Clone repository
git clone https://github.com/bostonrobbie/Manus-Dashboard.git
cd Manus-Dashboard

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your database and auth credentials
# Example local database string (MySQL/TiDB):
# DATABASE_URL=mysql://user:password@localhost:3306/manus_dashboard
```

### Development

```bash
# Run backend (port 3001)
pnpm --filter server dev

# Run frontend (port 5173) - in another terminal
pnpm --filter client dev

# Lint code
pnpm lint

# Type check
pnpm typecheck
```

### Local development and data

```bash
# Seed the demo dataset (uses sample CSVs; safe for local/dev)
pnpm db:seed:demo

# Start the API and webhook server (mock user enabled by default)
pnpm --filter server dev

# In another terminal, start the frontend (points at the API automatically)
pnpm --filter client dev
```

> Tip: The backend falls back to bundled sample data when `DATABASE_URL` is not set, so you can explore the UI without a Manus database. Seeding provides richer charts for the E2E flow.

### Production Build

```bash
# Build all packages
pnpm build

# Start production server
pnpm start
```

### Database Seeding

- Demo dataset: `pnpm db:seed:demo` (small) or `pnpm db:seed:large` (stress testing).
- CSV-driven seeds (place CSVs in `data/seed/`):
  - `pnpm seed:strategies`
  - `pnpm seed:trades`
  - `pnpm seed:benchmarks`
  - `pnpm seed:all` (runs the three in order)

### Build & Test

```bash
pnpm lint
pnpm typecheck
pnpm test:server
pnpm test:client
pnpm test:all
pnpm build

# Backend coverage
pnpm --filter server test:coverage
# Frontend coverage
pnpm --filter client test:coverage
# Local Playwright E2E (auto-starts preview + mock-friendly API)
pnpm e2e:local
```

Notes:
- Ingestion specs that require a real database stay skipped under the mock DB; core Vitest suites run locally.
- Use the workspace test commands as-is (no extra Vitest flags like `--runInBand` are required or supported).
- `pnpm test:all` bundles linting, typing, and both server/client test runs for CI-style checks.

E2E details:
- `pnpm e2e:local` builds the client, starts a local preview on `http://localhost:4173`, boots the API on `http://localhost:3002` with mock auth, and runs Playwright against the preview.
- `pnpm e2e` keeps the same defaults but respects `E2E_BASE_URL` if you already have a running preview.
- `pnpm e2e:manus` enables Manus headers for against-platform runs (requires Manus env vars).
- Local E2E runs use Playwright web servers plus mocked tRPC responses so no Manus headers or database are required. (Preview port: 4173; API port used for tests: 3002.)

### Monthly snapshots
- A scheduled GitHub Action tags the latest `main` on the first of each month at 09:00 UTC.
- Tag format: `snapshot-YYYY-MM-DD`.
- To restore a backup locally: `git checkout snapshot-2025-01-01` (replace with the desired date) and install dependencies as usual.

---

## 📁 Project Structure

```
Manus-Dashboard/
├── client/                 # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities
│   └── public/            # Static assets
├── server/                # Express + tRPC backend
│   ├── routers/           # tRPC API routers
│   ├── services/          # Business logic
│   ├── engine/            # Portfolio analytics engine
│   ├── tests/             # Backend tests
│   └── scripts/           # Utility scripts
├── drizzle/               # Database schema & migrations
│   ├── schema.ts          # MySQL schema
│   └── migrations/        # Auto-generated migrations
├── shared/                # Shared TypeScript types
├── e2e/                   # Playwright E2E tests
├── docs/                  # Additional documentation
└── data/                  # Seed data (⚠️ TO BE ADDED)
    └── seed/
        ├── strategies.csv
        ├── trades.csv
        └── spy_benchmark.csv
```

### High-level architecture

- **Frontend:** React + Vite SPA served from `client/`, calling tRPC endpoints and rendering Recharts-based analytics.
- **Backend:** Express server in `server/` exposing tRPC routers and RESTful webhook endpoints, with structured logging and monitoring hooks.
- **Database:** MySQL schema managed via Drizzle (`drizzle/schema.ts`), including indexes for trades and equity curve queries.
- **Webhooks:** TradingView webhook (`POST /api/webhook/tradingview`) normalizes trade signals and records audit logs.

```
[Browser]
   ↓ (tRPC + REST)
[Client @4173] ──────→ [Server @3001] ──────→ [MySQL/TiDB]
                         ↑
              TradingView webhook (signed)
```

### Deployment

- Refer to [DeploymentToManus.md](./DeploymentToManus.md) for environment variables, migration/boot commands, and health contract.
- Production flow: build with `pnpm build`, run migrations with `pnpm migrate`, then start the server via `pnpm --filter server start` on Manus.

---

## 🔑 Key Features

### ✅ Implemented
- Portfolio overview with equity curves
- Trade ingestion from CSV
- Benchmark data management (S&P 500)
- Monte Carlo simulation
- Rolling metrics calculation
- Export functionality
- Admin data manager
- Health check endpoints
- Comprehensive database schema
- Authentication framework (Manus OAuth)
- Webhook logging infrastructure
- TradingView webhook endpoint with secret validation

### 🚧 In Development (See NEEDS_EXTERNAL_CODING.md)
- Individual strategy detail pages
- Strategy comparison with correlation analysis
- Time-range filtering (YTD, 1Y, 3Y, 5Y, All)
- Combined equity curves for multiple strategies
- Comprehensive test suite
- Production monitoring and logging

### 📋 Planned
- Regime analysis (bull/bear/sideways)
- Advanced risk metrics (VaR, CVaR)
- Real-time dashboard updates
- Mobile app (React Native)
- Strategy optimization tools

---

## 📡 TradingView Webhook

- **Endpoint:** `POST /api/webhook/tradingview`
- **Headers:** `x-webhook-secret: <TRADINGVIEW_WEBHOOK_SECRET>`
- **Notes:** Payloads should include entry/exit prices and timestamps (payloads without those fields are rejected).

**Example Payload**

```json
{
  "strategyName": "Intraday Strategy 1",
  "symbol": "SPY",
  "side": "long",
  "quantity": 100,
  "entryPrice": 450.25,
  "exitPrice": 451.5,
  "entryTime": "2025-01-02T14:30:00Z",
  "exitTime": "2025-01-02T20:00:00Z",
  "alertId": "alert_12345",
  "note": "TV alert payload"
}
```

---

## 🗄️ Database Schema

### Core Tables
- **users** - User authentication and roles
- **strategies** - Strategy definitions (swing/intraday)
- **trades** - Historical trade data with deduplication
- **positions** - Current open positions
- **equityCurve** - Pre-calculated equity data for performance
- **analytics** - Rolling metrics and statistics
- **benchmarks** - S&P 500 comparison data
- **webhookLogs** - TradingView webhook event tracking
- **uploadLogs** - CSV import audit trail
- **auditLogs** - System action logging

All tables use MySQL syntax with camelCase column names for Manus platform compatibility.

---

## 🧪 Testing

### Test Coverage
- **Unit Tests:** Backend calculation functions (Sharpe, Sortino, drawdown, etc.)
- **Integration Tests:** API endpoints with database
- **E2E Tests:** Complete user workflows with Playwright
- **Property Tests:** Portfolio math validation

### Running Tests

```bash
# All tests
pnpm test:all

# Backend tests only
pnpm --filter server test

# E2E tests
pnpm e2e

# With coverage
pnpm --filter server test --coverage
```

---

## 📊 API Endpoints

### Portfolio
- `trpc.portfolio.overview` - Portfolio vs benchmark analytics
- `trpc.portfolio.strategyDetail` - Individual strategy details (🚧 in development)
- `trpc.portfolio.compareStrategies` - Multi-strategy comparison (🚧 in development)
- `trpc.portfolio.exportTrades` - Export trade data as CSV

### Webhooks
- `POST /api/webhook/tradingview` - TradingView alert integration (🚧 in development)

### System
- `GET /health` - Basic health check
- `GET /health/full` - Detailed health with database status
- `GET /version` - Application version info

See **[API_CONTRACT.md](./API_CONTRACT.md)** for complete API documentation.

---

## 🔐 Authentication

Uses Manus OAuth for authentication. Two roles supported:
- **admin** - Full access to all features
- **user** - Read-only dashboard access

### Environment Variables
```bash
MANUS_MODE=true
MANUS_AUTH_HEADER_USER=x-manus-user-json
MANUS_AUTH_HEADER_WORKSPACE=x-manus-workspace-id
MANUS_JWT_SECRET=<your-secret>
```

For local development, set `MOCK_USER_ENABLED=true` to bypass authentication.

---

## 🚀 Deployment

### Manus Platform

1. **Set Environment Variables**
   ```bash
   DATABASE_URL=mysql://user:password@host:port/database
   MANUS_MODE=true
   MANUS_JWT_SECRET=<secret>
   TRADINGVIEW_WEBHOOK_SECRET=<secret>
   ```

2. **Run Migrations**
   ```bash
   pnpm migrate
   ```

3. **Build and Deploy**
   ```bash
   pnpm build
   pnpm start
   ```

4. **Verify Health**
   ```bash
   curl https://your-domain.manus.app/health
   ```

---

## ⚠️ CRITICAL: Data Requirements

**Before development can proceed, we need:**

1. **Strategy Trade Data** (CSV format)
   - Historical trades for all 8 intraday strategies
   - Columns: strategyId, strategyName, symbol, side, quantity, entryPrice, exitPrice, entryTime, exitTime
   - At least 6 months of data per strategy

2. **S&P 500 Benchmark Data** (CSV format)
   - Daily SPY price data
   - Columns: date, symbol, open, high, low, close, volume
   - Same date range as strategy data

3. **Strategy Metadata** (JSON or CSV)
   - Names and descriptions of all 8 strategies
   - Symbol traded, strategy type

**See [NEEDS_EXTERNAL_CODING.md](./NEEDS_EXTERNAL_CODING.md) for complete requirements.**

---

## 🐛 Troubleshooting

### Common Issues

**Database Connection Failed**
- Verify `DATABASE_URL` is correct
- Check database is running and accessible
- Ensure MySQL (not PostgreSQL) syntax is used

**Authentication Errors**
- Verify Manus OAuth is configured
- Check `MANUS_JWT_SECRET` is set
- For local dev, enable `MOCK_USER_ENABLED=true`

**Build Errors**
- Run `pnpm install` to ensure dependencies are up to date
- Check Node.js version (requires 22.13.0+)
- Run `pnpm typecheck` to identify TypeScript errors

---

## 📞 Support & Contribution

### Reporting Issues
- GitHub Issues: https://github.com/bostonrobbie/Manus-Dashboard/issues
- Include: Error message, steps to reproduce, expected vs actual behavior

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `pnpm test:all`
5. Submit a pull request

### AI Collaboration
See **[TASK_LOG.md](./TASK_LOG.md)** for AI-to-AI coordination protocol.

---

## 📜 License

Proprietary - All rights reserved

---

## 🙏 Acknowledgments

Built with:
- React 19 & Vite
- tRPC for type-safe APIs
- Drizzle ORM for database
- TailwindCSS for styling
- Recharts for visualization
- Vitest & Playwright for testing

Deployed on Manus Platform

---

**Next Steps:** See **[NEEDS_EXTERNAL_CODING.md](./NEEDS_EXTERNAL_CODING.md)** for tasks requiring external development (Codex/ChatGPT).
