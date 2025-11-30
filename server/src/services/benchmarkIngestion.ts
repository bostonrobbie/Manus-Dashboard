import { eq } from "drizzle-orm";

import { getDb, schema } from "@server/db";
import { createUploadLog, updateUploadLog } from "./uploadLogs";
import { createLogger } from "@server/utils/logger";

const logger = createLogger("benchmark-ingestion");

export interface BenchmarkIngestionResult {
  importedCount: number;
  skippedCount: number;
  errors: string[];
  warnings: string[];
  uploadId?: number;
}

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

export async function ingestBenchmarksCsv(options: IngestBenchmarksOptions): Promise<BenchmarkIngestionResult> {
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

  const normalized: NormalizedBenchmarkRow[] = [];
  for (const [idx, record] of records.entries()) {
    const rowNumber = idx + 2;
    const rowErrors: string[] = [];
    const rowWarnings: string[] = [];
    const row = normalizeRecord(record, rowNumber, rowErrors, options.defaultSymbol);
    if (row && validateRow(row, rowNumber, rowErrors, rowWarnings)) {
      normalized.push(row);
      warnings.push(...rowWarnings);
    }
    if (rowErrors.length) errors.push(...rowErrors);
    if (rowWarnings.length && !row) warnings.push(...rowWarnings);
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

  let importedCount = 0;
  if (normalized.length > 0) {
    await db.transaction(async tx => {
      await tx
        .delete(schema.benchmarks)
        .where(eq(schema.benchmarks.workspaceId, options.workspaceId));

      await tx.insert(schema.benchmarks).values(
        normalized.map(row => ({
          workspaceId: options.workspaceId,
          symbol: row.symbol,
          date: row.date,
          close: row.close.toString(),
        })),
      );
      importedCount = normalized.length;
    });
  }

  const skippedCount = totalRows - importedCount;
  const status = importedCount === 0 ? "failed" : errors.length > 0 ? "partial" : "success";

  if (uploadLog) {
    await updateUploadLog(uploadLog.id, {
      rowCountTotal: totalRows,
      rowCountImported: importedCount,
      rowCountFailed: skippedCount,
      status,
      errorSummary: summarizeIssues(errors),
      warningsSummary: summarizeIssues(warnings),
    });
  }

  logger.info("Benchmark ingestion complete", {
    uploadId: uploadLog?.id,
    imported: importedCount,
    skipped: skippedCount,
    status,
  });

  return { importedCount, skippedCount, errors, warnings, uploadId: uploadLog?.id };
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
      rec[header.trim().toLowerCase()] = (row[idx] ?? "").trim();
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
      const val = record[key.toLowerCase()];
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

function findMissingRequiredColumns(headers: string[]): string[] {
  const normalized = headers.map(h => h.trim().toLowerCase());
  const required = [
    { label: "symbol", keys: ["symbol", "ticker"] },
    { label: "date", keys: ["date", "asof", "day"] },
    { label: "close", keys: ["close", "price", "value"] },
  ];
  const missing: string[] = [];
  for (const item of required) {
    const hasField = item.keys.some(key => normalized.includes(key));
    if (!hasField) missing.push(item.label);
  }
  return missing;
}

function summarizeIssues(list: string[]): string | null {
  if (!list.length) return null;
  const unique = Array.from(new Set(list));
  return unique.slice(0, 3).join(" | ");
}
