import { useMemo } from "react";

import { useHealthStatus } from "../hooks/useHealthStatus";
import { useDashboardState } from "../providers/DashboardProvider";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { trpc } from "../lib/trpc";

function SettingsPage() {
  const health = useHealthStatus();
  const { workspaces, workspaceId } = useDashboardState();
  const authDebug = trpc.auth.debug.useQuery(undefined, { retry: 0 });

  const baseApi = useMemo(() => import.meta.env.VITE_API_URL?.trim() ?? window.location.origin, []);
  const authDetails = authDebug.data && "mode" in authDebug.data ? authDebug.data : null;

  const statusBadge = (label: string, ok: boolean) => (
    <Badge variant={ok ? "success" : "warning"}>{label}</Badge>
  );

  const full = health.full;
  const detailList = full?.details ? Object.entries(full.details).filter(([, value]) => Boolean(value)) : [];

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
            {statusBadge(`DB: ${full?.db ?? "unknown"}`, full?.db === "ok")}
            {statusBadge(`Workspaces: ${full?.workspaces ?? "unknown"}`, full?.workspaces === "ok")}
            {statusBadge(`Uploads: ${full?.uploads ?? "unknown"}`, full?.uploads === "ok")}
            {statusBadge(`Auth: ${full?.auth ?? "n/a"}`, full?.auth === "ok")}
            <Badge variant="secondary">Mode: {health.mode ?? "unknown"}</Badge>
            {health.mockUser ? <Badge variant="warning">Mock user enabled</Badge> : null}
          </div>
          {health.warnings.length > 0 ? (
            <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <p className="font-semibold">Warnings</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {health.warnings.map(warn => (
                  <li key={warn}>{warn}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {detailList && detailList.length > 0 ? (
            <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <p className="font-semibold">Signals</p>
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {detailList.map(([key, value]) => (
                  <li key={key}>
                    {key}: {value}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4 text-sm text-slate-700">
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
            <p className="text-xs text-slate-500">Headers: {import.meta.env.VITE_MANUS_AUTH_HEADER ?? "x-manus-user-json"}</p>
          </div>
          <div className="rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-wide text-slate-500">Build</p>
            <p className="font-semibold text-slate-900">Version {health.version ?? "unknown"}</p>
            <p className="text-xs text-slate-500">Commit: {health.commit ?? "not provided"}</p>
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
            <li className="rounded border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs">pnpm lint</li>
            <li className="rounded border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs">pnpm typecheck</li>
            <li className="rounded border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs">pnpm test:all</li>
            <li className="rounded border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs">pnpm smoke:test</li>
          </ul>
          <p className="text-xs text-slate-500">
            See DEPLOY_ON_MANUS.md for Manus mode env vars and DATA_PIPELINE.md for workspace-scoped ingestion guidance.
          </p>
        </CardContent>
      </Card>

      {authDetails ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Auth debug (operators only)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <p className="text-xs text-slate-500">
              Use this to confirm Manus header names and the parsed user. Values are masked for sensitive headers.
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Mode</p>
                <p className="font-semibold text-slate-900">{authDetails.mode}</p>
                <p className="text-xs text-slate-500">Strict: {authDetails.strict ? "on" : "off"}</p>
                {authDetails.fallbackUsed ? (
                  <Badge variant="warning" className="mt-2">
                    Auth fallback used
                  </Badge>
                ) : null}
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Configured headers</p>
                <ul className="mt-1 space-y-1">
                  <li>User: {authDetails.configAuthHeaders.user}</li>
                  <li>Workspace: {authDetails.configAuthHeaders.workspace}</li>
                </ul>
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Parsed user</p>
                {authDetails.parsedUser ? (
                  <ul className="mt-1 space-y-1">
                    <li>ID: {authDetails.parsedUser.id}</li>
                    <li>Email: {authDetails.parsedUser.email}</li>
                    {authDetails.parsedUser.workspaceId ? (
                      <li>Workspace: {authDetails.parsedUser.workspaceId}</li>
                    ) : null}
                  </ul>
                ) : (
                  <p className="mt-1 text-slate-600">No user parsed from headers.</p>
                )}
              </div>
            </div>
            <div className="rounded border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Request headers (filtered)</p>
              {authDetails.rawHeaders ? (
                <ul className="mt-1 space-y-1 font-mono text-xs">
                  {Object.entries(authDetails.rawHeaders)
                    .filter(([name]) => name.startsWith("x-"))
                    .map(([name, value]) => (
                      <li key={name}>
                        {name}: {Array.isArray(value) ? value.join(",") : String(value)}
                      </li>
                    ))}
                  <li className="text-slate-500">Non x-* headers are omitted unless non-sensitive.</li>
                </ul>
              ) : (
                <p className="mt-1 text-slate-600">No headers detected.</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export default SettingsPage;
