import { eq } from "drizzle-orm";

import { getDb, schema, type Database } from "@server/db";
import type { IngestionHeaderIssues, IngestionResult } from "@shared/types/ingestion";
import { createUploadLog, updateUploadLog } from "./uploadLogs";
import { createLogger } from "@server/utils/logger";

const logger = createLogger("benchmark-ingestion");

export interface IngestBenchmarksOptions {
  csv: string;
  userId: number;
  workspaceId: number;
  fileName?: string;
  defaultSymbol?: string;
}

interface NormalizedBenchmarkRow {
  symbol: string;
  date: string;
  close: number;
}

type CsvRecord = Record<string, string>;

const REQUIRED_FIELDS: Array<{ label: string; keys: string[] }> = [
  { label: "symbol", keys: ["symbol", "ticker"] },
  { label: "date", keys: ["date", "asof", "day"] },
  { label: "close", keys: ["close", "price", "value"] },
];

const OPTIONAL_FIELDS: string[] = [];
const normalizeHeaderKey = (key: string) => key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
const ALLOWED_HEADERS = new Set(
  REQUIRED_FIELDS.flatMap(field => field.keys.map(normalizeHeaderKey)).concat(OPTIONAL_FIELDS.map(normalizeHeaderKey)),
);

export async function ingestBenchmarksCsv(options: IngestBenchmarksOptions): Promise<IngestionResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { headers, records } = parseCsvRecords(options.csv);
  const totalRows = records.length;

  const uploadLog = await createUploadLog({
    userId: options.userId,
    workspaceId: options.workspaceId,
    fileName: options.fileName ?? "benchmarks.csv",
    uploadType: "benchmarks",
  });

  logger.info("Benchmark ingestion start", {
    eventName: "INGEST_BENCHMARKS_START",
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

  const normalized: NormalizedBenchmarkRow[] = [];
  let failedCount = 0;
  for (const [idx, record] of records.entries()) {
    const rowNumber = idx + 2;
    const rowErrors: string[] = [];
    const rowWarnings: string[] = [];
    const row = normalizeRecord(record, rowNumber, rowErrors, options.defaultSymbol);
    if (row && validateRow(row, rowNumber, rowErrors, rowWarnings)) {
      normalized.push(row);
      warnings.push(...rowWarnings);
    }
    if (rowErrors.length) {
      failedCount += 1;
      errors.push(...rowErrors);
    }
    if (rowWarnings.length && !row) warnings.push(...rowWarnings);
  }

  const db = await getDb();
  if (!db) {
    errors.push("Database not configured");
    failedCount = totalRows;
    logger.error("Benchmark ingestion failed before DB access", {
      eventName: "INGEST_BENCHMARKS_FAILED",
      uploadId: uploadLog?.id,
    });
    await persistUploadLog(uploadLog, {
      rowCountTotal: totalRows,
      rowCountFailed: totalRows,
      status: "failed",
      errorSummary: summarizeIssues(errors),
      warningsSummary: summarizeIssues(warnings),
    });
    return { importedCount: 0, skippedCount: totalRows, failedCount, errors, warnings, uploadId: uploadLog?.id };
  }

  let importedCount = 0;
  if (normalized.length > 0) {
    await db.transaction(async (tx: unknown) => {
      const transactionalDb = tx as Database;
      await transactionalDb
        .delete(schema.benchmarks)
        .where(eq(schema.benchmarks.workspaceId, options.workspaceId));

      await transactionalDb.insert(schema.benchmarks).values(
        normalized.map(row => ({
          workspaceId: options.workspaceId,
          symbol: row.symbol,
          date: row.date,
          close: row.close.toString(),
          uploadId: uploadLog?.id,
        })),
      );
      importedCount = normalized.length;
    });
  }

  const skippedCount = totalRows - importedCount;
  const status = importedCount === 0 ? "failed" : errors.length > 0 ? "partial" : "success";

  await persistUploadLog(uploadLog, {
    rowCountTotal: totalRows,
    rowCountImported: importedCount,
    rowCountFailed: failedCount || skippedCount,
    status,
    errorSummary: summarizeIssues(errors),
    warningsSummary: summarizeIssues(warnings),
  });

  logger.info("Benchmark ingestion complete", {
    eventName: "INGEST_BENCHMARKS_END",
    uploadId: uploadLog?.id,
    imported: importedCount,
    skipped: skippedCount,
    failedCount,
    status,
    workspaceId: options.workspaceId,
    userId: options.userId,
  });

  return { importedCount, skippedCount, failedCount: failedCount || skippedCount, errors, warnings, uploadId: uploadLog?.id, headerIssues };
}

function parseCsvRecords(csv: string): { headers: string[]; records: CsvRecord[] } {
  const rows = csv.split(/\r?\n/).filter(line => line.trim() !== "").map(parseCsvLine);
  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0].map(header => header.trim());
  const records: CsvRecord[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row.some(cell => cell.trim() !== "")) continue;
    const rec: CsvRecord = {};
    headers.forEach((header, idx) => {
      rec[normalizeHeaderKey(header)] = (row[idx] ?? "").trim();
    });
    records.push(rec);
  }
  return { headers, records };
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
        i++;
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
  defaultSymbol?: string,
): NormalizedBenchmarkRow | null {
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const val = record[normalizeHeaderKey(key)];
      if (val !== undefined && val !== null && String(val).trim() !== "") return String(val).trim();
    }
    return undefined;
  };

  const symbol = pick("symbol", "ticker") ?? defaultSymbol;
  const date = pick("date", "asof", "day");
  const closeStr = pick("close", "price", "value");

  if (!symbol || !date || !closeStr) {
    errors.push(`Row ${rowNumber}: missing required field(s)`);
    return null;
  }

  const close = Number(closeStr);
  if (!Number.isFinite(close)) {
    errors.push(`Row ${rowNumber}: close must be numeric`);
    return null;
  }

  const dateObj = new Date(date);
  if (Number.isNaN(dateObj.getTime())) {
    errors.push(`Row ${rowNumber}: date is invalid`);
    return null;
  }

  return { symbol, date: dateObj.toISOString().slice(0, 10), close };
}

function validateRow(row: NormalizedBenchmarkRow, rowNumber: number, errors: string[], warnings: string[]) {
  if (row.close <= 0) {
    warnings.push(`Row ${rowNumber}: close is non-positive`);
  }
  if (!row.symbol.trim()) {
    errors.push(`Row ${rowNumber}: symbol is required`);
    return false;
  }
  return true;
}

function validateHeaders(headers: string[]): IngestionHeaderIssues {
  const normalized = headers.map(h => normalizeHeaderKey(h)).filter(Boolean);
  const missing: string[] = [];
  for (const requirement of REQUIRED_FIELDS) {
    const hasField = requirement.keys.some(key => normalized.includes(normalizeHeaderKey(key)));
    if (!hasField) missing.push(requirement.label);
  }
  const unexpected = normalized.filter(header => !ALLOWED_HEADERS.has(header));
  return { missing, unexpected };
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
