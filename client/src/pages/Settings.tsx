import { useMemo } from "react";

import { useHealthStatus } from "../hooks/useHealthStatus";
import { useDashboardState } from "../providers/DashboardProvider";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

function SettingsPage() {
  const health = useHealthStatus();
  const { workspaces, workspaceId } = useDashboardState();

  const baseApi = useMemo(() => import.meta.env.VITE_API_URL?.trim() ?? window.location.origin, []);

  const statusBadge = (label: string, ok: boolean) => (
    <Badge variant={ok ? "success" : "warning"}>{label}</Badge>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Settings & Health</h2>
        <p className="text-sm text-slate-600">Operational view for Manus deployments and local dev.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 text-sm">
            {statusBadge(health.label, health.status === "ok")}
            {statusBadge(`DB: ${health.db}`, health.db === "up")}
            <Badge variant="secondary">Mode: {health.mode ?? "unknown"}</Badge>
            {health.mockUser ? <Badge variant="warning">Mock user enabled</Badge> : null}
          </div>
          {health.status !== "ok" ? (
            <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Check Manus auth headers and database connectivity. Manus mode requires a JWT secret or public key URL.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-3 text-sm text-slate-700">
          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">API base</p>
            <p className="font-semibold text-slate-900">{baseApi}</p>
          </div>
          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Workspaces</p>
            {workspaces.length ? (
              <ul className="mt-1 space-y-1 text-sm">
                {workspaces.map(ws => (
                  <li key={ws.id} className="flex items-center justify-between">
                    <span>
                      {ws.name ?? ws.externalId ?? `Workspace ${ws.id}`} {workspaceId === ws.id ? "(current)" : ""}
                    </span>
                    {workspaceId === ws.id ? <Badge variant="secondary">Active</Badge> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-slate-600">No workspaces returned from API.</p>
            )}
          </div>
          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Manus mode</p>
            <p className="font-semibold text-slate-900">{health.mode ?? "unknown"}</p>
            <p className="text-xs text-slate-500">Headers: {import.meta.env.VITE_MANUS_AUTH_HEADER ?? "x-manus-user"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Developer quick-links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-700">
          <p className="text-xs uppercase tracking-wide text-slate-500">Local commands</p>
          <ul className="space-y-1">
            <li className="rounded border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs">pnpm --filter server test</li>
            <li className="rounded border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs">pnpm --filter client build</li>
            <li className="rounded border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs">pnpm --filter drizzle migrate</li>
          </ul>
          <p className="text-xs text-slate-500">
            See DEPLOY_ON_MANUS.md for Manus mode env vars and DATA_PIPELINE.md for workspace-scoped ingestion guidance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default SettingsPage;
