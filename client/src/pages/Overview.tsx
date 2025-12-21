import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea } from "recharts";
import { Loader2, TrendingUp, TrendingDown, Activity, Target, Gauge, Info, Settings, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CalendarPnL } from "@/components/CalendarPnL";
import { UnderwaterCurveChart } from "@/components/UnderwaterCurveChart";
import { DayOfWeekHeatmap } from "@/components/DayOfWeekHeatmap";
import { WeekOfMonthHeatmap } from "@/components/WeekOfMonthHeatmap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StrategyCorrelationHeatmap } from "@/components/StrategyCorrelationHeatmap";
import { RollingMetricsChart } from "@/components/RollingMetricsChart";
import { TradeAndRiskStats } from "@/components/TradeAndRiskStats";
import { PortfolioSummary } from "@/components/PortfolioSummary";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { DistributionSnapshot } from "@/components/DistributionSnapshot";
import { MetricTooltip, METRIC_TOOLTIPS } from "@/components/MetricTooltip";

type TimeRange = '6M' | 'YTD' | '1Y' | '3Y' | '5Y' | '10Y' | 'ALL';

export default function Overview() {
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
  const [startingCapital, setStartingCapital] = useState(100000);
  const [contractSize, setContractSize] = useState<'mini' | 'micro'>('mini');
  const [calendarPeriodType, setCalendarPeriodType] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('yearly');
  const [showBenchmark, setShowBenchmark] = useState(true);
  

  // Helper to format date range
  const getDateRangeText = (range: TimeRange) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.toLocaleString('default', { month: 'short' });
    
    switch (range) {
      case '6M': {
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(now.getMonth() - 6);
        const prevMonth = sixMonthsAgo.toLocaleString('default', { month: 'short' });
        return `${prevMonth} ${sixMonthsAgo.getFullYear()} - ${month} ${year}`;
      }
      case 'YTD':
        return `Jan ${year} - ${month} ${year}`;
      case '1Y':
        return `${month} ${year - 1} - ${month} ${year}`;
      case '3Y':
        return `${year - 3} - ${year}`;
      case '5Y':
        return `${year - 5} - ${year}`;
      case '10Y':
        return `${year - 10} - ${year}`;
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
  
  // Contract size multiplier: micro = 1/10 of mini
  const contractMultiplier = contractSize === 'micro' ? 0.1 : 1;



  // Prepare chart data with timestamps for proper domain calculation
  const chartData = portfolioEquity.map((point, index) => ({
    date: new Date(point.date).toLocaleDateString(),
    timestamp: new Date(point.date).getTime(), // Add timestamp for domain
    portfolio: point.equity * contractMultiplier,
    benchmark: benchmarkEquity[index]?.equity ? benchmarkEquity[index].equity * contractMultiplier : null,

  }));

  // Get top 3 major drawdown periods for highlighting
  const top3Drawdowns = data.majorDrawdowns && data.majorDrawdowns.length > 0
    ? data.majorDrawdowns.slice(0, 3).map((dd: any, index: number) => {
        const startDate = new Date(dd.startDate).toLocaleDateString();
        const endDate = dd.recoveryDate 
          ? new Date(dd.recoveryDate).toLocaleDateString()
          : chartData[chartData.length - 1]!.date;
        const startIndex = chartData.findIndex(d => d.date === startDate);
        let endIndex = chartData.findIndex(d => d.date === endDate);
        if (endIndex === -1) endIndex = chartData.length - 1;
        
        return {
          startIndex,
          endIndex,
          depthPct: dd.depthPct,
          label: index === 0 ? 'Max Drawdown' : index === 1 ? '2nd Drawdown' : '3rd Drawdown',
          color: index === 0 ? '#ef4444' : index === 1 ? '#f97316' : '#f59e0b',
        };
      }).filter((dd: any) => dd.startIndex >= 0 && dd.endIndex >= 0)
    : [];

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
            
            {/* Settings Dropdown - Top Right */}
            <div className="absolute top-0 right-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Account Settings</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="p-2 space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="starting-capital-setting" className="text-xs">Starting Capital</Label>
                      <Input
                        id="starting-capital-setting"
                        type="number"
                        value={startingCapital}
                        onChange={(e) => setStartingCapital(Number(e.target.value))}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="contract-size-setting" className="text-xs">Contract Size</Label>
                      <Select value={contractSize} onValueChange={(v) => setContractSize(v as 'mini' | 'micro')}>
                        <SelectTrigger id="contract-size-setting" className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mini">Mini Contracts</SelectItem>
                          <SelectItem value="micro">Micro Contracts</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {data.tradeStats?.riskOfRuinDetails?.minBalanceForZeroRisk && (
                    <DropdownMenuItem 
                      onClick={() => {
                        const minBalance = Math.ceil(data.tradeStats.riskOfRuinDetails!.minBalanceForZeroRisk);
                        setStartingCapital(minBalance);
                      }}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium">Set to Zero RoR Capital</span>
                        <span className="text-[10px] text-muted-foreground">
                          ${Math.ceil(data.tradeStats.riskOfRuinDetails.minBalanceForZeroRisk).toLocaleString()}
                        </span>
                      </div>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Key Metrics Cards - At Top */}
          <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {/* Total Return */}
            <div className="bg-muted/30 border border-muted rounded-lg p-4 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Total Return</div>
              <div className={`text-3xl font-bold mb-1 ${
                metrics.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {metrics.totalReturn >= 0 ? '+' : ''}${Math.round((metrics.totalReturn / 100) * startingCapital).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {metrics.totalReturn.toFixed(2)}% ({metrics.annualizedReturn.toFixed(2)}% ann.)
              </div>
            </div>

            {/* Max Drawdown */}
            <div className="bg-muted/30 border border-muted rounded-lg p-4 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Max Drawdown</div>
              <div className="text-3xl font-bold mb-1 text-amber-500">-${Math.round((metrics.maxDrawdown / 100) * startingCapital).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">
                {metrics.maxDrawdown.toFixed(2)}% peak to trough
              </div>
            </div>

            {/* Sortino Ratio - Daily (Industry Standard) */}
            <div className="bg-muted/30 border border-muted rounded-lg p-4 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center justify-center gap-1">
                Sortino Ratio
                <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 bg-emerald-500/10 text-emerald-500 border-emerald-500/30">Daily</Badge>
                <MetricTooltip {...METRIC_TOOLTIPS.sortinoDaily} />
              </div>
              <div className="text-3xl font-bold mb-1">{data.dailyMetrics?.sortino?.toFixed(2) ?? metrics.sortinoRatio.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">
                Trade-based: {metrics.sortinoRatio.toFixed(2)}
              </div>
            </div>

            {/* Sharpe Ratio - Daily (Industry Standard) */}
            <div className="bg-muted/30 border border-muted rounded-lg p-4 text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center justify-center gap-1">
                Sharpe Ratio
                <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 bg-emerald-500/10 text-emerald-500 border-emerald-500/30">Daily</Badge>
                <MetricTooltip {...METRIC_TOOLTIPS.sharpeDaily} />
              </div>
              <div className="text-3xl font-bold mb-1">{data.dailyMetrics?.sharpe?.toFixed(2) ?? metrics.sharpeRatio.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">
                Trade-based: {metrics.sharpeRatio.toFixed(2)}
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
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                Equity Curve
                <Badge variant="outline" className="text-xs font-normal text-green-400 border-green-400/30">
                  <Clock className="w-3 h-3 mr-1" />
                  Live
                </Badge>
              </CardTitle>
              <CardDescription>
                Portfolio performance vs S&P 500 benchmark
              </CardDescription>
            </div>
            {/* Time Range Selector */}
            <div className="flex gap-1 flex-wrap">
              {(['6M', 'YTD', '1Y', '5Y', '10Y', 'ALL'] as const).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setTimeRange(range)}
                >
                  {range}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] sm:h-[350px] md:h-[400px] lg:h-[450px] -mx-2 sm:mx-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 5, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.2} vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 11, fill: '#ffffff' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.4)' }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval="preserveStartEnd"
                  tickCount={8}
                  domain={[0, chartData.length - 1]}
                  type="category"
                  padding={{ left: 20, right: 20 }}
                  label={{ value: 'Date', position: 'insideBottom', offset: -5, fill: '#ffffff', fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: '#ffffff' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.4)' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  width={50}
                  label={{ value: 'Portfolio Value', angle: -90, position: 'insideLeft', fill: '#ffffff', fontSize: 12, dx: -5 }}
                />
                <Tooltip 
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                  labelStyle={{ color: 'black' }}
                />
                <Legend 
                  content={(props: any) => {
                    return (
                      <div className="flex justify-center gap-6 mt-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-0.5 bg-[#60a5fa]"></div>
                          <span className="text-sm">Portfolio</span>
                        </div>
                        <div 
                          className="flex items-center gap-2 cursor-pointer hover:opacity-80"
                          onClick={() => setShowBenchmark(!showBenchmark)}
                        >
                          <div className={`w-4 h-0.5 ${showBenchmark ? 'bg-[#a3a3a3]' : 'bg-muted'}`}></div>
                          <span className={`text-sm ${!showBenchmark ? 'line-through text-muted-foreground' : ''}`}>
                            S&P 500
                          </span>
                        </div>

                      </div>
                    );
                  }}
                />
                {/* Highlight top 3 drawdown periods */}
                {top3Drawdowns.map((dd: any, index: number) => (
                  <ReferenceArea
                    key={index}
                    x1={chartData[dd.startIndex]!.date}
                    x2={chartData[dd.endIndex]!.date}
                    fill={dd.color}
                    fillOpacity={0.1}
                    label={{ 
                      value: `${dd.label} (${dd.depthPct.toFixed(1)}%)`, 
                      position: 'insideTop', 
                      fill: dd.color, 
                      fontSize: 11,
                      offset: index * 15 // Offset labels vertically so they don't overlap
                    }}
                  />
                ))}
                <Line 
                  type="monotone" 
                  dataKey="portfolio" 
                  stroke="#60a5fa" 
                  strokeWidth={2}
                  dot={false}
                  name="Portfolio"
                />
                {showBenchmark && (
                  <Line 
                    type="monotone" 
                    dataKey="benchmark" 
                    stroke="#a3a3a3" 
                    strokeWidth={2}
                    dot={false}
                    name="S&P 500"
                  />
                )}

              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Underwater Curve - Directly Below Equity Curve */}
      {data.underwater && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Underwater Equity Curve</CardTitle>
            <CardDescription className="text-xs">
              Drawdown from peak over time vs S&P 500 benchmark
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] sm:h-[260px] md:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }} 
                  data={(() => {
                    // Build a map of benchmark drawdown by date for efficient lookup
                    const benchmarkByDate = new Map<string, number>();
                    data.benchmarkUnderwater?.curve?.forEach((b: any) => {
                      const dateKey = new Date(b.date).toISOString().split('T')[0];
                      benchmarkByDate.set(dateKey, b.drawdownPercent);
                    });
                    
                    // Forward-fill benchmark values
                    let lastBenchmarkDrawdown = 0;
                    return data.underwater.curve.map((point, index) => {
                      const pointDateKey = new Date(point.date).toISOString().split('T')[0];
                      const displayDate = chartData[index]?.date || point.date.toLocaleDateString();
                      
                      // Find exact match or use forward-fill
                      let benchmarkDrawdown = benchmarkByDate.get(pointDateKey);
                      if (benchmarkDrawdown === undefined) {
                        // Look for closest previous date
                        const sortedDates = Array.from(benchmarkByDate.keys()).sort();
                        for (const dateKey of sortedDates) {
                          if (dateKey <= pointDateKey) {
                            benchmarkDrawdown = benchmarkByDate.get(dateKey);
                          } else {
                            break;
                          }
                        }
                      }
                      
                      if (benchmarkDrawdown !== undefined) {
                        lastBenchmarkDrawdown = benchmarkDrawdown;
                      }
                      
                      return {
                        date: displayDate,
                        drawdown: point.drawdownPercent,
                        benchmarkDrawdown: lastBenchmarkDrawdown,
                      };
                    });
                  })()}
                >
                  <defs>
                    <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.15} vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10, fill: '#ffffff' }}
                    tickLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.4)' }}
                    angle={-45}
                    textAnchor="end"
                    height={55}
                    interval="preserveStartEnd"
                    domain={[0, chartData.length - 1]}
                    type="category"
                    padding={{ left: 20, right: 20 }}
                    label={{ value: 'Date', position: 'insideBottom', offset: -5, fill: '#ffffff', fontSize: 11 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#ffffff' }}
                    tickLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.4)' }}
                    tickFormatter={(value) => `${value.toFixed(0)}%`}
                    domain={['dataMin', 0]}
                    width={45}
                    label={{ value: 'Drawdown %', angle: -90, position: 'insideLeft', fill: '#ffffff', fontSize: 11, dx: -5 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => `${value.toFixed(2)}%`}
                    labelStyle={{ color: 'black' }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="drawdown"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#drawdownGradient)"
                    name="Portfolio"
                  />
                  {showBenchmark && data.benchmarkUnderwater?.curve && (
                    <Area
                      type="monotone"
                      dataKey="benchmarkDrawdown"
                      stroke="#a3a3a3"
                      strokeWidth={2}
                      fill="none"
                      name="S&P 500"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Metrics */}
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

      {/* Trade & Risk Statistics - Moved below Calendar P&L */}
      {data.tradeStats && <TradeAndRiskStats tradeStats={data.tradeStats} />}

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
