import { useMemo, useState } from "react";

import CorrelationHeatmap from "../components/CorrelationHeatmap";
import DrawdownChart from "../components/DrawdownChart";
import EquityChart from "../components/EquityChart";
import MetricsGrid from "../components/MetricsGrid";
import StartingCapitalInput from "../components/StartingCapitalInput";
import StrategyMultiSelect from "../components/StrategyMultiSelect";
import TimeRangeSelector, { TimeRangeSelectorPreset } from "../components/TimeRangeSelector";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { trpc } from "../lib/trpc";
import type { StrategySummary, TimeRange } from "@shared/types/portfolio";

const percent = (value: number) => `${value.toFixed(2)}%`;

// Enhanced color palette for better visibility on dark backgrounds
const STRATEGY_COLORS = [
  "#3b82f6", // Blue
  "#22c55e", // Green
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#84cc16", // Lime
];

const PRESETS: TimeRangeSelectorPreset[] = ["YTD", "1Y", "3Y", "5Y", "ALL"];
const LIST_TIME_RANGE: TimeRange = { preset: "ALL" };

type ContractRange = "YTD" | "1Y" | "3Y" | "5Y" | "ALL";

function StrategyComparisonPage() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [timeRange, setTimeRange] = useState<ContractRange>("1Y");
  const [startingCapital, setStartingCapital] = useState<number>(100000);

  const strategiesQuery = trpc.portfolio.strategyComparison.useQuery(
    { page: 1, pageSize: 50, sortBy: "name", sortOrder: "asc", filterType: "all", timeRange: LIST_TIME_RANGE },
    { retry: 1 },
  );

  const compareQuery = trpc.portfolio.compareStrategies.useQuery(
    { strategyIds: selectedIds, timeRange, startingCapital },
    { enabled: selectedIds.length >= 2 && selectedIds.length <= 4, retry: 1 },
  );

  const strategyOptions: StrategySummary[] = useMemo(
    () => strategiesQuery.data?.rows?.map(row => ({ id: row.strategyId, name: row.name, type: row.type })) ?? [],
    [strategiesQuery.data?.rows],
  );

  const comparison = compareQuery.data;

  const combinedDrawdowns = useMemo(() => {
    if (!comparison?.combinedCurve?.length) return [] as { date: string; drawdown: number }[];
    let peak = comparison.combinedCurve[0].equity;
    return comparison.combinedCurve.map(point => {
      peak = Math.max(peak, point.equity);
      const drawdown = peak > 0 ? ((point.equity - peak) / peak) * 100 : 0;
      return { date: point.date, drawdown };
    });
  }, [comparison]);

  const equityData = useMemo(() => {
    if (!comparison) return [] as Array<Record<string, string | number>>;
    const dates = new Set<string>();
    comparison.combinedCurve.forEach(point => dates.add(point.date));
    Object.values(comparison.individualCurves).forEach(curve => curve.forEach(point => dates.add(point.date)));
    return Array.from(dates)
      .sort()
      .map(date => {
        const row: Record<string, string | number> = { date };
        row.combined = comparison.combinedCurve.find(point => point.date === date)?.equity ?? null;
        for (const [id, curve] of Object.entries(comparison.individualCurves)) {
          row[`strategy-${id}`] = curve.find(point => point.date === date)?.equity ?? null;
        }
        return row;
      });
  }, [comparison]);

  const metricsRows = useMemo(() => {
    if (!comparison) return [];
    const combined = comparison.combinedMetrics;
    const rows = [
      { label: "Total return", portfolio: combined.totalReturn, formatter: percent },
      { label: "Annualized return", portfolio: combined.annualizedReturn, formatter: percent },
      { label: "Volatility", portfolio: combined.volatility, formatter: percent },
      { label: "Sharpe", portfolio: combined.sharpe, formatter: (v: number) => v.toFixed(2) },
      { label: "Sortino", portfolio: combined.sortino, formatter: (v: number) => v.toFixed(2) },
      { label: "Calmar", portfolio: combined.calmar, formatter: (v: number) => v.toFixed(2) },
      { label: "Max drawdown", portfolio: combined.maxDrawdown, formatter: percent },
      { label: "Win rate", portfolio: combined.winRate, formatter: percent },
      { label: "Profit factor", portfolio: combined.profitFactor, formatter: (v: number) => v.toFixed(2) },
    ];
    return rows;
  }, [comparison]);

  const comparisonTable = useMemo(() => {
    if (!comparison) return [] as { id: string; name: string; color: string; metrics?: (typeof comparison.individualMetrics)[string] }[];
    return Object.entries(comparison.individualMetrics).map(([id, metrics], index) => {
      const name = strategyOptions.find(option => option.id === Number(id))?.name ?? `Strategy ${id}`;
      return { id, name, color: STRATEGY_COLORS[index % STRATEGY_COLORS.length], metrics };
    });
  }, [comparison, strategyOptions]);

  const individualSeries = selectedIds.map((id, index) => ({
    key: `strategy-${id}`,
    name: strategyOptions.find(option => option.id === id)?.name ?? `Strategy ${id}`,
    color: STRATEGY_COLORS[index % STRATEGY_COLORS.length],
  }));

  const breakdownMessage = selectedIds.length < 2 || selectedIds.length > 4 ? "Select 2-4 strategies to compare" : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white">Strategy Comparison</h1>
          <p className="text-sm text-gray-400">Compare equity, drawdowns, correlation, and metrics for multiple strategies.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <TimeRangeSelector value={timeRange} onChange={preset => setTimeRange(preset as ContractRange)} presets={PRESETS} />
          <StartingCapitalInput value={startingCapital} onChange={setStartingCapital} />
        </div>
      </div>

      {/* Strategy selector */}
      <Card className="bg-[#1e1e1e] border-[#2a2a2a]">
        <CardContent className="p-4">
          <StrategyMultiSelect
            options={strategyOptions}
            selected={selectedIds}
            onChange={setSelectedIds}
            disabled={strategiesQuery.isLoading}
          />
        </CardContent>
      </Card>

      {strategiesQuery.isError && (
        <div className="rounded-lg border border-red-800/50 bg-red-900/20 px-4 py-3 text-sm text-red-400">
          Failed to load strategies. Please try again.
        </div>
      )}

      {breakdownMessage && (
        <div className="rounded-lg border border-dashed border-[#3a3a3a] bg-[#1a1a1a] px-4 py-3 text-sm text-gray-400 text-center">
          {breakdownMessage}
        </div>
      )}

      {/* Equity curves chart */}
      <Card className="bg-[#1e1e1e] border-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-sm text-white">Equity Curves</CardTitle>
        </CardHeader>
        <CardContent>
          <EquityChart
            data={equityData}
            series={[
              { key: "combined", name: "Combined", color: "#ffffff" },
              ...individualSeries
            ]}
            isLoading={compareQuery.isLoading}
            emptyMessage="Select 2-4 strategies to view equity curves."
            dataTestId="combined-equity-chart"
            height={360}
          />
        </CardContent>
      </Card>

      {/* Correlation and Drawdown grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-[#1e1e1e] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-sm text-white">Correlation Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <CorrelationHeatmap
              strategyIds={comparison?.correlationMatrix.strategyIds ?? selectedIds}
              matrix={comparison?.correlationMatrix.matrix ?? []}
            />
          </CardContent>
        </Card>

        <Card className="bg-[#1e1e1e] border-[#2a2a2a]">
          <CardHeader>
            <CardTitle className="text-sm text-white">Combined Drawdown</CardTitle>
          </CardHeader>
          <CardContent>
            <DrawdownChart
              data={combinedDrawdowns}
              series={[{ key: "drawdown", name: "Combined", color: "#f97316" }]}
              isLoading={compareQuery.isLoading}
              valueFormatter={value => `${value.toFixed(2)}%`}
              emptyMessage="Select strategies to view drawdowns."
            />
          </CardContent>
        </Card>
      </div>

      {/* Combined metrics */}
      <MetricsGrid rows={metricsRows} isLoading={compareQuery.isLoading} title="Combined Metrics" />

      {/* Individual metrics table */}
      <Card className="bg-[#1e1e1e] border-[#2a2a2a]">
        <CardHeader>
          <CardTitle className="text-sm text-white">Individual Strategy Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          {compareQuery.isLoading ? (
            <div className="h-24 skeleton-shimmer rounded-lg" />
          ) : comparisonTable.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Select strategies to view their metrics side by side.</p>
          ) : (
            <div className="overflow-x-auto scrollbar-thin scrollbar-dark">
              <table className="w-full text-sm min-w-[500px]">
                <thead className="bg-[#1a1a1a] text-left text-gray-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold rounded-tl-lg">Strategy</th>
                    <th className="px-4 py-3 text-right font-semibold">Return</th>
                    <th className="px-4 py-3 text-right font-semibold">Sharpe</th>
                    <th className="px-4 py-3 text-right font-semibold">Max DD</th>
                    <th className="px-4 py-3 text-right font-semibold rounded-tr-lg">Win Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a2a]">
                  {comparisonTable.map(row => (
                    <tr key={row.id} className="hover:bg-[#252525] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0" 
                            style={{ backgroundColor: row.color }}
                          />
                          <span className="font-medium text-white">{row.name}</span>
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${
                        row.metrics && row.metrics.totalReturn > 0 ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {row.metrics ? percent(row.metrics.totalReturn) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {row.metrics ? row.metrics.sharpe.toFixed(2) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-red-400">
                        {row.metrics ? percent(row.metrics.maxDrawdown) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        {row.metrics ? percent(row.metrics.winRate) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default StrategyComparisonPage;
