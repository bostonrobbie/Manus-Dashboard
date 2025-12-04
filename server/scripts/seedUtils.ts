import fs from "fs";
import path from "path";

export type CsvRecord = Record<string, string>;

export function resolveSeedUserId(): number {
  return Number(process.env.SEED_USER_ID ?? process.env.TRADINGVIEW_WEBHOOK_USER_ID ?? 1);
}

export function readSeedFile(fileName: string): string {
  const seedPath = path.resolve(process.cwd(), "data/seed", fileName);
  return fs.readFileSync(seedPath, "utf8");
}

export function parseCsvRecords(csv: string): { headers: string[]; records: CsvRecord[] } {
  const rows = csv
    .split(/\r?\n/)
    .filter(line => line.trim() !== "")
    .map(parseCsvLine);

  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0].map(header => header.trim());
  const records: CsvRecord[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row.some(cell => cell.trim() !== "")) continue;
    const record: CsvRecord = {};
    headers.forEach((header, idx) => {
      record[normalizeHeaderKey(header)] = (row[idx] ?? "").trim();
    });
    records.push(record);
  }

  return { headers, records };
}

const normalizeHeaderKey = (key: string) => key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

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

  return values;
}
