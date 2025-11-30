export interface IngestionHeaderIssues {
  missing: string[];
  unexpected: string[];
}

export interface IngestionResult {
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: string[];
  warnings: string[];
  uploadId?: number;
  headerIssues?: IngestionHeaderIssues;
}
