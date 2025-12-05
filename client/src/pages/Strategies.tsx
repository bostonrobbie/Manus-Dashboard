import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingUp, ArrowRight, TrendingDown, Bitcoin, Zap, Fuel, Coins, Landmark } from "lucide-react";
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
  const [hiddenStrategies, setHiddenStrategies] = useState<Set<string>>(new Set());
  const [showBenchmark, setShowBenchmark] = useState(false);
  
  const { data: strategies, isLoading, error } = trpc.portfolio.listStrategies.useQuery();
  
  // Get benchmark data for S&P 500 toggle
  const { data: benchmarkData } = trpc.portfolio.overview.useQuery(
    { timeRange, startingCapital: 100000 },
    { enabled: showBenchmark }
  );
  
  // Get all strategies comparison data for the chart
  const { data: comparisonData, isLoading: isLoadingComparison, error: comparisonError } = trpc.portfolio.compareStrategies.useQuery(
    {
      strategyIds: strategies?.map(s => s.id) || [],
      timeRange: timeRange,
      startingCapital: 100000,
    },
    {
      enabled: !!strategies && strategies.length > 0,
      retry: false,
      staleTime: 5 * 60 * 1000,
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
      
      // Add S&P 500 benchmark if enabled
      if (showBenchmark && benchmarkData?.benchmarkEquity?.[actualIndex]) {
        point['S&P 500'] = benchmarkData.benchmarkEquity[actualIndex].equity;
      }
      
      return point;
    }) || [];

  const toggleStrategy = (symbol: string) => {
    setHiddenStrategies(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  };

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
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBenchmark}
                  onChange={(e) => setShowBenchmark(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm">Show S&P 500</span>
              </label>
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
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }} 
                      content={(props) => {
                        const { payload } = props;
                        return (
                          <div className="flex flex-wrap justify-center gap-4 pt-4">
                            {payload?.map((entry: any, index: number) => {
                              const isHidden = hiddenStrategies.has(entry.dataKey);
                              return (
                                <div
                                  key={`legend-${index}`}
                                  className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity"
                                  onClick={() => toggleStrategy(entry.dataKey)}
                                  style={{ opacity: isHidden ? 0.4 : 1 }}
                                >
                                  <div
                                    className="w-4 h-0.5"
                                    style={{ backgroundColor: entry.color }}
                                  />
                                  <span className="text-sm" style={{ textDecoration: isHidden ? 'line-through' : 'none' }}>
                                    {entry.value}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }}
                    />
                    {comparisonData?.strategies.map((strat, index) => (
                      <Line
                        key={strat.id}
                        type="monotone"
                        dataKey={strat.symbol || `strategy${index}`}
                        stroke={STRATEGY_COLORS[index % STRATEGY_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        name={strat.name || strat.symbol || `Strategy ${index + 1}`}
                        hide={hiddenStrategies.has(strat.symbol || `strategy${index}`)}
                      />
                    ))}
                    {showBenchmark && benchmarkData && (
                      <Line
                        type="monotone"
                        dataKey="S&P 500"
                        stroke="#fb923c"
                        strokeWidth={2}
                        dot={false}
                        name="S&P 500"
                        strokeDasharray="5 5"
                      />
                    )}
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {strategies?.map((strategy, index) => {
          // Get strategy data from comparison data
          const strategyData = comparisonData?.strategies.find(s => s.id === strategy.id);
          const metrics = strategyData?.metrics;
          const equityCurve = strategyData?.equityCurve || [];
          
          // Get market icon
          const getMarketIcon = (market: string) => {
            switch(market) {
              case 'ES': return <TrendingUp className="h-6 w-6" />;
              case 'NQ': return <Zap className="h-6 w-6" />;
              case 'CL': return <Fuel className="h-6 w-6" />;
              case 'BTC': return <Bitcoin className="h-6 w-6" />;
              case 'GC': return <Coins className="h-6 w-6" />;
              case 'YM': return <Landmark className="h-6 w-6" />;
              default: return <TrendingUp className="h-6 w-6" />;
            }
          };
          
          // Sample equity curve for sparkline (take every 10th point)
          const sparklineData = equityCurve.filter((_, i: number) => i % 10 === 0).map((p: any) => p.equity);
          const minEquity = Math.min(...sparklineData);
          const maxEquity = Math.max(...sparklineData);
          const range = maxEquity - minEquity || 1;
          
          return (
            <Card key={strategy.id} className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {getMarketIcon(strategy.market || 'ES')}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{strategy.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {strategy.market} • {strategy.strategyType}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mini Sparkline */}
                {sparklineData.length > 0 && (
                  <div className="h-16 w-full">
                    <svg width="100%" height="100%" viewBox="0 0 200 60" preserveAspectRatio="none">
                      <polyline
                        points={sparklineData.map((equity: number, i: number) => {
                          const x = (i / (sparklineData.length - 1)) * 200;
                          const y = 60 - ((equity - minEquity) / range) * 55;
                          return `${x},${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="hsl(var(--primary))"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                      />
                      <polyline
                        points={`0,60 ${sparklineData.map((equity: number, i: number) => {
                          const x = (i / (sparklineData.length - 1)) * 200;
                          const y = 60 - ((equity - minEquity) / range) * 55;
                          return `${x},${y}`;
                        }).join(' ')} 200,60`}
                        fill="hsl(var(--primary))"
                        fillOpacity="0.1"
                      />
                    </svg>
                  </div>
                )}
                
                {/* Key Stats */}
                {metrics ? (
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Return</div>
                      <div className={`text-sm font-bold ${metrics.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {metrics.totalReturn >= 0 ? '+' : ''}{(metrics.totalReturn * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Sharpe</div>
                      <div className="text-sm font-bold">
                        {metrics.sharpeRatio.toFixed(2)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">Win Rate</div>
                      <div className="text-sm font-bold">
                        {(metrics.winRate * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-16">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                )}
                
                {/* Symbol Badge */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">Symbol</span>
                  <span className="text-sm font-mono font-bold bg-muted px-2 py-1 rounded">{strategy.symbol}</span>
                </div>
                
                <Link href={`/strategy/${strategy.id}`}>
                  <Button variant="outline" className="w-full group">
                    View Details
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
