import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingUp, ArrowRight, Zap, Fuel, Bitcoin, Coins, Landmark, Activity } from "lucide-react";
import { Link } from "wouter";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type TimeRange = 'YTD' | '1Y' | '3Y' | '5Y' | '10Y' | 'ALL';

// Format large numbers with K/M suffix
const formatCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (absValue >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  } else {
    return `$${value.toFixed(0)}`;
  }
};

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
  const { data: strategies, isLoading, error } = trpc.portfolio.listStrategies.useQuery();
  
  // Get all strategies comparison data for the chart
  const { data: comparisonData, isLoading: isLoadingComparison, error: comparisonError } = trpc.portfolio.compareStrategies.useQuery(
    {
      strategyIds: strategies?.map(s => s.id) || [],
      timeRange: timeRange,
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
  
  // Track last known equity for each strategy to handle missing data points
  const lastKnownEquity: Record<string, number> = {};
  
  const chartData = comparisonData?.strategies[0]?.equityCurve
    ?.filter((_, index) => index % sampleInterval === 0)
    .map((_, index) => {
      const actualIndex = index * sampleInterval;
      const point: any = {
        date: new Date(comparisonData.strategies[0]!.equityCurve[actualIndex]!.date).toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
      };
      
      comparisonData.strategies.forEach((strat, stratIndex) => {
        const stratKey = strat.symbol || `strategy${stratIndex}`;
        const equityPoint = strat.equityCurve![actualIndex];
        
        if (equityPoint && equityPoint.equity !== undefined && equityPoint.equity !== null) {
          // Use actual equity value and update last known
          lastKnownEquity[stratKey] = equityPoint.equity;
          point[stratKey] = equityPoint.equity;
        } else if (lastKnownEquity[stratKey] !== undefined) {
          // Use last known equity value instead of 0
          point[stratKey] = lastKnownEquity[stratKey];
        } else {
          // No data yet, use undefined to not plot
          point[stratKey] = undefined;
        }
      });
      
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
                  <SelectItem value="10Y">10 Years</SelectItem>
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
                    domain={['dataMin', 'dataMax']}
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
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Strategy Cards */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Individual Strategies</h2>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {strategies?.map((strategy) => {
          // Get market-specific icon
          const getMarketIcon = (market: string) => {
            const m = market.toLowerCase();
            if (m.includes('es') || m.includes('s&p')) return Activity;
            if (m.includes('nq') || m.includes('nasdaq')) return Zap;
            if (m.includes('cl') || m.includes('crude')) return Fuel;
            if (m.includes('btc') || m.includes('bitcoin')) return Bitcoin;
            if (m.includes('gc') || m.includes('gold')) return Coins;
            if (m.includes('ym') || m.includes('dow')) return Landmark;
            return TrendingUp;
          };
          
          const MarketIcon = getMarketIcon(strategy.market || 'Unknown');
          
          return (
            <Card key={strategy.id} className="relative overflow-hidden hover:shadow-2xl transition-all duration-300 border hover:border-primary/40 group bg-card/40 backdrop-blur-sm h-full flex flex-col">
              <CardHeader className="pb-4 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 rounded-xl blur-md group-hover:blur-lg transition-all"></div>
                        <div className="relative p-2.5 bg-primary/15 rounded-xl group-hover:bg-primary/25 transition-all border border-primary/20">
                          <MarketIcon className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      <div>
                        <CardTitle className="text-xl leading-tight font-bold group-hover:text-primary transition-colors">
                          {strategy.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs font-bold text-primary bg-primary/15 px-2.5 py-1 rounded-full border border-primary/30">
                            {strategy.symbol}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">
                            {strategy.strategyType}
                          </span>
                        </div>
                      </div>
                    </div>
                    <CardDescription className="text-sm mt-2">
                      {strategy.description || `${strategy.market} ${strategy.strategyType?.toLowerCase() || 'trading'} strategy`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10 flex-1 flex flex-col">
                {/* Performance Metrics Grid */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-blue-500/5 rounded-lg p-2.5 border border-border/40">
                    <div className="text-[9px] text-muted-foreground mb-0.5 uppercase tracking-wide font-semibold">Return</div>
                    <div className="text-sm font-bold text-blue-600 truncate">
                      {strategy.totalReturn !== undefined 
                        ? formatCurrency(strategy.totalReturn)
                        : 'N/A'
                      }
                    </div>
                  </div>
                  <div className="bg-blue-500/5 rounded-lg p-2.5 border border-border/40">
                    <div className="text-[9px] text-muted-foreground mb-0.5 uppercase tracking-wide font-semibold">Max DD</div>
                    <div className="text-sm font-bold text-blue-600 truncate">
                      {strategy.maxDrawdown !== undefined
                        ? formatCurrency(Math.abs(strategy.maxDrawdown))
                        : 'N/A'
                      }
                    </div>
                  </div>
                  <div className="bg-blue-500/5 rounded-lg p-2.5 border border-border/40">
                    <div className="text-[9px] text-muted-foreground mb-0.5 uppercase tracking-wide font-semibold">Sharpe</div>
                    <div className="text-sm font-bold text-blue-600 truncate">
                      {strategy.sharpeRatio !== undefined
                        ? strategy.sharpeRatio.toFixed(2)
                        : 'N/A'
                      }
                    </div>
                  </div>
                </div>

                {/* Market & Type Info */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-muted/10 rounded-lg p-2.5 border border-border/40">
                    <div className="text-[9px] text-muted-foreground mb-0.5 uppercase tracking-wide font-semibold">Market</div>
                    <div className="text-sm font-bold">{strategy.market}</div>
                  </div>
                  <div className="bg-muted/10 rounded-lg p-2.5 border border-border/40">
                    <div className="text-[9px] text-muted-foreground mb-0.5 uppercase tracking-wide font-semibold">Type</div>
                    <div className="text-sm font-bold">{strategy.strategyType}</div>
                  </div>
                </div>
                
                <Link href={`/strategy/${strategy.id}`} className="mt-auto">
                  <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-sm group-hover:shadow-md" variant="outline">
                    <span className="font-semibold">View Details</span>
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                
                {/* Decorative gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
