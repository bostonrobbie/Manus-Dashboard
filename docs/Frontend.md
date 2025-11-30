# Frontend

- **Stack**: React 19, Vite, TailwindCSS, @tanstack/react-query, and tRPC client bindings.
- **Entry**: `client/src/main.tsx` wires the tRPC client, React Query, and renders `<App />`.
- **Routing/Layout**: The dashboard is a single-page experience composed by `DashboardLayout` plus the Overview, Strategies, Trades, Uploads, Settings/Health, and Admin Data pages.
- **Data Fetching**: All data is fetched through tRPC hooks defined in `client/src/lib/trpc.ts` and generated from the server `AppRouter` type.
- **Components**:
  - `RollingMetrics` shows portfolio KPIs.
  - `ChartSkeleton` renders simple lists of equity and drawdown points.
  - `StrategyComparison` and `TradesTable` display tabular analytics.
  - The Overview/Strategies/Trades pages now consume backend metrics for KPIs, sparklines, drawdowns, and histograms via the vendor-wrapped Recharts components.

Run `pnpm --filter client dev` to start the Vite dev server.

Front-end tests are not yet wired. When adding React Testing Library/Vitest later, start with a smoke test that mocks the portfolio tRPC client and asserts that Overview renders the KPI strip and equity series counts for a synthetic dataset.

The former dashboard under `app/` is preserved only for reference and is not part of the supported frontend.
