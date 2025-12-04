import assert from "node:assert/strict";
import test from "node:test";

import { parseStrategiesCsv } from "@server/scripts/seedStrategiesFromCsv";
import { parseTradesCsv } from "@server/scripts/seedTradesFromCsv";
import { parseSpyBenchmarkCsv } from "@server/scripts/seedSpyBenchmarkFromCsv";

test("parseStrategiesCsv maps seed rows", () => {
  const csv = "id,name,description,symbol,type\n1,Alpha,Mean reversion,SPY,intraday";
  const [row] = parseStrategiesCsv(csv);
  assert.equal(row.id, 1);
  assert.equal(row.name, "Alpha");
  assert.equal(row.description, "Mean reversion");
  assert.equal(row.symbol, "SPY");
  assert.equal(row.type, "intraday");
});

test("parseTradesCsv counts records", () => {
  const csv = "symbol,side,quantity,entryPrice,exitPrice,entryTime,exitTime,strategy\nSPY,long,10,1,2,2024-01-01,2024-01-02,Alpha";
  const count = parseTradesCsv(csv);
  assert.equal(count, 1);
});

test("parseSpyBenchmarkCsv normalizes rows", () => {
  const csv = "date,symbol,close,open,high,low,volume\n2024-01-01,SPY,100,99,101,98,1000000";
  const [row] = parseSpyBenchmarkCsv(csv);
  assert.equal(row.date, "2024-01-01");
  assert.equal(row.symbol, "SPY");
  assert.equal(row.close, 100);
  assert.equal(row.open, "99");
});
