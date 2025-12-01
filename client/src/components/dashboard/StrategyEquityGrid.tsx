import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import type { StrategySummaryRow } from "./StrategyStatsTable";

export interface StrategyEquitySeries extends StrategySummaryRow {
  equityCurve?: { date: string; value: number }[];
}

interface StrategyEquityGridProps {
  strategies: StrategyEquitySeries[];
  title?: string;
}

export function StrategyEquityGrid({ strategies, title = "Strategy equity" }: StrategyEquityGridProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {strategies.map(strategy => (
          <div key={strategy.strategyId} className="h-40 rounded border border-slate-100 p-2">
            <div className="mb-1 text-xs font-semibold text-slate-700">{strategy.name}</div>
            <div className="h-32">
              {strategy.equityCurve?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={strategy.equityCurve} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} />
                    <YAxis
                      tickFormatter={val => `$${Number(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip formatter={val => `$${Number(val).toLocaleString()}`} />
                    <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-500">No data</div>
              )}
            </div>
          </div>
        ))}
        {strategies.length === 0 ? (
          <div className="col-span-full flex h-24 items-center justify-center text-sm text-slate-500">
            Select strategies to view equity curves.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
