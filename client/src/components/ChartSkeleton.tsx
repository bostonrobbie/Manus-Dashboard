import type { ReactNode } from "react";

interface ChartSkeletonProps {
  title: string;
  children?: ReactNode;
}

function ChartSkeleton({ title, children }: ChartSkeletonProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <span className="text-xs text-slate-500">Live</span>
      </div>
      <div className="min-h-[180px] text-slate-500 text-sm">
        {children ?? <div className="h-[160px] bg-slate-100 rounded" />}
      </div>
    </div>
  );
}

export default ChartSkeleton;
