/**
 * Performance Breakdown Component
 * 
 * Displays performance metrics broken down by time periods:
 * - Daily, Weekly, Monthly, Quarterly, Yearly
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TimePeriodPerformance {
  period: string;
  periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate: Date;
  trades: number;
  winningTrades: number;
  losingTrades: number;
  totalPnL: number;
  returnPercent: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
}

interface PerformanceBreakdownData {
  daily: TimePeriodPerformance[];
  weekly: TimePeriodPerformance[];
  monthly: TimePeriodPerformance[];
  quarterly: TimePeriodPerformance[];
  yearly: TimePeriodPerformance[];
}

interface PerformanceBreakdownProps {
  data: PerformanceBreakdownData;
  isLoading?: boolean;
}

export function PerformanceBreakdown({ data, isLoading }: PerformanceBreakdownProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance Breakdown</CardTitle>
          <CardDescription>Loading performance data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Breakdown</CardTitle>
        <CardDescription>
          Performance metrics broken down by time periods
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="monthly" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-4">
            <BreakdownTable data={data.daily} periodType="daily" />
          </TabsContent>

          <TabsContent value="weekly" className="mt-4">
            <EnhancedWeeklyView data={data.weekly} />
          </TabsContent>

          <TabsContent value="monthly" className="mt-4">
            <BreakdownTable data={data.monthly} periodType="monthly" />
          </TabsContent>

          <TabsContent value="quarterly" className="mt-4">
            <BreakdownTable data={data.quarterly} periodType="quarterly" />
          </TabsContent>

          <TabsContent value="yearly" className="mt-4">
            <BreakdownTable data={data.yearly} periodType="yearly" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

interface BreakdownTableProps {
  data: TimePeriodPerformance[];
  periodType: string;
}

function BreakdownTable({ data, periodType }: BreakdownTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No {periodType} data available for the selected time range
      </div>
    );
  }

  // Sort by period descending (most recent first)
  const sortedData = [...data].sort((a, b) => 
    b.startDate.getTime() - a.startDate.getTime()
  );

  // Limit to most recent 20 periods for readability
  const displayData = sortedData.slice(0, 20);

  return (
    <div className="rounded-md border overflow-auto max-h-[500px]">
      <Table>
        <TableHeader className="sticky top-0 bg-background">
          <TableRow>
            <TableHead className="font-semibold">Period</TableHead>
            <TableHead className="text-right font-semibold">Return</TableHead>
            <TableHead className="text-right font-semibold">P&L</TableHead>
            <TableHead className="text-right font-semibold">Trades</TableHead>
            <TableHead className="text-right font-semibold">Win Rate</TableHead>
            <TableHead className="text-right font-semibold">Profit Factor</TableHead>
            <TableHead className="text-right font-semibold">Avg Win</TableHead>
            <TableHead className="text-right font-semibold">Avg Loss</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayData.map((row) => (
            <TableRow key={row.period}>
              <TableCell className="font-medium">
                {formatPeriod(row.period, row.periodType)}
              </TableCell>
              <TableCell 
                className={`text-right font-medium ${
                  row.returnPercent > 0 ? 'text-green-600' : 
                  row.returnPercent < 0 ? 'text-red-600' : ''
                }`}
              >
                {row.returnPercent.toFixed(2)}%
              </TableCell>
              <TableCell 
                className={`text-right ${
                  row.totalPnL > 0 ? 'text-green-600' : 
                  row.totalPnL < 0 ? 'text-red-600' : ''
                }`}
              >
                ${row.totalPnL.toLocaleString(undefined, { 
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0 
                })}
              </TableCell>
              <TableCell className="text-right">
                {row.trades}
                <span className="text-muted-foreground text-xs ml-1">
                  ({row.winningTrades}W/{row.losingTrades}L)
                </span>
              </TableCell>
              <TableCell className="text-right">
                {row.winRate.toFixed(1)}%
              </TableCell>
              <TableCell className="text-right">
                {row.profitFactor.toFixed(2)}
              </TableCell>
              <TableCell className="text-right text-green-600">
                ${row.avgWin.toLocaleString(undefined, { 
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0 
                })}
              </TableCell>
              <TableCell className="text-right text-red-600">
                ${row.avgLoss.toLocaleString(undefined, { 
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0 
                })}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Format period string for display
 */
/**
 * Enhanced Weekly Calendar View
 * Groups weeks by month with summary statistics
 */
function EnhancedWeeklyView({ data }: { data: TimePeriodPerformance[] }) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No weekly data available for the selected time range
      </div>
    );
  }

  // Group weeks by month
  const monthGroups = data.reduce((acc, item) => {
    // Parse week period (format: "YYYY-Www" or "YYYY-MM-DD")
    const year = item.period.substring(0, 4);
    let month: string;
    
    if (item.period.includes('W')) {
      // ISO week format: extract approximate month from week number
      const weekNum = parseInt(item.period.substring(6));
      const approxMonth = Math.floor((weekNum - 1) / 4.3) + 1;
      month = `${year}-${String(approxMonth).padStart(2, '0')}`;
    } else {
      // Date format
      month = item.period.substring(0, 7);
    }
    
    if (!acc[month]) acc[month] = [];
    acc[month].push(item);
    return acc;
  }, {} as Record<string, TimePeriodPerformance[]>);

  // Helper to get color based on P&L
  const getColor = (pnl: number, returnPct: number) => {
    if (pnl === 0) return 'bg-muted text-muted-foreground';
    const intensity = Math.min(Math.abs(returnPct) / 10, 1); // Cap at 10% for max intensity
    if (pnl > 0) {
      return intensity > 0.5 ? 'bg-green-600 text-white' : 'bg-green-400 text-white';
    } else {
      return intensity > 0.5 ? 'bg-red-600 text-white' : 'bg-red-400 text-white';
    }
  };

  const formatCurrency = (value: number) => {
    return value >= 0 
      ? `$${(value / 1000).toFixed(1)}k`
      : `-$${Math.abs(value / 1000).toFixed(1)}k`;
  };

  return (
    <div className="space-y-8">
      {Object.entries(monthGroups).map(([month, weeks]) => {
        const [year, monthNum] = month.split("-");
        const monthName = new Date(parseInt(year!), parseInt(monthNum!) - 1).toLocaleString("default", { month: "long", year: "numeric" });
        
        // Calculate monthly summary
        const monthlyTotal = weeks.reduce((sum, w) => sum + w.totalPnL, 0);
        const monthlyTrades = weeks.reduce((sum, w) => sum + w.trades, 0);
        const monthlyReturn = weeks.reduce((sum, w) => sum + w.returnPercent, 0);
        const avgWinRate = weeks.reduce((sum, w) => sum + w.winRate, 0) / weeks.length;

        return (
          <div key={month} className="space-y-3">
            {/* Month header with summary */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-border">
              <div>
                <h3 className="text-xl font-bold">{monthName}</h3>
                <p className="text-sm text-muted-foreground">{weeks.length} weeks • {monthlyTrades} trades</p>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${monthlyTotal >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(monthlyTotal)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {monthlyReturn.toFixed(1)}% • WR: {avgWinRate.toFixed(0)}%
                </div>
              </div>
            </div>
            
            {/* Week cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {weeks.map((week, idx) => {
                // Format week label
                let weekLabel = `Week ${idx + 1}`;
                if (week.period.includes('W')) {
                  const weekNum = week.period.substring(6);
                  weekLabel = `Week ${weekNum}`;
                }
                
                return (
                  <div
                    key={week.period}
                    className={`p-3 rounded-lg ${getColor(week.totalPnL, week.returnPercent)} transition-all hover:scale-105`}
                  >
                    <div className="text-xs font-medium opacity-90">{weekLabel}</div>
                    <div className="text-xl font-bold mt-1">{formatCurrency(week.totalPnL)}</div>
                    <div className="text-sm mt-1">{week.returnPercent.toFixed(1)}%</div>
                    <div className="text-xs mt-1 opacity-80">{week.trades} trades</div>
                    <div className="text-xs opacity-75">WR: {week.winRate.toFixed(0)}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatPeriod(period: string, periodType: string): string {
  switch (periodType) {
    case 'daily':
      return new Date(period).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    case 'weekly':
      return period; // Already formatted as "2024-W48"
    case 'monthly':
      const [year, month] = period.split('-');
      const date = new Date(parseInt(year!), parseInt(month!) - 1, 1);
      return date.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      });
    case 'quarterly':
      return period; // Already formatted as "2024-Q4"
    case 'yearly':
      return period; // Already formatted as "2024"
    default:
      return period;
  }
}
