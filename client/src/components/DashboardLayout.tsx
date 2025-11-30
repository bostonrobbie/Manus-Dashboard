import { PropsWithChildren, useMemo } from "react";

import type { AuthSource, SharedAuthUser } from "@shared/types/auth";
import { Badge } from "./ui/badge";
import { useHealthStatus } from "../hooks/useHealthStatus";

interface DashboardLayoutProps extends PropsWithChildren {
  user: SharedAuthUser;
  mode: AuthSource;
  mock?: boolean;
}

function DashboardLayout({ children, user, mode, mock }: DashboardLayoutProps) {
  const { status, db, label } = useHealthStatus();

  const persona = useMemo(() => {
    const workspaceLabel = user.workspaceId != null ? `Workspace ${user.workspaceId}` : "No workspace";
    return `${user.email} · ${workspaceLabel}`;
  }, [user.email, user.workspaceId]);

  const badgeVariant = (() => {
    if (status === "ok" && db === "up") return "success" as const;
    if (status === "checking") return "secondary" as const;
    return "warning" as const;
  })();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between bg-white px-6 py-4 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Manus Dashboard</p>
          <h1 className="text-xl font-semibold text-slate-800">Portfolio Control Center</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-500">
            {persona}
            <span className="ml-2 text-xs text-slate-400">{mode === "manus" ? "Manus session" : "Local mode"}</span>
            {mock ? <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Mock user</span> : null}
          </div>
          <Badge variant={badgeVariant}>{label}</Badge>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-4 px-6 py-8">
        {mock ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Running in local mock mode. Data is scoped to a deterministic dev user so the dashboard remains usable without Manus
            headers.
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}

export default DashboardLayout;
