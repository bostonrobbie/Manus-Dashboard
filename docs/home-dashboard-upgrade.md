# Home dashboard upgrade

This repository now includes a configurable Home dashboard experience that surfaces portfolio KPIs, equity charts, and strategy stats in a consistent layout.

## Layout config
- Configuration lives in `client/src/config/dashboardLayoutConfig.ts`.
- Each section declares an `id`, `title`, `componentKey`, `defaultOrder`, and `defaultSize` to drive the render order and sizing.
- To rearrange sections, edit the `dashboardSections` array and adjust `defaultOrder` or `visibleByDefault`.
- A TODO is in place to add user-specific layouts with drag-and-drop in a later phase.

## Components
- `PortfolioEquityChart` renders a normalized equity curve with a top-left stats panel.
- `StatsPanel` is a reusable KPI block that can display Sharpe, drawdown, win rate, or trade counts.
- `StrategyStatsTable` lists strategy-level performance metrics.
- `StrategyEquityGrid` shows small multiples of per-strategy equity curves.

## New page
- `client/src/pages/HomeDashboardPage.tsx` consumes existing tRPC analytics endpoints to display portfolio summary, equity, strategy stats, and simple alerts.
- The page uses the shared `dashboardSections` config and a component map, so updates to the layout only require changing the config file.
- Navigation now points to the Home dashboard by default, while the previous performance overview remains available at `/overview`.
