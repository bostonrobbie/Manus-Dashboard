import { useEffect, useMemo, useState } from "react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { trpc } from "../lib/trpc";
import { useDashboardState } from "../providers/DashboardProvider";

function AdminDataManagerPage() {
  const { isAdmin } = useDashboardState();
  const utils = trpc.useUtils();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<number | null>(null);
  const [tradeSymbol, setTradeSymbol] = useState("");
  const [tradeStart, setTradeStart] = useState("");
  const [tradeEnd, setTradeEnd] = useState("");
  const [benchSymbol, setBenchSymbol] = useState("");
  const [benchStart, setBenchStart] = useState("");
  const [benchEnd, setBenchEnd] = useState("");
  const [tab, setTab] = useState<"uploads" | "trades" | "benchmarks">("uploads");
  const [notice, setNotice] = useState<string | null>(null);

  const workspacesQuery = trpc.adminData.listWorkspaces.useQuery(undefined, { enabled: isAdmin });

  useEffect(() => {
    if (!activeWorkspaceId && workspacesQuery.data?.length) {
      setActiveWorkspaceId(workspacesQuery.data[0].id);
    }
  }, [activeWorkspaceId, workspacesQuery.data]);

  const uploadsQuery = trpc.adminData.listUploadsForWorkspace.useQuery(
    { workspaceId: activeWorkspaceId ?? 0, page: 1, pageSize: 25 },
    { enabled: isAdmin && Boolean(activeWorkspaceId) },
  );

  const softDeleteByUpload = trpc.adminData.softDeleteByUpload.useMutation({
    onSuccess: async result => {
      await Promise.all([
        utils.adminData.listUploadsForWorkspace.invalidate(),
        utils.adminData.listWorkspaces.invalidate(),
      ]);
      setNotice(result?.note ?? "Soft delete completed");
    },
    onError: error => setNotice(error.message || "Failed to soft delete by upload"),
    onSettled: () => {
      void utils.adminData.listUploadsForWorkspace.invalidate();
    },
  });

  const softDeleteTrades = trpc.adminData.softDeleteTradesByFilter.useMutation({
    onSuccess: async res => {
      await Promise.all([
        utils.adminData.listWorkspaces.invalidate(),
        utils.adminData.listUploadsForWorkspace.invalidate(),
        utils.portfolio.overview.invalidate(),
      ]);
      setNotice(`Soft deleted ${res.count} trades for workspace ${activeWorkspaceId ?? "?"}`);
    },
    onError: error => setNotice(error.message || "Failed to soft delete trades"),
    onSettled: () => {
      void utils.adminData.listUploadsForWorkspace.invalidate();
    },
  });

  const softDeleteBenchmarks = trpc.adminData.softDeleteBenchmarksByFilter.useMutation({
    onSuccess: async res => {
      await Promise.all([
        utils.adminData.listWorkspaces.invalidate(),
        utils.adminData.listUploadsForWorkspace.invalidate(),
        utils.portfolio.overview.invalidate(),
      ]);
      setNotice(`Soft deleted ${res.count} benchmarks for workspace ${activeWorkspaceId ?? "?"}`);
    },
    onError: error => setNotice(error.message || "Failed to soft delete benchmarks"),
    onSettled: () => {
      void utils.adminData.listUploadsForWorkspace.invalidate();
    },
  });

  const selectedWorkspace = useMemo(
    () => workspacesQuery.data?.find(w => w.id === activeWorkspaceId),
    [activeWorkspaceId, workspacesQuery.data],
  );

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Admin access required</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          You need an administrator role to manage workspace data.
        </CardContent>
      </Card>
    );
  }

  const workspaceLoadError = workspacesQuery.isError
    ? workspacesQuery.error?.message || "Unable to load workspaces"
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Admin Data Manager</h2>
        <p className="text-sm text-slate-600">
          Inspect workspace data, review uploads, and soft delete trades or benchmarks. Soft deletes hide rows from analytics
          without removing audit history.
        </p>
      </div>

      {notice ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Workspace overview</CardTitle>
          <p className="text-xs text-slate-500">Counts exclude soft-deleted rows.</p>
        </CardHeader>
        <CardContent>
          {workspacesQuery.isLoading ? (
            <div className="h-24 animate-pulse rounded bg-slate-100" />
          ) : workspaceLoadError ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {workspaceLoadError}
            </div>
          ) : workspacesQuery.data?.length ? (
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Workspace</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Trade count</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Benchmark count</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Last upload</th>
                  <th className="px-3 py-2 text-left" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {workspacesQuery.data.map(ws => (
                  <tr key={ws.id} className={activeWorkspaceId === ws.id ? "bg-slate-50" : ""}>
                    <td className="px-3 py-2 text-slate-800">
                      <div className="font-semibold">{ws.name ?? ws.externalId}</div>
                      <div className="text-xs text-slate-500">ID {ws.id}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-800">{ws.tradeCount}</td>
                    <td className="px-3 py-2 text-slate-800">{ws.benchmarkCount}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {ws.lastUploadAt ? new Date(ws.lastUploadAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant={activeWorkspaceId === ws.id ? "default" : "outline"} onClick={() => setActiveWorkspaceId(ws.id)}>
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-sm text-slate-600">No workspaces found.</div>
          )}
        </CardContent>
      </Card>

      {selectedWorkspace ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Workspace tools: {selectedWorkspace.name ?? selectedWorkspace.externalId}</CardTitle>
            <p className="text-xs text-slate-500">
              Actions below will soft delete data for workspace {selectedWorkspace.id}. Deleted rows remain in the database for
              audit history but are ignored by analytics.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 text-sm">
              {(["uploads", "trades", "benchmarks"] as const).map(key => (
                <Button key={key} size="sm" variant={tab === key ? "default" : "outline"} onClick={() => setTab(key)}>
                  {key === "uploads" ? "Uploads" : key === "trades" ? "Trades" : "Benchmarks"}
                </Button>
              ))}
              <Badge variant="secondary">Workspace {selectedWorkspace.id}</Badge>
            </div>

            {tab === "uploads" ? (
              <div className="space-y-3">
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
                  Soft deleting by upload will mark all rows created by that upload as deleted. This is destructive but
                  reversible via re-ingestion.
                </div>
                {uploadsQuery.isLoading ? (
                  <div className="h-24 animate-pulse rounded bg-slate-100" />
                ) : uploadsQuery.isError ? (
                  <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                    {uploadsQuery.error?.message || "Unable to load uploads for this workspace."}
                  </div>
                ) : uploadsQuery.data?.rows?.length ? (
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">File</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">Type</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">Status</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">Imported</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700">Started</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {uploadsQuery.data.rows.map(row => (
                        <tr key={row.id}>
                          <td className="px-3 py-2">
                            <div className="font-semibold text-slate-800">{row.fileName}</div>
                            <div className="text-xs text-slate-500">Upload ID {row.id}</div>
                          </td>
                          <td className="px-3 py-2 text-slate-700">{row.uploadType}</td>
                          <td className="px-3 py-2 text-slate-700">
                            <Badge variant={row.status === "success" ? "success" : row.status === "failed" ? "destructive" : "secondary"}>
                              {row.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {row.rowCountImported}/{row.rowCountTotal}
                          </td>
                          <td className="px-3 py-2 text-slate-600">
                            {row.startedAt ? new Date(row.startedAt).toLocaleString() : "—"}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={softDeleteByUpload.isPending}
                              onClick={() => {
                                if (softDeleteByUpload.isPending) return;
                                if (!window.confirm("Soft delete all rows created by this upload?")) return;
                                softDeleteByUpload.mutate({ uploadId: row.id });
                              }}
                            >
                              Soft delete data
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-sm text-slate-600">No uploads found for this workspace.</div>
                )}
                {softDeleteByUpload.isError ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    {softDeleteByUpload.error?.message}
                  </div>
                ) : null}
              </div>
            ) : null}

            {tab === "trades" ? (
              <div className="space-y-3">
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
                  This will mark matching trades as deleted. They will disappear from analytics and exports.
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="flex flex-col gap-1 text-sm">
                    <label className="text-xs uppercase tracking-wide text-slate-500">Symbol</label>
                    <input
                      className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Optional"
                      value={tradeSymbol}
                      onChange={event => setTradeSymbol(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1 text-sm">
                    <label className="text-xs uppercase tracking-wide text-slate-500">Start date (exit)</label>
                    <input
                      type="date"
                      className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                      value={tradeStart}
                      onChange={event => setTradeStart(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1 text-sm">
                    <label className="text-xs uppercase tracking-wide text-slate-500">End date (exit)</label>
                    <input
                      type="date"
                      className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                      value={tradeEnd}
                      onChange={event => setTradeEnd(event.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={softDeleteTrades.isPending}
                    onClick={() => {
                      if (!activeWorkspaceId) return;
                      if (softDeleteTrades.isPending) return;
                      if (!window.confirm("Soft delete matching trades?")) return;
                      softDeleteTrades.mutate({
                        workspaceId: activeWorkspaceId,
                        symbol: tradeSymbol || undefined,
                        startDate: tradeStart || undefined,
                        endDate: tradeEnd || undefined,
                      });
                    }}
                  >
                    Soft delete trades
                  </Button>
                  {softDeleteTrades.isError ? (
                    <div className="text-xs text-amber-700">{softDeleteTrades.error?.message}</div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {tab === "benchmarks" ? (
              <div className="space-y-3">
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
                  Benchmarks are shared across analytics. Soft deleting removes them from comparisons until re-uploaded.
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="flex flex-col gap-1 text-sm">
                    <label className="text-xs uppercase tracking-wide text-slate-500">Symbol</label>
                    <input
                      className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                      placeholder="Optional"
                      value={benchSymbol}
                      onChange={event => setBenchSymbol(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1 text-sm">
                    <label className="text-xs uppercase tracking-wide text-slate-500">Start date</label>
                    <input
                      type="date"
                      className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                      value={benchStart}
                      onChange={event => setBenchStart(event.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1 text-sm">
                    <label className="text-xs uppercase tracking-wide text-slate-500">End date</label>
                    <input
                      type="date"
                      className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                      value={benchEnd}
                      onChange={event => setBenchEnd(event.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={softDeleteBenchmarks.isPending}
                    onClick={() => {
                      if (!activeWorkspaceId) return;
                      if (softDeleteBenchmarks.isPending) return;
                      if (!window.confirm("Soft delete matching benchmarks?")) return;
                      softDeleteBenchmarks.mutate({
                        workspaceId: activeWorkspaceId,
                        symbol: benchSymbol || undefined,
                        startDate: benchStart || undefined,
                        endDate: benchEnd || undefined,
                      });
                    }}
                  >
                    Soft delete benchmarks
                  </Button>
                  {softDeleteBenchmarks.isError ? (
                    <div className="text-xs text-amber-700">{softDeleteBenchmarks.error?.message}</div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default AdminDataManagerPage;
