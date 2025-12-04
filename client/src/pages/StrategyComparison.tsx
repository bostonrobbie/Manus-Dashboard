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
const colors = ["#0f172a", "#1d4ed8", "#22c55e", "#f97316", "#a855f7"];

const PRESETS: TimeRangeSelectorPreset[] = ["YTD", "1Y", "3Y", "5Y", "ALL"];
const LIST_TIME_RANGE: TimeRange = { preset: "ALL" };

type ContractRange = "YTD" | "1Y" | "3Y" | "5Y" | "ALL";

function StrategyComparisonPage() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [timeRange, setTimeRange] = useState<ContractRange>("YTD");
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
      { label: "Sharpe", portfolio: combined.sharpe, formatter: v => v.toFixed(2) },
      { label: "Sortino", portfolio: combined.sortino, formatter: v => v.toFixed(2) },
      { label: "Calmar", portfolio: combined.calmar, formatter: v => v.toFixed(2) },
      { label: "Max drawdown", portfolio: combined.maxDrawdown, formatter: percent },
      { label: "Win rate", portfolio: combined.winRate, formatter: percent },
      { label: "Profit factor", portfolio: combined.profitFactor, formatter: v => v.toFixed(2) },
    ];
    return rows;
  }, [comparison]);

  const comparisonTable = useMemo(() => {
    if (!comparison) return [] as { id: string; name: string; metrics?: (typeof comparison.individualMetrics)[string] }[];
    return Object.entries(comparison.individualMetrics).map(([id, metrics]) => {
      const name = strategyOptions.find(option => option.id === Number(id))?.name ?? `Strategy ${id}`;
      return { id, name, metrics };
    });
  }, [comparison, strategyOptions]);

  const individualSeries = selectedIds.map((id, index) => ({
    key: `strategy-${id}`,
    name: strategyOptions.find(option => option.id === id)?.name ?? `Strategy ${id}`,
    color: colors[index % colors.length],
  }));

  const breakdownMessage = selectedIds.length < 2 || selectedIds.length > 4 ? "Select 2-4 strategies to compare" : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Strategy comparison</h1>
          <p className="text-sm text-slate-600">Compare equity, drawdowns, correlation, and metrics for multiple strategies.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <TimeRangeSelector value={timeRange} onChange={preset => setTimeRange(preset as ContractRange)} presets={PRESETS} />
          <StartingCapitalInput value={startingCapital} onChange={setStartingCapital} />
        </div>
      </div>

      <StrategyMultiSelect
        options={strategyOptions}
        selected={selectedIds}
        onChange={setSelectedIds}
        disabled={strategiesQuery.isLoading}
      />

      {strategiesQuery.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Failed to load strategies.</div>
      ) : null}

      {breakdownMessage ? (
        <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{breakdownMessage}</div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Equity curves</CardTitle>
        </CardHeader>
        <CardContent>
          <EquityChart
            data={equityData}
            series={[{ key: "combined", name: "Combined", color: "#0f172a" }, ...individualSeries]}
            isLoading={compareQuery.isLoading}
            emptyMessage="Select 2-4 strategies to view equity curves."
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Correlation matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <CorrelationHeatmap
              strategyIds={comparison?.correlationMatrix.strategyIds ?? selectedIds}
              matrix={comparison?.correlationMatrix.matrix ?? []}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Combined drawdown</CardTitle>
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

      <MetricsGrid rows={metricsRows} isLoading={compareQuery.isLoading} title="Combined metrics" />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Individual metrics</CardTitle>
        </CardHeader>
        <CardContent>
          {compareQuery.isLoading ? (
            <div className="h-24 animate-pulse rounded bg-slate-100" />
          ) : comparisonTable.length === 0 ? (
            <p className="text-sm text-slate-600">Select strategies to view their metrics side by side.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Strategy</th>
                  <th className="px-3 py-2 text-right font-semibold">Return</th>
                  <th className="px-3 py-2 text-right font-semibold">Sharpe</th>
                  <th className="px-3 py-2 text-right font-semibold">Max DD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparisonTable.map(row => (
                  <tr key={row.id}>
                    <td className="px-3 py-2 font-medium text-slate-800">{row.name}</td>
                    <td className="px-3 py-2 text-right">{row.metrics ? percent(row.metrics.totalReturn) : "—"}</td>
                    <td className="px-3 py-2 text-right">{row.metrics ? row.metrics.sharpe.toFixed(2) : "—"}</td>
                    <td className="px-3 py-2 text-right">{row.metrics ? percent(row.metrics.maxDrawdown) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default StrategyComparisonPage;
