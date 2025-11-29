import test from "node:test";
import assert from "node:assert/strict";

import { generateTradesCsv } from "../src/engine/portfolio-engine";

test("generateTradesCsv returns csv content with headers", async () => {
  const csv = await generateTradesCsv({ userId: 1 });

  assert.ok(csv.length > 0, "csv should not be empty");
  const header = csv.split("\n")[0]?.toLowerCase() ?? "";
  assert.ok(header.includes("symbol"), "csv includes symbol column");
  assert.ok(header.includes("entry price"), "csv includes entry price column");
});
