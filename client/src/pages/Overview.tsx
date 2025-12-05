import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2, TrendingUp, TrendingDown, Activity, Target, Gauge } from "lucide-react";
import { PerformanceBreakdown } from "@/components/PerformanceBreakdown";
import { UnderwaterCurveChart } from "@/components/UnderwaterCurveChart";
import { DayOfWeekHeatmap } from "@/components/DayOfWeekHeatmap";
import { StrategyCorrelationHeatmap } from "@/components/StrategyCorrelationHeatmap";
import { RollingMetricsChart } from "@/components/RollingMetricsChart";
import { MonthlyReturnsCalendar } from "@/components/MonthlyReturnsCalendar";
import { TradeAndRiskStats } from "@/components/TradeAndRiskStats";
import { PortfolioSummary } from "@/components/PortfolioSummary";
import { DistributionSnapshot } from "@/components/DistributionSnapshot";
import { MajorDrawdownsTable } from "@/components/MajorDrawdownsTable";

type TimeRange = 'YTD' | '1Y' | '3Y' | '5Y' | 'ALL';

export default function Overview() {
  const [timeRange, setTimeRange] = useState<TimeRange>('1Y');
  const [startingCapital, setStartingCapital] = useState(100000);

  const { data, isLoading, error } = trpc.portfolio.overview.useQuery({
    timeRange,
    startingCapital,
  });

  const { data: breakdownData, isLoading: breakdownLoading } = trpc.portfolio.performanceBreakdown.useQuery({
    timeRange,
    startingCapital,
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

  // Prepare chart data
  const chartData = portfolioEquity.map((point, index) => ({
    date: new Date(point.date).toLocaleDateString(),
    portfolio: point.equity,
    benchmark: benchmarkEquity[index]?.equity ?? null, // Use null for missing values (don't plot)
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio Overview</h1>
          <p className="text-muted-foreground">
            Combined performance of all intraday strategies
          </p>
        </div>
        
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="space-y-2">
            <Label htmlFor="starting-capital">Starting Capital</Label>
            <Input
              id="starting-capital"
              type="number"
              value={startingCapital}
              onChange={(e) => setStartingCapital(Number(e.target.value))}
              className="w-full sm:w-[180px]"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="time-range">Time Range</Label>
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger id="time-range" className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="YTD">Year to Date</SelectItem>
                <SelectItem value="1Y">1 Year</SelectItem>
                <SelectItem value="3Y">3 Years</SelectItem>
                <SelectItem value="5Y">5 Years</SelectItem>
                <SelectItem value="ALL">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>



      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Return</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalReturn >= 0 ? '+' : ''}{metrics.totalReturn.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Annualized: {metrics.annualizedReturn.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.sharpeRatio.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Sortino: {metrics.sortinoRatio.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              -{metrics.maxDrawdown.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Peak to trough decline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.winRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.winningTrades} / {metrics.totalTrades} trades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calmar Ratio</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.calmarRatio.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Return / Drawdown
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Summary */}
      {data.summary && <PortfolioSummary summary={data.summary} />}

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
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                  labelStyle={{ color: 'black' }}
                />
                <Legend />
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

      {/* Additional Metrics */}
      {/* Trade & Risk Statistics - Combined panel with comprehensive metrics */}
      {data.tradeStats && <TradeAndRiskStats tradeStats={data.tradeStats} />}

      {/* Underwater Curve */}
      {data.underwater && (
        <Card>
          <CardContent className="pt-6">
            <UnderwaterCurveChart data={data.underwater} />
          </CardContent>
        </Card>
      )}

      {/* Major Drawdowns Table */}
      {data.majorDrawdowns && (
        <MajorDrawdownsTable 
          drawdowns={data.majorDrawdowns.map((dd: any) => ({
            ...dd,
            startDate: new Date(dd.startDate).toISOString(),
            troughDate: new Date(dd.troughDate).toISOString(),
            recoveryDate: dd.recoveryDate ? new Date(dd.recoveryDate).toISOString() : null,
          }))}
        />
      )}

      {/* Distribution Snapshot */}
      {data.distribution && <DistributionSnapshot distribution={data.distribution} />}

      {/* Day-of-Week Performance */}
      {data.dayOfWeekBreakdown && data.dayOfWeekBreakdown.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <DayOfWeekHeatmap data={data.dayOfWeekBreakdown} />
          </CardContent>
        </Card>
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

      {/* Rolling Metrics */}
      {data.rollingMetrics && data.rollingMetrics.length > 0 && (
        <RollingMetricsChart rollingMetrics={data.rollingMetrics} />
      )}

      {/* Monthly Returns Calendar */}
      {data.monthlyReturnsCalendar && data.monthlyReturnsCalendar.length > 0 && (
        <MonthlyReturnsCalendar monthlyReturns={data.monthlyReturnsCalendar} />
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
                      ${((metrics.maxDrawdown / 100) * startingCapital / 10).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
                          Math.ceil(((metrics.maxDrawdown / 100) * startingCapital / 10 + 500) / 100) * 100
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
                      ${((metrics.maxDrawdown / 100) * startingCapital).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
                          Math.ceil(((metrics.maxDrawdown / 100) * startingCapital + 5000) / 1000) * 1000
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
                the maximum historical drawdown ({metrics.maxDrawdown.toFixed(2)}%) plus maintain required margin. 
                For 0% risk of ruin, your actual trading capital should exceed these minimums.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Breakdown */}
      <PerformanceBreakdown 
        data={breakdownData || { daily: [], weekly: [], monthly: [], quarterly: [], yearly: [] }} 
        isLoading={breakdownLoading}
      />
    </div>
  );
}
