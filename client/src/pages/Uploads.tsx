import { Fragment, useMemo, useState } from "react";

import { trpc } from "../lib/trpc";
import { useDashboardState } from "../providers/DashboardProvider";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import type { UploadStatus, UploadType } from "@shared/types/uploads";

function UploadsPage() {
  const { workspaceId, timeRange } = useDashboardState();
  const utils = trpc.useUtils();
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState("trades.csv");
  const [strategyName, setStrategyName] = useState("");
  const [strategyType, setStrategyType] = useState<"swing" | "intraday" | "">("");
  const [filterType, setFilterType] = useState<UploadType | "">("");
  const [filterStatus, setFilterStatus] = useState<UploadStatus | "">("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const uploadsQuery = trpc.uploads.list.useQuery({
    page: 1,
    pageSize: 25,
    uploadType: filterType || undefined,
    status: filterStatus || undefined,
    timeRange,
  });

  const uploadMutation = trpc.portfolio.uploadTradesCsv.useMutation({
    onSuccess: async data => {
      await utils.uploads.list.invalidate();
      setExpandedId(data.uploadId ?? null);
    },
  });

  const handleFile = async (file: File) => {
    const text = await file.text();
    setCsvText(text);
    setFileName(file.name);
  };

  const handleSubmit = () => {
    if (!csvText.trim()) return;
    uploadMutation.mutate({
      csv: csvText,
      fileName,
      strategyName: strategyName || undefined,
      strategyType: strategyType || undefined,
    });
  };

  const statusBadge = (status: UploadStatus) => {
    const variant = status === "success" ? "success" : status === "partial" ? "warning" : status === "pending" ? "secondary" : "destructive";
    const label = status === "partial" ? "Partial" : status === "failed" ? "Failed" : status === "pending" ? "Pending" : "Success";
    return <Badge variant={variant}>{label}</Badge>;
  };

  const hint = useMemo(
    () =>
      "Uploads respect the current workspace and user auth. CSV headers should include symbol, side, quantity, entryPrice, exitPrice, entryTime, exitTime.",
    [],
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Uploads / Data</h2>
        <p className="text-sm text-slate-600">Workspace {workspaceId ?? "?"} audit trail for every ingest.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Upload CSV</CardTitle>
          <p className="text-xs text-slate-500">Trades are validated with sanity checks and linked to your workspace.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="flex flex-col gap-1 text-sm">
              <label className="text-xs uppercase tracking-wide text-slate-500">Choose file</label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={event => {
                  const file = event.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              <p className="text-xs text-slate-500">or paste CSV below</p>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <label className="text-xs uppercase tracking-wide text-slate-500">Default strategy name</label>
              <input
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                placeholder="Optional"
                value={strategyName}
                onChange={event => setStrategyName(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <label className="text-xs uppercase tracking-wide text-slate-500">Strategy type</label>
              <select
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={strategyType}
                onChange={event => setStrategyType(event.target.value as "swing" | "intraday" | "")}
              >
                <option value="">Infer from CSV</option>
                <option value="swing">Swing</option>
                <option value="intraday">Intraday</option>
              </select>
            </div>
          </div>

          <textarea
            className="h-40 w-full rounded-md border border-slate-200 p-3 font-mono text-xs"
            placeholder="symbol,side,quantity,entryPrice,exitPrice,entryTime,exitTime"
            value={csvText}
            onChange={event => setCsvText(event.target.value)}
          />
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>{hint}</span>
            <Button size="sm" onClick={handleSubmit} disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </div>
          {uploadMutation.isError ? (
            <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{uploadMutation.error?.message}</div>
          ) : null}
          {uploadMutation.isSuccess ? (
            <div className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              Imported {uploadMutation.data.importedCount} rows, skipped {uploadMutation.data.skippedCount}.
              {uploadMutation.data.warnings.length ? ` Warnings: ${uploadMutation.data.warnings.join("; ")}` : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Upload audit history</CardTitle>
          <p className="text-xs text-slate-500">Server-side log filtered by workspace and user.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 text-sm md:flex-row md:items-center md:justify-between">
            <div className="flex gap-2">
              <select
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={filterType}
                onChange={event => setFilterType(event.target.value as UploadType | "")}
              >
                <option value="">All types</option>
                <option value="trades">Trades</option>
                <option value="benchmarks">Benchmarks</option>
                <option value="equity">Equity</option>
              </select>
              <select
                className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                value={filterStatus}
                onChange={event => setFilterStatus(event.target.value as UploadStatus | "")}
              >
                <option value="">All statuses</option>
                <option value="success">Success</option>
                <option value="partial">Partial</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <p className="text-xs text-slate-500">Filters respect the global time range selector.</p>
          </div>

          {uploadsQuery.isLoading ? (
            <div className="h-24 animate-pulse rounded bg-slate-100" />
          ) : uploadsQuery.data?.rows?.length ? (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">File</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Rows</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Started</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Finished</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {uploadsQuery.data.rows.map(row => {
                  const isExpanded = expandedId === row.id;
                  return (
                    <Fragment key={row.id}>
                      <tr
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => setExpandedId(prev => (prev === row.id ? null : row.id))}
                      >
                        <td className="px-3 py-2 font-semibold text-slate-900">{row.fileName}</td>
                        <td className="px-3 py-2 capitalize text-slate-600">{row.uploadType}</td>
                        <td className="px-3 py-2">{statusBadge(row.status as UploadStatus)}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {row.rowCountImported}/{row.rowCountTotal} imported
                          {row.rowCountFailed ? ` · ${row.rowCountFailed} failed` : ""}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{row.startedAt ? new Date(row.startedAt).toLocaleString() : "—"}</td>
                        <td className="px-3 py-2 text-slate-600">{row.finishedAt ? new Date(row.finishedAt).toLocaleString() : "—"}</td>
                      </tr>
                      {isExpanded ? (
                        <tr className="bg-slate-50">
                          <td className="px-3 py-2 text-xs text-slate-700" colSpan={6}>
                            <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                              <div className="space-y-1">
                                <div>
                                  <span className="font-semibold">Error summary:</span> {row.errorSummary || "None"}
                                </div>
                                <div>
                                  <span className="font-semibold">Warnings:</span> {row.warningsSummary || "None"}
                                </div>
                              </div>
                              <div className="text-right text-[11px] uppercase tracking-wide text-slate-500">User scoped · Workspace {row.workspaceId}</div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="rounded border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              No uploads yet. Drag a CSV file or paste rows to ingest data for this workspace.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default UploadsPage;
