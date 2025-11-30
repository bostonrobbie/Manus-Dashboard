import { PropsWithChildren, useMemo } from "react";

import type { AuthSource, SharedAuthUser } from "@shared/types/auth";
import { useHealthStatus } from "../hooks/useHealthStatus";
import { useDashboardState } from "../providers/DashboardProvider";
import Navigation from "./Navigation";
import TimeRangeSelector from "./TimeRangeSelector";
import WorkspaceSelector from "./WorkspaceSelector";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";

interface DashboardLayoutProps extends PropsWithChildren {
  user: SharedAuthUser;
  mode: AuthSource;
  mock?: boolean;
}

function DashboardLayout({ children, user, mode, mock }: DashboardLayoutProps) {
  const { status, db, label, mode: healthMode } = useHealthStatus();
  const { timeRange, setTimeRange, workspaceId, setWorkspaceId, workspaces, workspacesLoading, isAdmin } =
    useDashboardState();

  const persona = useMemo(() => {
    const workspaceLabel = workspaceId != null ? `Workspace ${workspaceId}` : "No workspace";
    return `${user.email} · ${workspaceLabel}`;
  }, [user.email, workspaceId]);

  const badgeVariant = (() => {
    if (status === "ok" && (db === "up" || db === "unknown")) return "success" as const;
    if (status === "checking") return "secondary" as const;
    return "warning" as const;
  })();

  const modeLabel = healthMode ?? (mode === "manus" ? "MANUS" : "LOCAL_DEV");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr]">
        <aside className="hidden min-h-screen border-r bg-white md:block">
          <div className="px-6 pb-4 pt-6">
            <p className="text-xs uppercase tracking-wide text-slate-500">Manus dashboard</p>
            <h1 className="text-lg font-semibold text-slate-900">Portfolio Control Center</h1>
          </div>
          <Separator />
          <div className="px-3 py-4">
            <Navigation isAdmin={isAdmin} />
          </div>
          <Separator />
          <div className="px-6 py-4 text-xs text-slate-600">
            <div className="font-semibold text-slate-800">{user.name ?? user.email}</div>
            <div>{persona}</div>
            {mock ? <div className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-amber-700">Mock user mode</div> : null}
          </div>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="border-b bg-white px-4 py-3 shadow-sm md:px-8">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{modeLabel}</Badge>
                    <Badge variant={badgeVariant}>{label}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">User: {persona}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <div className="rounded-full bg-slate-100 px-3 py-1">API base: {window.location.origin}</div>
                  {mock ? <div className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">Mock auth path active</div> : null}
                </div>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <div className="md:hidden">
                    <Navigation orientation="horizontal" isAdmin={isAdmin} />
                  </div>
                  <WorkspaceSelector
                    value={workspaceId}
                    options={workspaces}
                    loading={workspacesLoading}
                    onChange={setWorkspaceId}
                  />
                </div>
                <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
              </div>
            </div>
          </header>

          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6 md:px-8">
            {mock ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Running in local mock mode. Data is scoped to a deterministic dev user so the dashboard remains usable without
                Manus headers.
              </div>
            ) : null}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export default DashboardLayout;
