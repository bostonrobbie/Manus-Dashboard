import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import DrawdownChart from "../components/DrawdownChart";
import EquityChart from "../components/EquityChart";
import MetricsGrid from "../components/MetricsGrid";
import StartingCapitalInput from "../components/StartingCapitalInput";
import TimeRangeSelector, { TimeRangeSelectorPreset } from "../components/TimeRangeSelector";
import TradesTable from "../components/TradesTable";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { trpc } from "../lib/trpc";

const percent = (value: number) => `${value.toFixed(2)}%`;
const currency = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

type ContractRange = "YTD" | "1Y" | "3Y" | "5Y" | "ALL";
const PRESETS: TimeRangeSelectorPreset[] = ["YTD", "1Y", "3Y", "5Y", "ALL"];

function StrategyDetailPage() {
  const params = useParams();
  const strategyId = Number(params.strategyId);
  const [timeRange, setTimeRange] = useState<ContractRange>("YTD");
  const [startingCapital, setStartingCapital] = useState<number>(100000);

  const detailQuery = trpc.portfolio.strategyDetail.useQuery(
    { strategyId, timeRange, startingCapital },
    { enabled: Number.isFinite(strategyId), retry: 1 },
  );

  const detail = detailQuery.data;
  const equityData = useMemo(
    () => detail?.equityCurve?.map(point => ({ date: point.date, equity: point.equity })) ?? [],
    [detail?.equityCurve],
  );
  const drawdownData = useMemo(
    () => detail?.drawdownCurve?.map(point => ({ date: point.date, drawdown: point.drawdown })) ?? [],
    [detail?.drawdownCurve],
  );

  const metricsRows = useMemo(
    () =>
      detail?.metrics
        ? [
            { label: "Total return", portfolio: detail.metrics.totalReturn, formatter: percent },
            { label: "Annualized return", portfolio: detail.metrics.annualizedReturn, formatter: percent },
            { label: "Volatility", portfolio: detail.metrics.volatility, formatter: percent },
            { label: "Sharpe", portfolio: detail.metrics.sharpe, formatter: v => v.toFixed(2) },
            { label: "Sortino", portfolio: detail.metrics.sortino, formatter: v => v.toFixed(2) },
            { label: "Calmar", portfolio: detail.metrics.calmar, formatter: v => v.toFixed(2) },
            { label: "Max drawdown", portfolio: detail.metrics.maxDrawdown, formatter: percent },
            { label: "Win rate", portfolio: detail.metrics.winRate, formatter: percent },
            { label: "Profit factor", portfolio: detail.metrics.profitFactor, formatter: v => v.toFixed(2) },
            { label: "Total trades", portfolio: detail.metrics.totalTrades, formatter: v => v.toFixed(0) },
            { label: "Avg win", portfolio: detail.metrics.avgWin, formatter: currency.format },
            { label: "Avg loss", portfolio: detail.metrics.avgLoss, formatter: currency.format },
            { label: "Avg holding (days)", portfolio: detail.metrics.avgHoldingPeriod, formatter: v => v.toFixed(1) },
          ]
        : [],
    [detail?.metrics],
  );

  const trades = useMemo(
    () => detail?.recentTrades?.map(trade => ({ ...trade, quantity: (trade as any).quantity ?? 0 })) ?? [],
    [detail?.recentTrades],
  );

  const breakdown = detail?.breakdown;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{detail?.strategy?.name ?? "Strategy detail"}</h1>
          <p className="text-sm text-slate-600">{detail?.strategy?.description ?? "Performance for the selected strategy."}</p>
          {detail?.strategy ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1 uppercase">{detail.strategy.type}</span>
              {detail.strategy.symbol ? <span className="rounded-full bg-slate-100 px-3 py-1">Symbol: {detail.strategy.symbol}</span> : null}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <TimeRangeSelector value={timeRange} onChange={preset => setTimeRange(preset as ContractRange)} presets={PRESETS} />
          <StartingCapitalInput value={startingCapital} onChange={setStartingCapital} />
        </div>
      </div>

      {detailQuery.isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Unable to load strategy details.</div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Equity curve</CardTitle>
          </CardHeader>
          <CardContent>
            <EquityChart
              data={equityData}
              series={[{ key: "equity", name: "Equity", color: "#0f172a" }]}
              isLoading={detailQuery.isLoading}
              dataTestId="strategy-equity-chart"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Drawdown</CardTitle>
          </CardHeader>
          <CardContent>
            <DrawdownChart
              data={drawdownData}
              series={[{ key: "drawdown", name: "Drawdown", color: "#f97316" }]}
              isLoading={detailQuery.isLoading}
              valueFormatter={value => `${value.toFixed(2)}%`}
            />
          </CardContent>
        </Card>
      </div>

      <MetricsGrid rows={metricsRows} isLoading={detailQuery.isLoading} title="Strategy metrics" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-full">
          <TradesTable trades={trades} isLoading={detailQuery.isLoading} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Performance breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {detailQuery.isLoading ? (
              <div className="h-24 animate-pulse rounded bg-slate-100" />
            ) : !breakdown ? (
              <p className="text-sm text-slate-600">No breakdown data.</p>
            ) : (
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-800">Daily</td>
                    <td className="px-3 py-2 text-right">{percent(breakdown.daily)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-800">Weekly</td>
                    <td className="px-3 py-2 text-right">{percent(breakdown.weekly)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-800">Monthly</td>
                    <td className="px-3 py-2 text-right">{percent(breakdown.monthly)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-800">Quarterly</td>
                    <td className="px-3 py-2 text-right">{percent(breakdown.quarterly)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-800">Year to date</td>
                    <td className="px-3 py-2 text-right">{percent(breakdown.ytd)}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default StrategyDetailPage;
