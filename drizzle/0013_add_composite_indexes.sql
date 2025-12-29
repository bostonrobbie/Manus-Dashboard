-- Add composite indexes for performance optimization
-- These indexes improve query performance for common access patterns

-- Trades: composite index for time-range queries by strategy
CREATE INDEX IF NOT EXISTS idx_trades_strategy_entry_exit ON trades (strategyId, entryDate, exitDate);

-- Trades: index for source filtering
CREATE INDEX IF NOT EXISTS idx_trades_source ON trades (source);

-- Webhook logs: composite index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_webhook_logs_strategy_created ON webhook_logs (strategyId, createdAt);

-- Webhook logs: composite index for status filtering with time
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status_created ON webhook_logs (status, createdAt);
