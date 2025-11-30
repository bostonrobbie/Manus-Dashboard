import test from "node:test";
import assert from "node:assert/strict";

import { portfolioRouter } from "@server/routers/portfolio";
import { generateTradesCsv } from "../src/engine/portfolio-engine";

const user = { id: 1, email: "test@example.com", workspaceId: 1, source: "local" as const };
const baseCtx = { user, auth: { mode: "local" as const, user, mock: true } } as any;

test("generateTradesCsv returns csv content with headers", async () => {
  const csv = await generateTradesCsv({ userId: 1 });

  assert.ok(csv.length > 0, "csv should not be empty");
  const [headerLine, ...rows] = csv.split("\n");
  const header = headerLine?.toLowerCase() ?? "";
  assert.ok(header.includes("symbol"), "csv includes symbol column");
  assert.ok(header.includes("entry price"), "csv includes entry price column");
  assert.ok(rows.some(line => line.toLowerCase().includes("aapl")), "csv includes known trade symbol");
});

test("generateTradesCsv respects filters", async () => {
  const fullCsv = await generateTradesCsv({ userId: 1 });
  const filteredCsv = await generateTradesCsv({ userId: 1, startDate: "2024-01-12" });

  const fullRows = fullCsv.split("\n").filter(Boolean);
  const filteredRows = filteredCsv.split("\n").filter(Boolean);

  assert.ok(filteredRows.length < fullRows.length, "filtered csv should have fewer rows");
});

test("exportTradesCsv mutation returns CSV payload", async () => {
  const caller = portfolioRouter.createCaller(baseCtx);
  const response = await caller.exportTradesCsv({});

  assert.equal(response.filename, "trades-export.csv");
  assert.equal(response.mimeType, "text/csv");
  assert.ok(response.content.length > 0);
  assert.ok(response.content.toLowerCase().includes("symbol"));
});
