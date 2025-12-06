import { trpc } from "@/lib/trpc";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";

type TimeRange = '6M' | 'YTD' | '1Y' | '3Y' | '5Y' | 'ALL';

interface VisualAnalyticsChartsProps {
  timeRange?: TimeRange;
}

export function VisualAnalyticsCharts({ timeRange }: VisualAnalyticsChartsProps) {
  const { data, isLoading } = trpc.portfolio.visualAnalytics.useQuery(
    { timeRange },
    { staleTime: 15 * 60 * 1000 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  // Prepare streak distribution data for chart
  const streakData = [
    ...data.streakDistribution.winStreaks.map(s => ({
      length: `${s.length}W`,
      wins: s.count,
      losses: 0,
    })),
    ...data.streakDistribution.lossStreaks.map(s => ({
      length: `${s.length}L`,
      wins: 0,
      losses: s.count,
    })),
  ].sort((a, b) => {
    const aNum = parseInt(a.length);
    const bNum = parseInt(b.length);
    const aIsWin = a.length.endsWith('W');
    const bIsWin = b.length.endsWith('W');
    
    if (aIsWin && !bIsWin) return -1;
    if (!aIsWin && bIsWin) return 1;
    return aNum - bNum;
  });

  // Prepare day of week data
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayOfWeekData = dayOrder
    .map(day => data.dayOfWeekPerformance.find(d => d.dayOfWeek === day))
    .filter(Boolean)
    .map(day => ({
      day: day!.dayOfWeek.slice(0, 3),
      trades: day!.trades,
      winRate: day!.winRate,
      avgPnL: day!.avgPnL,
    }));

  return (
    <div className="space-y-8">
      {/* Consecutive Wins/Losses Distribution */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Consecutive Wins/Losses Distribution</h3>
          <p className="text-sm text-muted-foreground">
            Frequency of winning and losing streaks
          </p>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={streakData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis 
                dataKey="length" 
                tick={{ fontSize: 12 }}
                label={{ value: 'Streak Length', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                formatter={(value: number) => value}
              />
              <Legend />
              <Bar dataKey="wins" fill="hsl(var(--chart-2))" name="Win Streaks" />
              <Bar dataKey="losses" fill="hsl(var(--chart-1))" name="Loss Streaks" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trade Duration Histogram */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Trade Duration Distribution</h3>
          <p className="text-sm text-muted-foreground">
            Number of trades by holding time
          </p>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.durationDistribution.buckets}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis 
                dataKey="label" 
                tick={{ fontSize: 12 }}
                label={{ value: 'Duration', position: 'insideBottom', offset: -5 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Number of Trades', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                formatter={(value: number, name: string) => {
                  if (name === 'avgPnL') return `$${value.toFixed(2)}`;
                  return value;
                }}
              />
              <Legend />
              <Bar dataKey="count" fill="hsl(var(--chart-3))" name="Trades" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Win/Loss by Day of Week */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Performance by Day of Week</h3>
          <p className="text-sm text-muted-foreground">
            Win rate and average P&L by trading day
          </p>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dayOfWeekData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 12 }}
                label={{ value: 'Win Rate (%)', angle: -90, position: 'insideLeft' }}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                label={{ value: 'Avg P&L ($)', angle: 90, position: 'insideRight' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                formatter={(value: number, name: string) => {
                  if (name === 'Win Rate') return `${value.toFixed(1)}%`;
                  if (name === 'Avg P&L') return `$${value.toFixed(2)}`;
                  return value;
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="winRate" fill="hsl(var(--chart-4))" name="Win Rate" />
              <Bar yAxisId="right" dataKey="avgPnL" fill="hsl(var(--chart-5))" name="Avg P&L" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
