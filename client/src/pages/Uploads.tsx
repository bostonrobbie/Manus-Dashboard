import { useMemo, useState } from "react";

import { trpc } from "../lib/trpc";
import { useDashboardState } from "../providers/DashboardProvider";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

interface UploadHistoryRow {
  id: number;
  filename: string;
  type: string;
  workspaceId?: number;
  uploadedAt: string;
  status: "success" | "error";
  imported?: number;
  skipped?: number;
  message?: string;
}

function UploadsPage() {
  const { workspaceId } = useDashboardState();
  const [csvText, setCsvText] = useState("");
  const [filename, setFilename] = useState("trades.csv");
  const [strategyName, setStrategyName] = useState("");
  const [strategyType, setStrategyType] = useState<"swing" | "intraday" | "">("");
  const [history, setHistory] = useState<UploadHistoryRow[]>([]);

  const uploadMutation = trpc.portfolio.uploadTradesCsv.useMutation({
    onSuccess: data => {
      setHistory(prev => [
        {
          id: prev.length + 1,
          filename,
          type: "trades",
          workspaceId,
          uploadedAt: new Date().toISOString(),
          status: "success",
          imported: data.importedCount,
          skipped: data.skippedCount,
        },
        ...prev,
      ]);
    },
    onError: error => {
      setHistory(prev => [
        {
          id: prev.length + 1,
          filename,
          type: "trades",
          workspaceId,
          uploadedAt: new Date().toISOString(),
          status: "error",
          message: error.message,
        },
        ...prev,
      ]);
    },
  });

  const handleFile = async (file: File) => {
    const text = await file.text();
    setCsvText(text);
    setFilename(file.name);
  };

  const handleSubmit = () => {
    if (!csvText.trim()) return;
    uploadMutation.mutate({ csv: csvText, strategyName: strategyName || undefined, strategyType: strategyType || undefined });
  };

  const statusBadge = (row: UploadHistoryRow) => (
    <Badge variant={row.status === "success" ? "success" : "warning"}>{row.status === "success" ? "Success" : "Failed"}</Badge>
  );

  const hint = useMemo(
    () =>
      "Uploads respect the current workspace and user auth. CSV headers should include symbol, side, quantity, entryPrice, exitPrice, entryTime, exitTime.",
    [],
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Uploads / Data</h2>
        <p className="text-sm text-slate-600">Aligned with DATA_PIPELINE expectations. Scoped to workspace {workspaceId ?? "?"}.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Upload CSV</CardTitle>
          <p className="text-xs text-slate-500">Trades are supported via the ingest endpoint. Benchmarks/equity files share the same workspace scope.</p>
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
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent uploads</CardTitle>
          <p className="text-xs text-slate-500">Session-only history for visibility; server logs remain authoritative.</p>
        </CardHeader>
        <CardContent>
          {history.length ? (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">File</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Workspace</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Uploaded</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Rows</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map(row => (
                  <tr key={row.id}>
                    <td className="px-3 py-2 font-semibold text-slate-900">{row.filename}</td>
                    <td className="px-3 py-2 text-slate-600">{row.type}</td>
                    <td className="px-3 py-2 text-slate-600">{row.workspaceId ?? "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{new Date(row.uploadedAt).toLocaleString()}</td>
                    <td className="px-3 py-2">{statusBadge(row)}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {row.imported != null ? `${row.imported} imported` : null}
                      {row.skipped ? ` / ${row.skipped} skipped` : null}
                      {row.message ? <div className="text-xs text-amber-700">{row.message}</div> : null}
                    </td>
                  </tr>
                ))}
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
