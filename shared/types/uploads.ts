export type UploadStatus = "pending" | "success" | "partial" | "failed";
export type UploadType = "trades" | "benchmarks" | "equity";

export interface UploadLogRow {
  id: number;
  userId: number;
  ownerId?: number;
  workspaceId: number;
  fileName: string;
  uploadType: UploadType;
  rowCountTotal: number;
  rowCountImported: number;
  rowCountFailed: number;
  status: UploadStatus;
  startedAt: string | Date | null;
  finishedAt?: string | Date | null;
  errorSummary?: string | null;
  warningsSummary?: string | null;
}

export interface UploadLogList {
  rows: UploadLogRow[];
  total: number;
}
