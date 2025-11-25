import { PropsWithChildren } from "react";

function DashboardLayout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Manus Dashboard</p>
          <h1 className="text-xl font-semibold text-slate-800">Portfolio Control Center</h1>
        </div>
        <div className="text-sm text-slate-500">Demo user · Manus compatible</div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">{children}</main>
    </div>
  );
}

export default DashboardLayout;
