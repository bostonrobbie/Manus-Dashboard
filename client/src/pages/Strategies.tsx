import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type TimeRange = 'YTD' | '1Y' | '3Y' | '5Y' | 'ALL';

const STRATEGY_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

export default function Strategies() {
  const [timeRange, setTimeRange] = useState<TimeRange>('1Y');
  const { data: strategies, isLoading, error } = trpc.portfolio.listStrategies.useQuery();
  
  // Get all strategies comparison data for the chart
  // Limit to 1Y for performance (full dataset can timeout)
  const chartTimeRange = timeRange === 'ALL' || timeRange === '5Y' || timeRange === '3Y' ? '1Y' : timeRange;
  
  const { data: comparisonData, isLoading: isLoadingComparison, error: comparisonError } = trpc.portfolio.compareStrategies.useQuery(
    {
      strategyIds: strategies?.map(s => s.id) || [],
      timeRange: chartTimeRange,
      startingCapital: 100000,
    },
    {
      enabled: !!strategies && strategies.length > 0,
      retry: false, // Don't retry on timeout
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    }
  );
  
  // Prepare chart data with sampling for performance
  const sampleInterval = (comparisonData?.strategies[0]?.equityCurve?.length || 0) > 500 ? 3 : 1;
  const chartData = comparisonData?.strategies[0]?.equityCurve
    ?.filter((_, index) => index % sampleInterval === 0)
    .map((_, index) => {
      const actualIndex = index * sampleInterval;
      const point: any = {
        date: new Date(comparisonData.strategies[0]!.equityCurve[actualIndex]!.date).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
      };
      
      comparisonData.strategies.forEach((strat, stratIndex) => {
        point[strat.symbol || `strategy${stratIndex}`] = strat.equityCurve![actualIndex]?.equity || 0;
      });
      
      return point;
    }) || [];

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
            <CardTitle className="text-destructive">Error Loading Strategies</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trading Strategies</h1>
        <p className="text-muted-foreground">
          View detailed performance for each intraday strategy
        </p>
      </div>
      
      {/* All Strategies Equity Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Strategies Performance</CardTitle>
              <CardDescription>Compare all strategy equity curves</CardDescription>
            </div>
            <div className="w-[180px]">
              <Label htmlFor="chart-time-range" className="sr-only">Time Range</Label>
              <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
                <SelectTrigger id="chart-time-range">
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
        </CardHeader>
        <CardContent>
          {isLoadingComparison ? (
            <div className="flex items-center justify-center h-[400px]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="ml-3 text-sm text-muted-foreground">Loading comparison data...</p>
            </div>
          ) : comparisonError ? (
            <div className="flex flex-col items-center justify-center h-[400px] gap-3">
              <p className="text-sm text-muted-foreground">Unable to load comparison chart</p>
              <p className="text-xs text-muted-foreground">View individual strategy details below</p>
            </div>
          ) : chartTimeRange !== timeRange ? (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                Showing 1 Year data for performance. For longer periods, view individual strategy details.
              </div>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    {comparisonData?.strategies.map((strat, index) => (
                      <Line
                        key={strat.id}
                        type="monotone"
                        dataKey={strat.symbol || `strategy${index}`}
                        stroke={STRATEGY_COLORS[index % STRATEGY_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        name={strat.name || strat.symbol || `Strategy ${index + 1}`}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  {comparisonData?.strategies.map((strat, index) => (
                    <Line
                      key={strat.id}
                      type="monotone"
                      dataKey={strat.symbol || `strategy${index}`}
                      stroke={STRATEGY_COLORS[index % STRATEGY_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      name={strat.name || strat.symbol || `Strategy ${index + 1}`}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strategy Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Individual Strategies</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {strategies?.map((strategy) => (
          <Card key={strategy.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    {strategy.name}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {strategy.market} • {strategy.strategyType}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Symbol:</span>
                  <span className="font-medium">{strategy.symbol}</span>
                </div>
                {strategy.description && (
                  <p className="text-sm text-muted-foreground">
                    {strategy.description}
                  </p>
                )}
                <Link href={`/strategy/${strategy.id}`}>
                  <Button className="w-full mt-4" variant="outline">
                    View Details
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
