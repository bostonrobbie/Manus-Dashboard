import { cn } from "../lib/utils";

export interface MetricRow {
  label: string;
  portfolio?: number | null;
  benchmark?: number | null;
  formatter?: (value: number) => string;
}

interface MetricsGridProps {
  rows: MetricRow[];
  title?: string;
  isLoading?: boolean;
  compact?: boolean;
}

const defaultPercent = (value: number) => `${value.toFixed(2)}%`;
const defaultNumber = (value: number) => value.toLocaleString();

function MetricsGrid({ rows, title, isLoading, compact }: MetricsGridProps) {
  return (
    <div className="w-full rounded-lg border border-slate-200 bg-white">
      {title ? <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">{title}</div> : null}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="h-24 animate-pulse rounded bg-slate-100" />
        ) : rows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-500">No metrics available for this selection.</div>
        ) : (
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2 font-semibold">Metric</th>
                <th className="px-4 py-2 text-right font-semibold">Portfolio</th>
                {rows.some(row => row.benchmark != null) ? (
                  <th className="px-4 py-2 text-right font-semibold">Benchmark</th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(row => {
                const portfolioValue = row.portfolio;
                const benchmarkValue = row.benchmark;
                const formatter = row.formatter ?? (Math.abs(portfolioValue ?? 0) <= 5 ? defaultPercent : defaultNumber);
                return (
                  <tr key={row.label} className={cn("hover:bg-slate-50", compact ? "text-xs" : "text-sm")}> 
                    <td className="px-4 py-2 font-medium text-slate-800">{row.label}</td>
                    <td className="px-4 py-2 text-right text-slate-900">
                      {portfolioValue != null ? formatter(portfolioValue) : "—"}
                    </td>
                    {rows.some(r => r.benchmark != null) ? (
                      <td className="px-4 py-2 text-right text-slate-700">
                        {benchmarkValue != null ? formatter(benchmarkValue) : "—"}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default MetricsGrid;
