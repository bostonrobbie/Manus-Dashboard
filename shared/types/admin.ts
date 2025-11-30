import type { UploadLogRow } from "@shared/types/uploads";

export interface AdminWorkspaceSummary {
  id: number;
  externalId: string;
  name?: string | null;
  tradeCount: number;
  benchmarkCount: number;
  lastUploadAt?: string | Date | null;
}

export interface AdminUploadList {
  rows: UploadLogRow[];
  total: number;
}

export interface SoftDeleteResult {
  tradesDeleted?: number;
  benchmarksDeleted?: number;
  note?: string;
}
