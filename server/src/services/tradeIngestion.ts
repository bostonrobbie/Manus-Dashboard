import { and, eq } from "drizzle-orm";

import { getDb, schema } from "@server/db";
import type { StrategyType } from "@shared/types/portfolio";
import type { IngestionHeaderIssues, IngestionResult } from "@shared/types/ingestion";
import { createUploadLog, updateUploadLog } from "./uploadLogs";
import { createLogger } from "@server/utils/logger";
import { logAudit } from "@server/services/audit";

const logger = createLogger("ingestion");

type CsvRecord = Record<string, string>;
type StrategyRecord = { id: number; name: string; type: StrategyType | null; workspaceId?: number };

export interface WebhookTrade {
  strategyId?: number;
  strategyName?: string;
  strategyType?: StrategyType;
  symbol: string;
  side: string;
  quantity: number;
  executionPrice: number;
  timestamp: string | number;
  externalId?: string;
  notes?: string;
}

interface NormalizedTradeRow {
  strategyName: string;
  strategyType?: StrategyType;
  strategyId?: number;
  externalId?: string;
  naturalKey: string;
  symbol: string;
  side: string;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  entryTime: Date;
  exitTime: Date;
}

export interface IngestTradesOptions {
  csv: string;
  userId: number;
  workspaceId: number;
  defaultStrategyName?: string;
  defaultStrategyType?: StrategyType;
  fileName?: string;
}

const REQUIRED_FIELDS: Array<{ label: string; keys: string[] }> = [
  { label: "symbol", keys: ["symbol", "ticker", "asset"] },
  { label: "side", keys: ["side", "position", "direction"] },
  { label: "quantity", keys: ["quantity", "qty", "size"] },
  { label: "entry price", keys: ["entryprice", "entry_price", "buyprice", "openprice"] },
  { label: "exit price", keys: ["exitprice", "exit_price", "sellprice", "closeprice"] },
  { label: "entry time", keys: ["entrytime", "entry_time", "entry", "opentime", "open_time"] },
  { label: "exit time", keys: ["exittime", "exit_time", "exit", "closetime", "close_time"] },
];

const OPTIONAL_FIELDS = [
  "strategy",
  "strategyname",
  "system",
  "strategytype",
  "type",
  "strategyid",
  "strategy_id",
  "external_id",
  "trade_id",
];
const normalizeHeaderKey = (key: string) => key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

const ALLOWED_HEADERS = new Set(
  REQUIRED_FIELDS.flatMap(field => field.keys.map(normalizeHeaderKey)).concat(OPTIONAL_FIELDS.map(normalizeHeaderKey)),
);

export async function ingestTradesCsv(options: IngestTradesOptions): Promise<IngestionResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { headers, records } = parseCsvRecords(options.csv);
  const totalRows = records.length;

  const uploadLog = await createUploadLog({
    userId: options.userId,
    workspaceId: options.workspaceId,
    fileName: options.fileName ?? "trades.csv",
    uploadType: "trades",
  });

  logger.info("Trade ingestion start", {
    eventName: "INGEST_TRADES_START",
    userId: options.userId,
    workspaceId: options.workspaceId,
    totalRows,
    uploadId: uploadLog?.id,
  });

  const headerIssues = validateHeaders(headers);
  if (headerIssues.missing.length > 0) {
    errors.push(`Missing required columns: ${headerIssues.missing.join(", ")}`);
    await persistUploadLog(uploadLog, {
      rowCountTotal: totalRows,
      rowCountFailed: totalRows,
      status: "failed",
      errorSummary: summarizeIssues(errors),
      warningsSummary: summarizeIssues(warnings),
    });
    return {
      importedCount: 0,
      skippedCount: totalRows,
      failedCount: totalRows,
      errors,
      warnings,
      uploadId: uploadLog?.id,
      headerIssues,
    };
  }

  const normalizedRows: NormalizedTradeRow[] = [];
  let failedCount = 0;

  for (const [idx, record] of records.entries()) {
    const rowNumber = idx + 2; // account for header row
    const rowErrors: string[] = [];
    const rowWarnings: string[] = [];
    const normalized = normalizeRecord(
      record,
      rowNumber,
      rowErrors,
      options.defaultStrategyName,
      options.defaultStrategyType,
    );
    if (normalized) {
      if (validateTradeRow(normalized, rowNumber, rowErrors, rowWarnings)) {
        normalizedRows.push(normalized);
        warnings.push(...rowWarnings);
      }
    }
    if (rowErrors.length > 0) {
      failedCount += 1;
      errors.push(...rowErrors);
    }
    if (rowWarnings.length > 0 && !normalized) {
      warnings.push(...rowWarnings);
    }
  }

  const db = await getDb();
  if (!db) {
    errors.push("Database not configured");
    failedCount = totalRows;
    logger.error("Trade ingestion failed before DB access", { eventName: "INGEST_TRADES_FAILED", uploadId: uploadLog?.id });
    await persistUploadLog(uploadLog, {
      rowCountTotal: totalRows,
      rowCountFailed: totalRows,
      status: "failed",
      errorSummary: summarizeIssues(errors),
      warningsSummary: summarizeIssues(warnings),
    });
    return { importedCount: 0, skippedCount: totalRows, failedCount, errors, warnings, uploadId: uploadLog?.id };
  }

  const existingStrategies = await db
    .select({
      id: schema.strategies.id,
      name: schema.strategies.name,
      type: schema.strategies.type,
      workspaceId: schema.strategies.workspaceId,
    })
    .from(schema.strategies)
    .where(and(eq(schema.strategies.userId, options.userId), eq(schema.strategies.workspaceId, options.workspaceId)));
  const strategiesByName = new Map<string, StrategyRecord>(
    existingStrategies.map((s: StrategyRecord): [string, StrategyRecord] => [s.name, s]),
  );
  const strategiesById = new Map<number, StrategyRecord>(
    existingStrategies.map((s: StrategyRecord): [number, StrategyRecord] => [s.id, s]),
  );

  const requiredStrategies = new Map<string, StrategyType>();
  for (const row of normalizedRows) {
    const name = row.strategyName;
    const type = row.strategyType ?? options.defaultStrategyType ?? "swing";
    if (!strategiesByName.has(name)) {
      requiredStrategies.set(name, type);
    }
  }

  if (requiredStrategies.size > 0) {
    const inserted = await db
      .insert(schema.strategies)
      .values(
        Array.from(requiredStrategies.entries()).map(([name, type]) => ({
          userId: options.userId,
          workspaceId: options.workspaceId,
          name,
          type,
          description: "Imported from CSV",
        })),
      )
      .returning();

    for (const strat of inserted) {
      strategiesByName.set(strat.name, strat);
      strategiesById.set(strat.id, strat);
    }
  }

  let insertedCount = 0;
  let dedupedCount = 0;

  const tradesToInsert = normalizedRows.flatMap(row => {
    const strategyIdFromRow = row.strategyId && strategiesById.has(row.strategyId) ? row.strategyId : undefined;
    const strategyId =
      strategyIdFromRow ??
      strategiesByName.get(row.strategyName)?.id ??
      strategiesByName.get(options.defaultStrategyName ?? "Imported")?.id;

    if (!strategyId) {
      failedCount += 1;
      errors.push(`Row with symbol ${row.symbol}: unable to resolve strategy`);
      return [];
    }

    return [
      {
        userId: options.userId,
        workspaceId: options.workspaceId,
        strategyId,
        symbol: row.symbol,
        side: row.side,
        quantity: row.quantity.toString(),
        entryPrice: row.entryPrice.toString(),
        exitPrice: row.exitPrice.toString(),
        entryTime: row.entryTime,
        exitTime: row.exitTime,
        externalId: row.externalId,
        naturalKey: row.naturalKey,
        uploadId: uploadLog?.id,
      },
    ];
  });

  if (tradesToInsert.length > 0) {
    const inserter = db.insert(schema.trades).values(tradesToInsert) as any;
    let inserted: Array<{ id: number }> = [];

    if (typeof inserter.onConflictDoNothing === "function") {
      inserted = await inserter
        .onConflictDoNothing({ target: [schema.trades.workspaceId, schema.trades.naturalKey] })
        .returning({ id: schema.trades.id });
    } else if (typeof inserter.returning === "function") {
      inserted = await inserter.returning({ id: schema.trades.id });
    }

    insertedCount = inserted.length || tradesToInsert.length;
    dedupedCount = Math.max(0, tradesToInsert.length - insertedCount);
    if (dedupedCount > 0) {
      warnings.push(`${dedupedCount} trades skipped due to duplicate natural keys`);
    }
  }

  const skippedCount = totalRows - insertedCount;
  const status = insertedCount === 0 ? "failed" : errors.length > 0 ? "partial" : "success";

  await persistUploadLog(uploadLog, {
    rowCountTotal: totalRows,
    rowCountImported: insertedCount,
    rowCountFailed: failedCount || skippedCount,
    status,
    errorSummary: summarizeIssues(errors),
    warningsSummary: summarizeIssues(warnings),
  });

  logger.info("Trade ingestion end", {
    eventName: "INGEST_TRADES_END",
    uploadId: uploadLog?.id,
    imported: insertedCount,
    skipped: skippedCount,
    failedCount,
    status,
    workspaceId: options.workspaceId,
    userId: options.userId,
  });

  await logAudit({
    action: "upload_trades",
    userId: options.userId,
    workspaceId: options.workspaceId,
    entityType: "upload",
    entityId: uploadLog?.id,
    summary: `Trades upload ${status}: imported ${insertedCount}/${totalRows}`,
  });

  return {
    importedCount: insertedCount,
    skippedCount,
    failedCount: failedCount || skippedCount,
    errors,
    warnings,
    uploadId: uploadLog?.id,
    headerIssues,
  };
}

export async function ingestWebhookTrade(options: {
  userId: number;
  workspaceId: number;
  trade: WebhookTrade;
  uploadLabel?: string;
}) {
  const errors: string[] = [];
  const trade = options.trade;

  const parsedTimestamp = parseTimestamp(trade.timestamp);
  if (!parsedTimestamp) {
    errors.push("Invalid timestamp provided");
    return { inserted: false, errors };
  }

  const entryTime = parsedTimestamp;

  if (!trade.symbol) errors.push("Symbol is required");
  if (!trade.side) errors.push("Side is required");
  if (!Number.isFinite(trade.quantity)) errors.push("Quantity is required");
  if (!Number.isFinite(trade.executionPrice)) errors.push("Execution price is required");

  if (errors.length > 0) {
    return { inserted: false, errors };
  }

  const uploadLog = await createUploadLog({
    userId: options.userId,
    workspaceId: options.workspaceId,
    fileName: options.uploadLabel ?? "tradingview-webhook",
    uploadType: "trades",
  });

  const db = await getDb();
  if (!db) {
    errors.push("Database not configured");
    await persistUploadLog(uploadLog, {
      rowCountTotal: 1,
      rowCountFailed: 1,
      status: "failed",
      errorSummary: summarizeIssues(errors),
    });
    return { inserted: false, errors, uploadId: uploadLog?.id };
  }

  const normalizedSide = normalizeSide(trade.side);
  const naturalKey = [
    (trade.strategyId ?? trade.strategyName ?? "").toString().toLowerCase(),
    trade.symbol.toUpperCase(),
    normalizedSide,
    Number(trade.quantity).toFixed(4),
    Number(trade.executionPrice).toFixed(4),
    entryTime.toISOString(),
    entryTime.toISOString(),
  ].join("|");

  const existingStrategies = (await db
    .select({
      id: schema.strategies.id,
      name: schema.strategies.name,
      type: schema.strategies.type,
      workspaceId: schema.strategies.workspaceId,
    })
    .from(schema.strategies)
    .where(and(eq(schema.strategies.userId, options.userId), eq(schema.strategies.workspaceId, options.workspaceId)))) as StrategyRecord[];

  const strategyById = new Map(existingStrategies.map((s: StrategyRecord) => [s.id, s] as const));
  const strategyByName = new Map(existingStrategies.map((s: StrategyRecord) => [s.name.toLowerCase(), s] as const));

  let strategyId = trade.strategyId;
  if (strategyId && !strategyById.has(strategyId)) {
    errors.push("Strategy does not belong to workspace");
  }

  if (!strategyId) {
    const key = trade.strategyName?.toLowerCase();
    if (key && strategyByName.has(key)) {
      strategyId = strategyByName.get(key)!.id;
    }
  }

  if (!strategyId) {
    const [created] = await db
      .insert(schema.strategies)
      .values({
        userId: options.userId,
        workspaceId: options.workspaceId,
        name: trade.strategyName ?? "Webhook strategy",
        type: trade.strategyType ?? "swing",
        description: trade.notes ?? "TradingView webhook",
      })
      .returning();
    strategyId = created.id;
  }

  if (errors.length > 0) {
    await persistUploadLog(uploadLog, {
      rowCountTotal: 1,
      rowCountFailed: 1,
      status: "failed",
      errorSummary: summarizeIssues(errors),
    });
    return { inserted: false, errors, uploadId: uploadLog?.id };
  }

  const [inserted] = await db
    .insert(schema.trades)
    .values({
      userId: options.userId,
      workspaceId: options.workspaceId,
      strategyId: strategyId!,
      symbol: trade.symbol,
      side: normalizedSide,
      quantity: trade.quantity.toString(),
      entryPrice: trade.executionPrice.toString(),
      exitPrice: trade.executionPrice.toString(),
      entryTime,
      exitTime: entryTime,
      externalId: trade.externalId,
      naturalKey,
      uploadId: uploadLog?.id,
    })
    .onConflictDoNothing({ target: [schema.trades.workspaceId, schema.trades.naturalKey] })
    .returning({ id: schema.trades.id });

  const importedCount = inserted ? 1 : 0;
  await persistUploadLog(uploadLog, {
    rowCountTotal: 1,
    rowCountImported: importedCount,
    rowCountFailed: 0,
    status: importedCount ? "success" : "partial",
    warningsSummary: importedCount ? null : "Duplicate trade skipped",
  });

  return { inserted: Boolean(inserted), uploadId: uploadLog?.id, naturalKey, externalId: trade.externalId, strategyId };
}

function parseCsvRecords(csv: string): { headers: string[]; records: CsvRecord[] } {
  const rows = parseCsv(csv);
  if (rows.length === 0) return { headers: [], records: [] };

  const headers = rows[0].map(header => header.trim());
  const records: CsvRecord[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row.some(cell => cell.trim() !== "")) continue;
    const rec: CsvRecord = {};
    headers.forEach((header, idx) => {
      const key = normalizeHeaderKey(header);
      rec[key] = (row[idx] ?? "").trim();
    });
    records.push(rec);
  }
  return { headers, records };
}

function parseTimestamp(value: string | number | undefined): Date | null {
  if (value == null) return null;
  if (typeof value === "number") {
    const ms = value > 1e12 ? value : value * 1000;
    const parsed = new Date(ms);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = Date.parse(String(value));
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
}

function parseCsv(csv: string): string[][] {
  const lines = csv.split(/\r?\n/).filter(line => line.trim() !== "");
  const rows: string[][] = [];
  for (const line of lines) {
    rows.push(parseCsvLine(line));
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);

  return values.map(v => v.trim());
}

function normalizeRecord(
  record: CsvRecord,
  rowNumber: number,
  errors: string[],
  defaultStrategyName?: string,
  defaultStrategyType?: StrategyType,
): NormalizedTradeRow | null {
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const normalizedKey = normalizeHeaderKey(key);
      const value = record[normalizedKey];
      if (value !== undefined && value !== null) {
        const trimmed = String(value).trim();
        if (trimmed !== "") return trimmed;
      }
    }
    return undefined;
  };

  const symbol = pick("symbol", "ticker", "asset");
  const sideRaw = pick("side", "position", "direction");
  const quantity = toNumber(pick("quantity", "qty", "size"), "quantity", rowNumber, errors);
  const entryPrice = toNumber(
    pick("entryPrice", "entry_price", "buyPrice", "openPrice"),
    "entry price",
    rowNumber,
    errors,
  );
  const exitPrice = toNumber(pick("exitPrice", "exit_price", "sellPrice", "closePrice"), "exit price", rowNumber, errors);
  const entryTimeStr = pick("entryTime", "entry_time", "entry", "openTime", "open_time");
  const exitTimeStr = pick("exitTime", "exit_time", "exit", "closeTime", "close_time");
  const strategyName = pick("strategy", "strategyName", "system") ?? defaultStrategyName ?? "Imported";
  const strategyTypeRaw = (pick("strategyType", "type") ?? defaultStrategyType) as StrategyType | undefined;
  const strategyId = toNumber(pick("strategyId", "strategy_id"), "strategy id", rowNumber, errors, true);
  const externalId = pick("external_id", "trade_id", "id");

  if (!symbol || !sideRaw || quantity == null || entryPrice == null || exitPrice == null || !entryTimeStr || !exitTimeStr) {
    errors.push(`Row ${rowNumber}: missing required field(s)`);
    return null;
  }

  const entryTime = toDate(entryTimeStr, rowNumber, errors, "entry time");
  const exitTime = toDate(exitTimeStr, rowNumber, errors, "exit time");
  if (!entryTime || !exitTime) return null;

  const normalizedSide = normalizeSide(sideRaw);
  const normalizedType: StrategyType | undefined =
    strategyTypeRaw === "intraday" ? "intraday" : strategyTypeRaw === "swing" ? "swing" : undefined;

  const naturalKey = [
    (strategyId ?? strategyName ?? "").toString().toLowerCase(),
    symbol.toUpperCase(),
    normalizedSide,
    quantity.toFixed(4),
    entryPrice.toFixed(4),
    exitPrice.toFixed(4),
    entryTime.toISOString(),
    exitTime.toISOString(),
  ].join("|");

  return {
    strategyName,
    strategyType: normalizedType,
    strategyId: strategyId ?? undefined,
    externalId: externalId || undefined,
    naturalKey,
    symbol,
    side: normalizedSide,
    quantity,
    entryPrice,
    exitPrice,
    entryTime,
    exitTime,
  };
}

function normalizeSide(side: string): string {
  const value = side.toLowerCase();
  if (value.includes("short") || value === "sell") return "short";
  return "long";
}

function toNumber(
  value: string | undefined,
  field: string,
  rowNumber: number,
  errors: string[],
  allowUndefined = false,
): number | null {
  if (value == null || value === "") {
    if (allowUndefined) return null;
    errors.push(`Row ${rowNumber}: ${field} is required`);
    return null;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    errors.push(`Row ${rowNumber}: ${field} must be a valid number`);
    return null;
  }
  if (Math.abs(num) > 1_000_000_000) {
    errors.push(`Row ${rowNumber}: ${field} is out of supported range`);
    return null;
  }
  return num;
}

function toDate(value: string | undefined, rowNumber: number, errors: string[], field: string): Date | null {
  if (!value || value.trim() === "") {
    errors.push(`Row ${rowNumber}: ${field} is required`);
    return null;
  }
  const parsed = Date.parse(value.trim());
  if (Number.isNaN(parsed)) {
    errors.push(`Row ${rowNumber}: ${field} is invalid`);
    return null;
  }
  const date = new Date(parsed);
  return new Date(date.toISOString());
}

function validateHeaders(headers: string[]): IngestionHeaderIssues {
  const normalized = headers.map(h => normalizeHeaderKey(h)).filter(Boolean);
  const missing: string[] = [];
  for (const requirement of REQUIRED_FIELDS) {
    const hasField = requirement.keys.some(key => normalized.includes(normalizeHeaderKey(key)));
    if (!hasField) {
      missing.push(requirement.label);
    }
  }

  const unexpected = normalized.filter(header => !ALLOWED_HEADERS.has(header));

  return { missing, unexpected };
}

function validateTradeRow(
  row: NormalizedTradeRow,
  rowNumber: number,
  errors: string[],
  warnings: string[],
): boolean {
  if (!row.symbol || row.symbol.trim().length === 0) {
    errors.push(`Row ${rowNumber}: symbol is required`);
    return false;
  }
  if (/\s/.test(row.symbol)) {
    warnings.push(`Row ${rowNumber}: symbol contains whitespace`);
  }

  if (row.quantity === 0) {
    errors.push(`Row ${rowNumber}: quantity cannot be zero`);
    return false;
  }

  if (!Number.isFinite(row.entryPrice) || !Number.isFinite(row.exitPrice)) {
    errors.push(`Row ${rowNumber}: prices must be finite numbers`);
    return false;
  }

  if (Math.abs(row.entryPrice) > 10_000_000 || Math.abs(row.exitPrice) > 10_000_000) {
    warnings.push(`Row ${rowNumber}: price values appear extreme`);
  }

  const entryYear = row.entryTime.getUTCFullYear();
  const exitYear = row.exitTime.getUTCFullYear();
  if (entryYear < 2000 || exitYear < 2000) {
    warnings.push(`Row ${rowNumber}: date appears far in the past`);
  }
  if (row.exitTime.getTime() < row.entryTime.getTime()) {
    errors.push(`Row ${rowNumber}: exit time precedes entry time`);
    return false;
  }

  const notional = Math.abs(row.entryPrice * row.quantity);
  const pnl = row.side === "short" ? (row.entryPrice - row.exitPrice) * row.quantity : (row.exitPrice - row.entryPrice) * row.quantity;
  if (Number.isFinite(notional) && notional > 0 && Math.abs(pnl) > notional * 10) {
    warnings.push(`Row ${rowNumber}: pnl ${pnl.toFixed(2)} is extreme vs notional`);
  }

  return true;
}

function summarizeIssues(list: string[]): string | null {
  if (!list.length) return null;
  const unique = Array.from(new Set(list));
  return unique.slice(0, 3).join(" | ");
}

async function persistUploadLog(
  uploadLog: Awaited<ReturnType<typeof createUploadLog>>,
  update: Parameters<typeof updateUploadLog>[1],
) {
  if (uploadLog) {
    await updateUploadLog(uploadLog.id, update);
  }
}
