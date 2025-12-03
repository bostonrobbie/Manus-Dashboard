import { TRPCError } from "@trpc/server";

import type { AdminUploadList, AdminWorkspaceSummary, SoftDeleteResult } from "@shared/types/admin";

const unsupported = () =>
  new TRPCError({ code: "NOT_FOUND", message: "Workspace administration is not supported on Manus." });

export function setAdminDataAdapter(_adapter: unknown) {
  // No-op: workspace features are disabled.
}

export async function listWorkspaceSummaries(): Promise<AdminWorkspaceSummary[]> {
  return [];
}

export async function listUploadsForWorkspace(): Promise<AdminUploadList> {
  throw unsupported();
}

export async function softDeleteByUpload(): Promise<{ tradesDeleted: number; benchmarksDeleted: number }> {
  throw unsupported();
}

export async function softDeleteTradesByFilter(): Promise<SoftDeleteResult> {
  throw unsupported();
}

export async function softDeleteBenchmarksByFilter(): Promise<SoftDeleteResult> {
  throw unsupported();
}
