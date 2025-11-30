# Admin Data Manager

The Admin Data Manager page is available only to users with admin/owner roles. It provides a workspace-level view of uploads
and quick maintenance tools for soft deleting trades or benchmarks.

## Using the UI

- Open **Admin Data** in the navigation (visible only for admin roles).
- Review the workspace summary table for trade/benchmark counts (soft-deleted rows are excluded) and the last upload timestamp.
- Select a workspace to unlock three tools:
  - **Uploads tab**: lists upload logs. Choose **Soft delete data** to mark rows created by that upload as deleted.
  - **Trades tab**: filter by symbol and exit date range, then soft delete matching trades.
  - **Benchmarks tab**: filter by symbol/date range to soft delete benchmark rows.
- Actions display a confirmation prompt and surface a banner describing the result.

## Soft delete behavior

- Trades and benchmarks include a `deleted_at` column. Portfolio queries, analytics, and workspace counts ignore rows with a
  populated `deleted_at`.
- Soft deletions are idempotent and logged (the originating upload record is annotated in `warnings_summary`).
- Re-ingesting data for the same workspace will create fresh rows; previously deleted rows remain for audit history but stay
  excluded from analytics.
