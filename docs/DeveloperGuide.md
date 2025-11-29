# Developer Guide

## Loading real trades

1. Place one or more CSV files inside `server/data/`. Each file name becomes the default strategy name for its trades.
2. Ensure the CSV header contains these columns (case-insensitive):
   - `symbol`
   - `side` (long/short)
   - `quantity`
   - `entryPrice`
   - `exitPrice`
   - `entryTime` (ISO timestamp)
   - `exitTime` (ISO timestamp)
   - Optional: `strategy`, `strategyId`, `strategyType` (swing|intraday)
3. With `DATABASE_URL` set, run `pnpm -C server load:trades` to ingest all CSVs using the shared pipeline.
4. The TRPC mutation `portfolio.uploadTradesCsv` accepts a CSV string for programmatic ingestion; the dashboard will automatically read from the database once trades are present, falling back to samples only when empty.

## CSV ingestion details

- The ingestion pipeline trims whitespace, validates numeric fields, and normalizes timestamps to ISO format.
- Each upload returns a summary object: `{ importedCount, skippedCount, errors }`.
- Invalid rows are skipped (not fatal) and surfaced in the `errors` array with row numbers to aid debugging.

## Smoke test

- Run `pnpm -C server smoke` to exercise the portfolio analytics end-to-end without starting HTTP services.
- Expected output includes finite Sharpe/drawdown values, equity curve point counts, strategy totals, and Monte Carlo median equity. The command exits non-zero if anything is invalid.
