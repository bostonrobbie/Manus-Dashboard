import { eq } from "drizzle-orm";

import { getDb, schema } from "@server/db";
import type { StrategyType } from "@shared/types/portfolio";

type CsvRecord = Record<string, string>;
type StrategyRecord = { id: number; name: string; type: StrategyType | null };

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

export interface IngestTradesResult {
  rowsParsed: number;
  insertedTrades: number;
  skippedRows: number;
  strategiesCreated: number;
}

export interface IngestTradesOptions {
  csv: string;
  userId: number;
  defaultStrategyName?: string;
  defaultStrategyType?: StrategyType;
}

export async function ingestTradesCsv(options: IngestTradesOptions): Promise<IngestTradesResult> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not configured");
  }

  const records = parseCsvRecords(options.csv);
  const normalizedRows: NormalizedTradeRow[] = [];

  for (const record of records) {
    const normalized = normalizeRecord(record, options.defaultStrategyName, options.defaultStrategyType);
    if (normalized) {
      normalizedRows.push(normalized);
    }
  }

  const existingStrategies = await db
    .select({ id: schema.strategies.id, name: schema.strategies.name, type: schema.strategies.type })
    .from(schema.strategies)
    .where(eq(schema.strategies.userId, options.userId));
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

  let strategiesCreated = 0;
  if (requiredStrategies.size > 0) {
    const inserted = await db
      .insert(schema.strategies)
      .values(
        Array.from(requiredStrategies.entries()).map(([name, type]) => ({
          userId: options.userId,
          name,
          type,
          description: "Imported from CSV",
        })),
      )
      .returning();

    strategiesCreated = inserted.length;
    for (const strat of inserted) {
      strategiesByName.set(strat.name, strat);
      strategiesById.set(strat.id, strat);
    }
  }

  const tradesToInsert = normalizedRows.map(row => {
    const strategyIdFromRow = row.strategyId && strategiesById.has(row.strategyId) ? row.strategyId : undefined;
    const strategyId =
      strategyIdFromRow ??
      strategiesByName.get(row.strategyName)?.id ??
      strategiesByName.get(options.defaultStrategyName ?? "Imported")?.id;

    if (!strategyId) {
      throw new Error(`Unable to resolve strategy for trade ${row.symbol}`);
    }

    return {
      userId: options.userId,
      strategyId,
      symbol: row.symbol,
      side: row.side,
      quantity: row.quantity.toString(),
      entryPrice: row.entryPrice.toString(),
      exitPrice: row.exitPrice.toString(),
      entryTime: row.entryTime,
      exitTime: row.exitTime,
    };
  });

  if (tradesToInsert.length > 0) {
    await db.insert(schema.trades).values(tradesToInsert);
  }

  return {
    rowsParsed: records.length,
    insertedTrades: tradesToInsert.length,
    skippedRows: records.length - tradesToInsert.length,
    strategiesCreated,
  };
}

function parseCsvRecords(csv: string): CsvRecord[] {
  const rows = parseCsv(csv);
  if (rows.length === 0) return [];

  const headers = rows[0];
  const records: CsvRecord[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row.some(cell => cell.trim() !== "")) continue;
    const rec: CsvRecord = {};
    headers.forEach((header, idx) => {
      const key = header.trim().toLowerCase();
      rec[key] = row[idx] ?? "";
    });
    records.push(rec);
  }
  return records;
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
  defaultStrategyName?: string,
  defaultStrategyType?: StrategyType,
): NormalizedTradeRow | null {
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const value = record[key.toLowerCase()];
      if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
    }
    return undefined;
  };

  const symbol = pick("symbol", "ticker", "asset");
  const sideRaw = pick("side", "position", "direction");
  const quantity = toNumber(pick("quantity", "qty", "size"));
  const entryPrice = toNumber(pick("entryPrice", "entry_price", "buyPrice", "openPrice"));
  const exitPrice = toNumber(pick("exitPrice", "exit_price", "sellPrice", "closePrice"));
  const entryTimeStr = pick("entryTime", "entry_time", "entry", "openTime", "open_time");
  const exitTimeStr = pick("exitTime", "exit_time", "exit", "closeTime", "close_time");
  const strategyName = pick("strategy", "strategyName", "system") ?? defaultStrategyName ?? "Imported";
  const strategyTypeRaw = (pick("strategyType", "type") ?? defaultStrategyType) as StrategyType | undefined;
  const strategyId = toNumber(pick("strategyId", "strategy_id"));

  if (!symbol || !sideRaw || quantity == null || entryPrice == null || exitPrice == null || !entryTimeStr || !exitTimeStr) {
    return null;
  }

  const entryTime = toDate(entryTimeStr);
  const exitTime = toDate(exitTimeStr);
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

function toNumber(value?: string): number | null {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

