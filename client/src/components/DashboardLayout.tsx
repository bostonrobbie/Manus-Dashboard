import { PropsWithChildren } from "react";
import { Badge } from "./ui/badge";
import { useHealthStatus } from "../hooks/useHealthStatus";

function DashboardLayout({ children }: PropsWithChildren) {
  const { status, db, label } = useHealthStatus();

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
          <div className="text-sm text-slate-500">Demo user · Manus compatible</div>
          <Badge variant={badgeVariant}>{label}</Badge>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">{children}</main>
    </div>
  );
}

export default DashboardLayout;
