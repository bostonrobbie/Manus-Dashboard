# Portfolio Engine

`server/src/engine/portfolio-engine.ts` is the canonical implementation. It:

- Loads strategies, trades, and benchmark closes either from PostgreSQL (via Drizzle) or from baked-in sample data.
- Builds aggregated equity curves with swing, intraday, combined, and benchmark tracks.
- Derives drawdown series, strategy-level metrics, and high-level portfolio summaries.
- Exposes helper functions (`buildAggregatedEquityCurve`, `buildDrawdownCurves`, `buildStrategyComparison`, `buildPortfolioSummary`, `loadTrades`, `loadStrategies`) used by tRPC routers.

All computations are deterministic and typed end-to-end through `shared/types/portfolio.ts`.
