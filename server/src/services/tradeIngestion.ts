import { and, eq } from "drizzle-orm";

import { getDb, schema } from "@server/db";
import type { StrategyType } from "@shared/types/portfolio";
import { createUploadLog, updateUploadLog } from "./uploadLogs";

type CsvRecord = Record<string, string>;
type StrategyRecord = { id: number; name: string; type: StrategyType | null; workspaceId?: number };

interface NormalizedTradeRow {
  strategyName: string;
  strategyType?: StrategyType;
  strategyId?: number;
  symbol: string;
  side: string;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  entryTime: Date;
  exitTime: Date;
}

export interface TradeIngestionResult {
  importedCount: number;
  skippedCount: number;
  errors: string[];
  warnings: string[];
  uploadId?: number;
}

export interface IngestTradesOptions {
  csv: string;
  userId: number;
  workspaceId: number;
  defaultStrategyName?: string;
  defaultStrategyType?: StrategyType;
  fileName?: string;
}

export async function ingestTradesCsv(options: IngestTradesOptions): Promise<TradeIngestionResult> {
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

  const missingRequiredColumns = findMissingRequiredColumns(headers);
  if (missingRequiredColumns.length > 0) {
    errors.push(`Missing required columns: ${missingRequiredColumns.join(", ")}`);
    if (uploadLog) {
      await updateUploadLog(uploadLog.id, {
        rowCountTotal: totalRows,
        rowCountFailed: totalRows,
        status: "failed",
        errorSummary: summarizeIssues(errors),
        warningsSummary: summarizeIssues(warnings),
      });
    }
    return { importedCount: 0, skippedCount: totalRows, errors, warnings, uploadId: uploadLog?.id };
  }

  const normalizedRows: NormalizedTradeRow[] = [];

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
      errors.push(...rowErrors);
    }
    if (rowWarnings.length > 0 && !normalized) {
      warnings.push(...rowWarnings);
    }
  }

  const db = await getDb();
  if (!db) {
    errors.push("Database not configured");
    if (uploadLog) {
      await updateUploadLog(uploadLog.id, {
        rowCountTotal: totalRows,
        rowCountFailed: totalRows,
        status: "failed",
        errorSummary: summarizeIssues(errors),
        warningsSummary: summarizeIssues(warnings),
      });
    }
    return { importedCount: 0, skippedCount: totalRows, errors, warnings, uploadId: uploadLog?.id };
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

  const tradesToInsert = normalizedRows.flatMap(row => {
    const strategyIdFromRow = row.strategyId && strategiesById.has(row.strategyId) ? row.strategyId : undefined;
    const strategyId =
      strategyIdFromRow ??
      strategiesByName.get(row.strategyName)?.id ??
      strategiesByName.get(options.defaultStrategyName ?? "Imported")?.id;

    if (!strategyId) {
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
      },
    ];
  });

  if (tradesToInsert.length > 0) {
    await db.insert(schema.trades).values(tradesToInsert);
  }

  const skippedCount = totalRows - tradesToInsert.length;
  const status = tradesToInsert.length === 0 ? "failed" : errors.length > 0 ? "partial" : "success";

  if (uploadLog) {
    await updateUploadLog(uploadLog.id, {
      rowCountTotal: totalRows,
      rowCountImported: tradesToInsert.length,
      rowCountFailed: skippedCount,
      status,
      errorSummary: summarizeIssues(errors),
      warningsSummary: summarizeIssues(warnings),
    });
  }

  return {
    importedCount: tradesToInsert.length,
    skippedCount,
    errors,
    warnings,
    uploadId: uploadLog?.id,
  };
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
      const key = header.trim().toLowerCase();
      rec[key] = (row[idx] ?? "").trim();
    });
    records.push(rec);
  }
  return { headers, records };
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
      const value = record[key.toLowerCase()];
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
  const entryPrice = toNumber(pick("entryPrice", "entry_price", "buyPrice", "openPrice"), "entry price", rowNumber, errors);
  const exitPrice = toNumber(pick("exitPrice", "exit_price", "sellPrice", "closePrice"), "exit price", rowNumber, errors);
  const entryTimeStr = pick("entryTime", "entry_time", "entry", "openTime", "open_time");
  const exitTimeStr = pick("exitTime", "exit_time", "exit", "closeTime", "close_time");
  const strategyName = pick("strategy", "strategyName", "system") ?? defaultStrategyName ?? "Imported";
  const strategyTypeRaw = (pick("strategyType", "type") ?? defaultStrategyType) as StrategyType | undefined;
  const strategyId = toNumber(pick("strategyId", "strategy_id"), "strategy id", rowNumber, errors, true);

  if (!symbol || !sideRaw || quantity == null || entryPrice == null || exitPrice == null || !entryTimeStr || !exitTimeStr) {
    errors.push(`Row ${rowNumber}: missing required field(s)`);
    return null;
  }

  const entryTime = toDate(entryTimeStr, rowNumber, errors, "entry time");
  const exitTime = toDate(exitTimeStr, rowNumber, errors, "exit time");
  if (!entryTime || !exitTime) return null;

  const normalizedSide = normalizeSide(sideRaw);
  const normalizedType: StrategyType | undefined = strategyTypeRaw === "intraday" ? "intraday" : strategyTypeRaw === "swing" ? "swing" : undefined;

  return {
    strategyName,
    strategyType: normalizedType,
    strategyId: strategyId ?? undefined,
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
  return num;
}

function toDate(value: string | undefined, rowNumber: number, errors: string[], field: string): Date | null {
  if (!value || value.trim() === "") {
    errors.push(`Row ${rowNumber}: ${field} is required`);
    return null;
  }
  const date = new Date(value.trim());
  if (Number.isNaN(date.getTime())) {
    errors.push(`Row ${rowNumber}: ${field} is invalid`);
    return null;
  }
  return new Date(date.toISOString());
}

function findMissingRequiredColumns(headers: string[]): string[] {
  const normalized = headers.map(h => h.trim().toLowerCase());
  const requiredSets: Array<{ label: string; keys: string[] }> = [
    { label: "symbol", keys: ["symbol", "ticker", "asset"] },
    { label: "side", keys: ["side", "position", "direction"] },
    { label: "quantity", keys: ["quantity", "qty", "size"] },
    { label: "entry price", keys: ["entryprice", "entry_price", "buyprice", "openprice"] },
    { label: "exit price", keys: ["exitprice", "exit_price", "sellprice", "closeprice"] },
    { label: "entry time", keys: ["entrytime", "entry_time", "entry", "opentime", "open_time"] },
    { label: "exit time", keys: ["exittime", "exit_time", "exit", "closetime", "close_time"] },
  ];

  const missing: string[] = [];
  for (const requirement of requiredSets) {
    const hasField = requirement.keys.some(key => normalized.includes(key.toLowerCase()));
    if (!hasField) {
      missing.push(requirement.label);
    }
  }
  return missing;
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
