CREATE INDEX IF NOT EXISTS "trades_symbol_idx" ON "trades" USING btree ("symbol");
CREATE INDEX IF NOT EXISTS "trades_exit_time_idx" ON "trades" USING btree ("exit_time");
