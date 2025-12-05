import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea } from "recharts";
import { Loader2, TrendingUp, TrendingDown, Activity, Target, Gauge, Info } from "lucide-react";
import { CalendarPnL } from "@/components/CalendarPnL";
import { UnderwaterCurveChart } from "@/components/UnderwaterCurveChart";
import { DayOfWeekHeatmap } from "@/components/DayOfWeekHeatmap";
import { WeekOfMonthHeatmap } from "@/components/WeekOfMonthHeatmap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StrategyCorrelationHeatmap } from "@/components/StrategyCorrelationHeatmap";
import { RollingMetricsChart } from "@/components/RollingMetricsChart";
import { TradeAndRiskStats } from "@/components/TradeAndRiskStats";
import { PortfolioSummary } from "@/components/PortfolioSummary";
import { DistributionSnapshot } from "@/components/DistributionSnapshot";

type TimeRange = 'YTD' | '1Y' | '3Y' | '5Y' | 'ALL';

export default function Overview() {
  const [timeRange, setTimeRange] = useState<TimeRange>('1Y');
  const [startingCapital, setStartingCapital] = useState(100000);
  const [calendarPeriodType, setCalendarPeriodType] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');

  // Helper to format date range
  const getDateRangeText = (range: TimeRange) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.toLocaleString('default', { month: 'short' });
    
    switch (range) {
      case 'YTD':
        return `Jan ${year} - ${month} ${year}`;
      case '1Y':
        return `${month} ${year - 1} - ${month} ${year}`;
      case '3Y':
        return `${year - 3} - ${year}`;
      case '5Y':
        return `${year - 5} - ${year}`;
      case 'ALL':
        return '2010 - 2025';
      default:
        return '';
    }
  };

  const { data, isLoading, error } = trpc.portfolio.overview.useQuery({
    timeRange,
    startingCapital,
  }, {
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch all-time max drawdown for portfolio sizing calculator
  const { data: allTimeData } = trpc.portfolio.overview.useQuery({
    timeRange: 'ALL',
    startingCapital,
  }, {
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes (less frequent updates)
  });

  const { data: breakdownData, isLoading: breakdownLoading } = trpc.portfolio.performanceBreakdown.useQuery({
    timeRange,
    startingCapital,
  }, {
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Data</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { metrics, portfolioEquity, benchmarkEquity } = data;

  // Prepare chart data with timestamps for proper domain calculation
  const chartData = portfolioEquity.map((point, index) => ({
    date: new Date(point.date).toLocaleDateString(),
    timestamp: new Date(point.date).getTime(), // Add timestamp for domain
    portfolio: point.equity,
    benchmark: benchmarkEquity[index]?.equity ?? null, // Use null for missing values (don't plot)
  }));

  // Find max drawdown period for highlighting
  const maxDrawdownPeriod = data.majorDrawdowns && data.majorDrawdowns.length > 0 
    ? data.majorDrawdowns.reduce((max: any, dd: any) => 
        dd.depth < max.depth ? dd : max, data.majorDrawdowns[0])
    : null;
  
  // Find indices for drawdown period
  let drawdownStartIndex = -1;
  let drawdownEndIndex = -1;
  if (maxDrawdownPeriod) {
    const startDate = new Date(maxDrawdownPeriod.startDate).toLocaleDateString();
    const endDate = maxDrawdownPeriod.recoveryDate 
      ? new Date(maxDrawdownPeriod.recoveryDate).toLocaleDateString()
      : chartData[chartData.length - 1]!.date;
    drawdownStartIndex = chartData.findIndex(d => d.date === startDate);
    drawdownEndIndex = chartData.findIndex(d => d.date === endDate);
    if (drawdownEndIndex === -1) drawdownEndIndex = chartData.length - 1;
  }

  // Calculate domain boundaries for X-axis to ensure chart extends full width
  const minTimestamp = chartData.length > 0 ? chartData[0]!.timestamp : 0;
  const maxTimestamp = chartData.length > 0 ? chartData[chartData.length - 1]!.timestamp : 0;

  return (
    <div className="space-y-6">
      {/* Overview Header Section - Bundled */}
      <Card className="bg-gradient-to-br from-card to-card/50 border-2">
        <CardContent className="pt-6 space-y-6">
          {/* Header - Centered Title */}
          <div className="text-center relative">
            <h1 className="text-4xl font-bold tracking-tight mb-2">Portfolio Overview</h1>
            <p className="text-sm text-muted-foreground">
              Combined performance of all intraday strategies
            </p>
            
            {/* Hidden Controls - Absolute positioned, very subtle */}
            <div className="absolute top-0 right-0 flex gap-1.5 opacity-30 hover:opacity-100 transition-opacity">
              <Input
                id="starting-capital"
                type="number"
                value={startingCapital}
                onChange={(e) => setStartingCapital(Number(e.target.value))}
                className="w-[80px] h-6 text-[10px] border-muted-foreground/20"
                placeholder="Capital"
              />
              <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                <SelectTrigger id="time-range" className="w-[80px] h-6 text-[10px] border-muted-foreground/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YTD">YTD</SelectItem>
                  <SelectItem value="1Y">1Y</SelectItem>
                  <SelectItem value="3Y">3Y</SelectItem>
                  <SelectItem value="5Y">5Y</SelectItem>
                  <SelectItem value="ALL">ALL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Key Metrics Cards - At Top */}
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
            {/* Total Return */}
            <div className="bg-muted/30 border border-muted rounded-lg p-4 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Total Return</div>
              <div className={`text-3xl font-bold mb-1 ${
                metrics.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {metrics.totalReturn >= 0 ? '+' : ''}{metrics.totalReturn.toFixed(2)}%
              </div>
              <div className="text-xs text-muted-foreground">
                {metrics.annualizedReturn.toFixed(2)}% annualized
              </div>
            </div>

            {/* Sharpe Ratio */}
            <div className="bg-muted/30 border border-muted rounded-lg p-4 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Sharpe Ratio</div>
              <div className="text-3xl font-bold mb-1">{metrics.sharpeRatio.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">
                Risk-adjusted
              </div>
            </div>

            {/* Sortino Ratio */}
            <div className="bg-muted/30 border border-muted rounded-lg p-4 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Sortino Ratio</div>
              <div className="text-3xl font-bold mb-1">{metrics.sortinoRatio.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">
                Downside risk
              </div>
            </div>

            {/* Win Rate */}
            <div className="bg-muted/30 border border-muted rounded-lg p-4 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Win Rate</div>
              <div className="text-3xl font-bold mb-1">{metrics.winRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">
                {metrics.totalTrades.toLocaleString()} trades
              </div>
            </div>

            {/* Calmar Ratio */}
            <div className="bg-muted/30 border border-muted rounded-lg p-4 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Calmar Ratio</div>
              <div className="text-3xl font-bold mb-1">{metrics.calmarRatio.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">
                Return / DD
              </div>
            </div>
          </div>

          {/* Portfolio Summary */}
          {data.summary && (
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex gap-3">
                <div className="p-2 bg-primary/15 rounded-lg flex-shrink-0 h-fit">
                  <Info className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xs font-semibold text-primary mb-1.5 uppercase tracking-wide">
                    Portfolio Summary
                  </h3>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {data.summary}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Equity Curve Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Equity Curve</CardTitle>
          <CardDescription>
            Portfolio performance vs S&P 500 benchmark
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.15} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 13, fill: '#e5e7eb' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  domain={[0, chartData.length - 1]}
                  type="category"
                  padding={{ left: 0, right: 0 }}
                />
                <YAxis 
                  tick={{ fontSize: 13, fill: '#e5e7eb' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                  labelStyle={{ color: 'black' }}
                />
                <Legend />
                {/* Highlight max drawdown period */}
                {drawdownStartIndex >= 0 && drawdownEndIndex >= 0 && (
                  <ReferenceArea
                    x1={chartData[drawdownStartIndex]!.date}
                    x2={chartData[drawdownEndIndex]!.date}
                    fill="#ef4444"
                    fillOpacity={0.1}
                    label={{ value: 'Max Drawdown Period', position: 'insideTop', fill: '#ef4444', fontSize: 12 }}
                  />
                )}
                <Line 
                  type="monotone" 
                  dataKey="portfolio" 
                  stroke="#60a5fa" 
                  strokeWidth={2}
                  dot={false}
                  name="Portfolio"
                />
                <Line 
                  type="monotone" 
                  dataKey="benchmark" 
                  stroke="#a3a3a3" 
                  strokeWidth={2}
                  dot={false}
                  name="S&P 500"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Underwater Curve - Directly Below Equity Curve */}
      {data.underwater && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Underwater Equity Curve</CardTitle>
              {(data as any).benchmarkUnderwater && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="show-benchmark-underwater"
                    checked={false}
                    onCheckedChange={() => {}}
                  />
                  <Label htmlFor="show-benchmark-underwater" className="text-xs cursor-pointer">
                    Show S&P 500
                  </Label>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={data.underwater.curve.map((point, index) => ({
                    date: chartData[index]?.date || point.date.toLocaleDateString(),
                    drawdown: point.drawdownPercent,
                  }))}
                >
                  <defs>
                    <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.15} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 13, fill: '#e5e7eb' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    domain={[0, chartData.length - 1]}
                    type="category"
                    padding={{ left: 0, right: 0 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 13, fill: '#e5e7eb' }}
                    tickFormatter={(value) => `${value.toFixed(0)}%`}
                    domain={['dataMin', 0]}
                  />
                  <Tooltip 
                    formatter={(value: number) => `${value.toFixed(2)}%`}
                    labelStyle={{ color: 'black' }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="drawdown"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fill="url(#drawdownGradient)"
                    name="Portfolio"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Metrics */}
      {/* Trade & Risk Statistics - Combined panel with comprehensive metrics */}
      {data.tradeStats && <TradeAndRiskStats tradeStats={data.tradeStats} />}

      {/* Major Drawdowns Table - REMOVED per user request */}

      {/* Distribution Snapshot */}
      {data.distribution && <DistributionSnapshot distribution={data.distribution} />}

      {/* Day-of-Week and Week-of-Month Performance */}
      {((data.dayOfWeekBreakdown && data.dayOfWeekBreakdown.length > 0) || 
        (data.weekOfMonthBreakdown && data.weekOfMonthBreakdown.length > 0)) && (
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="day-of-week" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="day-of-week">Day of Week</TabsTrigger>
                <TabsTrigger value="week-of-month">Week of Month</TabsTrigger>
              </TabsList>
              <TabsContent value="day-of-week">
                {data.dayOfWeekBreakdown && <DayOfWeekHeatmap data={data.dayOfWeekBreakdown} />}
              </TabsContent>
              <TabsContent value="week-of-month">
                {data.weekOfMonthBreakdown && <WeekOfMonthHeatmap data={data.weekOfMonthBreakdown} />}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Rolling Metrics */}
      {data.rollingMetrics && data.rollingMetrics.length > 0 && (
        <RollingMetricsChart rollingMetrics={data.rollingMetrics} timeRange={timeRange} />
      )}

      {/* Strategy Correlation Matrix */}
      {data.strategyCorrelationMatrix && (
        <Card>
          <CardContent className="pt-6">
            <StrategyCorrelationHeatmap 
              labels={data.strategyCorrelationMatrix.labels}
              matrix={data.strategyCorrelationMatrix.matrix}
            />
          </CardContent>
        </Card>
      )}

      {/* Monthly Returns Calendar - REMOVED per user request (redundant with Calendar P&L) */}

      {/* Calendar P&L */}
      {breakdownData && (
        <CalendarPnL
          data={breakdownData[calendarPeriodType]}
          periodType={calendarPeriodType}
          onPeriodTypeChange={setCalendarPeriodType}
        />
      )}

      {/* Portfolio Sizing Calculator */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Sizing Calculator</CardTitle>
          <CardDescription>
            Calculate minimum account size for micros and minis at Interactive Brokers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Micro Contracts */}
              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-lg">Micro Contracts</CardTitle>
                  <CardDescription>1/10th the size of mini contracts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Max Drawdown:</span>
                    <span className="font-semibold text-red-600">
                      ${((allTimeData?.metrics.maxDrawdownDollars ?? metrics.maxDrawdownDollars) / 10).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">IBKR Margin Requirement:</span>
                    <span className="font-semibold">$500</span>
                  </div>
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Minimum Account Size:</span>
                      <span className="text-lg font-bold text-primary">
                        ${Math.max(
                          500,
                          Math.ceil(((allTimeData?.metrics.maxDrawdownDollars ?? metrics.maxDrawdownDollars) / 10 + 500) / 100) * 100
                        ).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Based on max drawdown + margin requirement with 0% risk of ruin
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Mini Contracts */}
              <Card className="bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-lg">Mini Contracts</CardTitle>
                  <CardDescription>Standard contract size for retail traders</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Max Drawdown:</span>
                    <span className="font-semibold text-red-600">
                      ${(allTimeData?.metrics.maxDrawdownDollars ?? metrics.maxDrawdownDollars).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">IBKR Margin Requirement:</span>
                    <span className="font-semibold">$5,000</span>
                  </div>
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Minimum Account Size:</span>
                      <span className="text-lg font-bold text-primary">
                        ${Math.max(
                          5000,
                          Math.ceil(((allTimeData?.metrics.maxDrawdownDollars ?? metrics.maxDrawdownDollars) + 5000) / 1000) * 1000
                        ).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Based on max drawdown + margin requirement with 0% risk of ruin
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Note:</strong> These calculations assume trading with the same position sizing as your backtest 
                (${startingCapital.toLocaleString()} starting capital). The minimum account size ensures you can survive 
                the maximum historical drawdown (${(allTimeData?.metrics.maxDrawdownDollars ?? metrics.maxDrawdownDollars).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}) plus maintain required margin. 
                For 0% risk of ruin, your actual trading capital should exceed these minimums.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
