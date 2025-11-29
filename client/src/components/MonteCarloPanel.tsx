import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import MetricCard from "./MetricCard";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import type { MonteCarloResult } from "@shared/types/portfolio";

interface MonteCarloPanelProps {
  result?: MonteCarloResult;
  days: number;
  simulations: number;
  isLoading: boolean;
  onRerun: (params: { days: number; simulations: number }) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function MonteCarloPanel({ result, days, simulations, isLoading, onRerun }: MonteCarloPanelProps) {
  const [daysInput, setDaysInput] = useState(days);
  const [simulationsInput, setSimulationsInput] = useState(simulations);

  const currency = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    [],
  );
  const percent = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    [],
  );

  useEffect(() => setDaysInput(days), [days]);
  useEffect(() => setSimulationsInput(simulations), [simulations]);

  const chartData = useMemo(() => {
    if (!result) return [];
    return result.futureDates.map((date, idx) => ({
      date,
      p10: result.p10[idx] ?? result.currentEquity,
      p50: result.p50[idx] ?? result.currentEquity,
      p90: result.p90[idx] ?? result.currentEquity,
    }));
  }, [result]);

  const summaryStats = useMemo(() => {
    if (!result || !result.finalEquities.length) {
      return { medianFinal: 0, p10Final: 0, p90Final: 0, probBelowCurrent: 0 };
    }
    const sorted = [...result.finalEquities].sort((a, b) => a - b);
    const medianFinal = sorted[Math.floor(sorted.length / 2)] ?? 0;
    const idx10 = Math.floor(0.1 * (sorted.length - 1));
    const idx90 = Math.floor(0.9 * (sorted.length - 1));
    const p10Final = sorted[idx10] ?? 0;
    const p90Final = sorted[idx90] ?? 0;
    const below = sorted.filter(v => v < result.currentEquity).length;
    const probBelowCurrent = sorted.length ? (below / sorted.length) * 100 : 0;

    return { medianFinal, p10Final, p90Final, probBelowCurrent };
  }, [result]);

  const handleRun = () => {
    const nextDays = clamp(Number(daysInput) || days, 7, 365);
    const nextSims = clamp(Number(simulationsInput) || simulations, 100, 5000);
    onRerun({ days: nextDays, simulations: nextSims });
  };

  const hasData = Boolean(result && result.futureDates.length);

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-sm">Monte Carlo projections</CardTitle>
            <p className="text-xs text-slate-500">Future paths based on your historical trade distribution.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
            <label className="flex items-center gap-1">
              <span className="text-slate-500">Days</span>
              <input
                type="number"
                min={7}
                max={365}
                value={daysInput}
                onChange={e => setDaysInput(Number(e.target.value) || 0)}
                className="h-9 w-20 rounded-md border border-slate-200 px-2"
              />
            </label>
            <label className="flex items-center gap-1">
              <span className="text-slate-500">Simulations</span>
              <input
                type="number"
                min={100}
                max={5000}
                value={simulationsInput}
                onChange={e => setSimulationsInput(Number(e.target.value) || 0)}
                className="h-9 w-24 rounded-md border border-slate-200 px-2"
              />
            </label>
            <Button type="button" size="sm" onClick={handleRun} disabled={isLoading}>
              Run
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="h-[240px] rounded-lg bg-slate-100" />
        ) : !hasData ? (
          <div className="text-sm text-slate-500">
            Not enough data to run Monte Carlo yet. Add more trades to see projections.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <MetricCard label="Current equity" value={currency.format(result?.currentEquity ?? 0)} />
              <MetricCard label="Median final" value={currency.format(summaryStats.medianFinal)} />
              <MetricCard
                label="10th - 90th %"
                value={`${currency.format(summaryStats.p10Final)} - ${currency.format(summaryStats.p90Final)}`}
              />
              <MetricCard
                label="Prob. below current"
                value={percent.format(summaryStats.probBelowCurrent / 100)}
                helper="Chance finishing under today’s equity"
              />
            </div>

            <Separator />

            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData} margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="p10" stroke="#f59e0b" name="P10 - bearish" />
                  <Line type="monotone" dataKey="p50" stroke="#0f172a" name="P50 - median" />
                  <Line type="monotone" dataKey="p90" stroke="#16a34a" name="P90 - bullish" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MonteCarloPanel;
