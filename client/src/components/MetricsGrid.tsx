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

// Determine if a value is "good" or "bad" for color coding
const getValueColor = (value: number | null | undefined, label: string): string => {
  if (value == null) return "text-gray-400";
  
  // Metrics where lower is better
  const lowerIsBetter = ["volatility", "max drawdown", "avg loss"];
  const isLowerBetter = lowerIsBetter.some(m => label.toLowerCase().includes(m));
  
  if (isLowerBetter) {
    return value < 0 ? "text-emerald-400" : "text-red-400";
  }
  
  // For most metrics, positive is good
  return value > 0 ? "text-emerald-400" : value < 0 ? "text-red-400" : "text-gray-300";
};

function MetricsGrid({ rows, title, isLoading, compact }: MetricsGridProps) {
  const hasBenchmark = rows.some(row => row.benchmark != null);
  
  return (
    <div className="w-full rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] overflow-hidden">
      {title && (
        <div className="border-b border-[#2a2a2a] px-4 py-3 text-sm font-semibold text-white">
          {title}
        </div>
      )}
      <div className="overflow-x-auto scrollbar-thin scrollbar-dark">
        {isLoading ? (
          <div className="h-24 skeleton-shimmer m-4 rounded-lg" />
        ) : rows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-400 text-center">
            No metrics available for this selection.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-[#2a2a2a] text-sm">
            <thead className="bg-[#1a1a1a] text-left text-gray-400">
              <tr>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide">Metric</th>
                <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wide">Portfolio</th>
                {hasBenchmark && (
                  <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wide">Benchmark</th>
                )}
                {hasBenchmark && (
                  <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wide">Diff</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {rows.map(row => {
                const portfolioValue = row.portfolio;
                const benchmarkValue = row.benchmark;
                const formatter = row.formatter ?? (Math.abs(portfolioValue ?? 0) <= 5 ? defaultPercent : defaultNumber);
                const diff = portfolioValue != null && benchmarkValue != null 
                  ? portfolioValue - benchmarkValue 
                  : null;
                
                return (
                  <tr 
                    key={row.label} 
                    className={cn(
                      "hover:bg-[#252525] transition-colors",
                      compact ? "text-xs" : "text-sm"
                    )}
                  > 
                    <td className="px-4 py-3 font-medium text-gray-300">{row.label}</td>
                    <td className={cn(
                      "px-4 py-3 text-right font-semibold",
                      getValueColor(portfolioValue, row.label)
                    )}>
                      {portfolioValue != null ? formatter(portfolioValue) : "—"}
                    </td>
                    {hasBenchmark && (
                      <td className="px-4 py-3 text-right text-gray-400">
                        {benchmarkValue != null ? formatter(benchmarkValue) : "—"}
                      </td>
                    )}
                    {hasBenchmark && (
                      <td className={cn(
                        "px-4 py-3 text-right font-medium",
                        diff != null && diff > 0 ? "text-emerald-400" : diff != null && diff < 0 ? "text-red-400" : "text-gray-500"
                      )}>
                        {diff != null ? (
                          <span className="flex items-center justify-end gap-1">
                            {diff > 0 ? "+" : ""}{formatter(diff)}
                            {diff > 0 ? (
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            ) : diff < 0 ? (
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            ) : null}
                          </span>
                        ) : "—"}
                      </td>
                    )}
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
