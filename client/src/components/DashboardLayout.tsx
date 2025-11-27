import { PropsWithChildren, useMemo } from "react";
import { useHealthStatus } from "../hooks/useHealthStatus";

function DashboardLayout({ children }: PropsWithChildren) {
  const { status, label } = useHealthStatus();

  const badgeClasses = useMemo(() => {
    if (status === "ok") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (status === "checking") return "bg-slate-100 text-slate-700 border-slate-200";
    return "bg-amber-100 text-amber-700 border-amber-200";
  }, [status]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Manus Dashboard</p>
          <h1 className="text-xl font-semibold text-slate-800">Portfolio Control Center</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-500">Demo user · Manus compatible</div>
          <span className={`text-xs px-3 py-1 rounded-full border ${badgeClasses}`}>{label}</span>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">{children}</main>
    </div>
  );
}

export default DashboardLayout;
