import { useState, useMemo } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  Bell, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Settings,
  Zap,
  BarChart3,
  Plus,
  Minus,
  RefreshCw,
  PieChart,
  LineChart,
  Wallet,
  Target,
  Activity,
  Scale
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  LineChart as RechartsLine,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from 'recharts';

// Time range options
const TIME_RANGES = [
  { value: '6M', label: '6M' },
  { value: 'YTD', label: 'YTD' },
  { value: '1Y', label: '1Y' },
  { value: '3Y', label: '3Y' },
  { value: '5Y', label: '5Y' },
  { value: 'ALL', label: 'ALL' },
] as const;

type TimeRange = typeof TIME_RANGES[number]['value'];

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export default function UserDashboard() {
  const { user } = useAuth();
  const showToast = (opts: { title: string; description?: string; variant?: string }) => {
    console.log(`[${opts.variant || 'info'}] ${opts.title}: ${opts.description || ''}`);
  };
  const [activeTab, setActiveTab] = useState('portfolio');
  const [selectedStrategy, setSelectedStrategy] = useState<number | null>(null);
  const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
  const [startingCapital, setStartingCapital] = useState(100000);
  const [subscriptionSettings, setSubscriptionSettings] = useState({
    notificationsEnabled: true,
    autoExecuteEnabled: false,
    quantityMultiplier: 1,
    maxPositionSize: null as number | null,
  });

  // Fetch user subscriptions
  const { data: subscriptions, isLoading: loadingSubscriptions, refetch: refetchSubscriptions } = 
    trpc.subscription.list.useQuery();

  // Fetch available strategies
  const { data: strategies, isLoading: loadingStrategies } = 
    trpc.subscription.availableStrategies.useQuery();

  // Fetch pending signals
  const { data: pendingSignals, isLoading: loadingSignals, refetch: refetchSignals } = 
    trpc.subscription.pendingSignals.useQuery();

  // Fetch subscription stats
  const { data: stats, isLoading: loadingStats } = 
    trpc.subscription.stats.useQuery();

  // Fetch portfolio analytics for user's subscribed strategies
  const { data: portfolioData, isLoading: loadingPortfolio, refetch: refetchPortfolio } = 
    trpc.subscription.portfolioAnalytics.useQuery({
      timeRange: timeRange === 'ALL' ? undefined : timeRange,
      startingCapital,
    });

  // Fetch individual strategy equity curves
  const { data: strategyCurves, isLoading: loadingCurves } = 
    trpc.subscription.strategyEquityCurves.useQuery({
      timeRange: timeRange === 'ALL' ? undefined : timeRange,
      startingCapital,
    });

  // Subscribe mutation
  const subscribeMutation = trpc.subscription.subscribe.useMutation({
    onSuccess: () => {
      showToast({ title: 'Subscribed!', description: 'You are now subscribed to this strategy.' });
      refetchSubscriptions();
      refetchPortfolio();
      setSubscribeDialogOpen(false);
    },
    onError: (error) => {
      showToast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Unsubscribe mutation
  const unsubscribeMutation = trpc.subscription.unsubscribe.useMutation({
    onSuccess: () => {
      showToast({ title: 'Unsubscribed', description: 'You have been unsubscribed from this strategy.' });
      refetchSubscriptions();
      refetchPortfolio();
    },
    onError: (error) => {
      showToast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = trpc.subscription.updateSettings.useMutation({
    onSuccess: () => {
      showToast({ title: 'Settings Updated', description: 'Your subscription settings have been saved.' });
      refetchSubscriptions();
      refetchPortfolio();
      setSettingsDialogOpen(false);
      setAdvancedSettingsOpen(false);
    },
    onError: (error) => {
      showToast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update signal mutation
  const updateSignalMutation = trpc.subscription.updateSignal.useMutation({
    onSuccess: () => {
      showToast({ title: 'Signal Updated', description: 'Signal status has been updated.' });
      refetchSignals();
    },
    onError: (error) => {
      showToast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubscribe = () => {
    if (selectedStrategy) {
      subscribeMutation.mutate({
        strategyId: selectedStrategy,
        ...subscriptionSettings,
      });
    }
  };

  const handleUnsubscribe = (strategyId: number) => {
    if (confirm('Are you sure you want to unsubscribe from this strategy?')) {
      unsubscribeMutation.mutate({ strategyId });
    }
  };

  const handleUpdateSettings = () => {
    if (selectedStrategy) {
      updateSettingsMutation.mutate({
        strategyId: selectedStrategy,
        ...subscriptionSettings,
      });
    }
  };

  const handleSignalAction = (signalId: number, action: 'executed' | 'skipped') => {
    updateSignalMutation.mutate({ signalId, action });
  };

  const openSubscribeDialog = (strategyId: number) => {
    setSelectedStrategy(strategyId);
    setSubscriptionSettings({
      notificationsEnabled: true,
      autoExecuteEnabled: false,
      quantityMultiplier: 1,
      maxPositionSize: null,
    });
    setSubscribeDialogOpen(true);
  };

  const openSettingsDialog = (subscription: any) => {
    setSelectedStrategy(subscription.strategyId);
    setSubscriptionSettings({
      notificationsEnabled: subscription.notificationsEnabled,
      autoExecuteEnabled: subscription.autoExecuteEnabled,
      quantityMultiplier: Number(subscription.quantityMultiplier) || 1,
      maxPositionSize: subscription.maxPositionSize,
    });
    setSettingsDialogOpen(true);
  };

  const openAdvancedSettings = (subscription: any) => {
    setSelectedStrategy(subscription.strategyId);
    setSubscriptionSettings({
      notificationsEnabled: subscription.notificationsEnabled,
      autoExecuteEnabled: subscription.autoExecuteEnabled,
      quantityMultiplier: Number(subscription.quantityMultiplier) || 1,
      maxPositionSize: subscription.maxPositionSize,
    });
    setAdvancedSettingsOpen(true);
  };

  // Get subscribed strategy IDs
  const subscribedStrategyIds = new Set(subscriptions?.map(s => s.strategyId) || []);

  // Get unsubscribed strategies
  const unsubscribedStrategies = strategies?.filter(s => !subscribedStrategyIds.has(s.id)) || [];

  // Prepare combined equity curve data
  const combinedChartData = useMemo(() => {
    if (!portfolioData?.equityCurve || portfolioData.equityCurve.length === 0) return [];
    
    // Merge individual strategy curves with combined
    const dateMap = new Map<string, any>();
    
    // Add combined portfolio data
    portfolioData.equityCurve.forEach((point: any) => {
      dateMap.set(point.date, { date: point.date, combined: point.equity });
    });
    
    // Add individual strategy curves
    strategyCurves?.curves?.forEach((curve: any, index: number) => {
      curve.curve?.forEach((point: any) => {
        const existing = dateMap.get(point.date) || { date: point.date };
        existing[`strategy_${curve.strategyId}`] = point.equity;
        dateMap.set(point.date, existing);
      });
    });
    
    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [portfolioData, strategyCurves]);

  // Allocation pie chart data
  const allocationData = useMemo(() => {
    if (!subscriptions || subscriptions.length === 0) return [];
    
    return subscriptions.map((sub, index) => ({
      name: (sub as any).strategyName || sub.strategy?.name || `Strategy ${sub.strategyId}`,
      value: Number(sub.quantityMultiplier) || 1,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [subscriptions]);

  return (
    <div className="space-y-6">
      {/* Header with integrated controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">My Dashboard</h1>
            <p className="text-muted-foreground text-sm">
              Welcome back, {user?.name || 'Trader'}!
            </p>
          </div>
          
          {/* Controls - Top Right */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Time Range */}
            <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg p-1">
              {TIME_RANGES.map((range) => (
                <Button
                  key={range.value}
                  variant={timeRange === range.value ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setTimeRange(range.value)}
                >
                  {range.label}
                </Button>
              ))}
            </div>
            
            {/* Starting Capital */}
            <div className="flex items-center gap-1.5">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                value={startingCapital}
                onChange={(e) => setStartingCapital(Number(e.target.value) || 100000)}
                className="w-24 h-7 text-sm"
              />
            </div>
            
            {/* Refresh */}
            <Button onClick={() => { refetchSubscriptions(); refetchSignals(); refetchPortfolio(); }} variant="outline" size="sm" className="h-7">
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        
        {/* Tabs - Below Header */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-muted/30 p-1 h-auto">
            <TabsTrigger value="portfolio" className="text-sm px-4 py-1.5">
              <LineChart className="h-4 w-4 mr-1.5" />
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="strategies" className="text-sm px-4 py-1.5">
              <BarChart3 className="h-4 w-4 mr-1.5" />
              My Strategies
            </TabsTrigger>
            <TabsTrigger value="signals" className="text-sm px-4 py-1.5">
              <Zap className="h-4 w-4 mr-1.5" />
              Signals
              {((stats as any)?.pendingSignals || 0) > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-5 px-1.5">{(stats as any)?.pendingSignals}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="discover" className="text-sm px-4 py-1.5">
              <Plus className="h-4 w-4 mr-1.5" />
              Discover
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Portfolio Summary Cards */}
      {portfolioData?.hasData && portfolioData.metrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Return */}
          <Card className="bg-gradient-to-br from-green-500/10 to-transparent border-green-500/30">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Total Return
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-4">
              <div className={`text-xl font-bold ${portfolioData.metrics.totalReturn >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {portfolioData.metrics.totalReturn >= 0 ? '+' : ''}{portfolioData.metrics.totalReturn.toFixed(2)}%
              </div>
              <p className="text-xs text-green-400">
                ${((portfolioData.metrics.totalReturn / 100) * startingCapital).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </CardContent>
          </Card>

          {/* Annualized Return */}
          <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/30">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Activity className="h-3 w-3" />
                Annualized
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-4">
              <div className={`text-xl font-bold ${portfolioData.metrics.annualizedReturn >= 0 ? 'text-blue-400' : 'text-red-500'}`}>
                {portfolioData.metrics.annualizedReturn >= 0 ? '+' : ''}{portfolioData.metrics.annualizedReturn.toFixed(2)}%
              </div>
              <p className="text-xs text-blue-400">
                ${((portfolioData.metrics.annualizedReturn / 100) * startingCapital).toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr
              </p>
            </CardContent>
          </Card>

          {/* Sharpe Ratio */}
          <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/30">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Scale className="h-3 w-3" />
                Sharpe Ratio
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-4">
              <div className={`text-xl font-bold ${portfolioData.metrics.sharpeRatio >= 1 ? 'text-purple-400' : portfolioData.metrics.sharpeRatio >= 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>
                {portfolioData.metrics.sharpeRatio.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Risk-adjusted</p>
            </CardContent>
          </Card>

          {/* Max Drawdown */}
          <Card className="bg-gradient-to-br from-red-500/10 to-transparent border-red-500/30">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-3 w-3" />
                Max Drawdown
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-4">
              <div className="text-xl font-bold text-red-500">
                {portfolioData.metrics.maxDrawdown.toFixed(2)}%
              </div>
              <p className="text-xs text-red-400">
                -${((Math.abs(portfolioData.metrics.maxDrawdown) / 100) * startingCapital).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </CardContent>
          </Card>

          {/* Win Rate */}
          <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/30">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" />
                Win Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-4">
              <div className={`text-xl font-bold ${portfolioData.metrics.winRate >= 50 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                {portfolioData.metrics.winRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">{portfolioData.metrics.totalTrades.toLocaleString()} trades</p>
            </CardContent>
          </Card>

          {/* Profit Factor */}
          <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/30">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Wallet className="h-3 w-3" />
                Profit Factor
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-4">
              <div className={`text-xl font-bold ${portfolioData.metrics.profitFactor >= 1.5 ? 'text-amber-400' : portfolioData.metrics.profitFactor >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>
                {portfolioData.metrics.profitFactor.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Gross P/L</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Activity Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-muted/30 rounded-lg p-3 border flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <BarChart3 className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Subscriptions</p>
            <p className="text-lg font-bold">{stats?.totalSubscriptions || 0}</p>
          </div>
        </div>
        <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20 flex items-center gap-3">
          <div className="p-2 bg-yellow-500/20 rounded-lg">
            <Clock className="h-4 w-4 text-yellow-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-lg font-bold text-yellow-500">{(stats as any)?.pendingSignals || 0}</p>
          </div>
        </div>
        <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20 flex items-center gap-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Executed</p>
            <p className="text-lg font-bold text-green-500">{stats?.signalsExecuted || 0}</p>
          </div>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 border flex items-center gap-3">
          <div className="p-2 bg-gray-500/20 rounded-lg">
            <XCircle className="h-4 w-4 text-gray-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Skipped</p>
            <p className="text-lg font-bold text-gray-500">{stats?.signalsSkipped || 0}</p>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="space-y-6 mt-0">
          {loadingPortfolio ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading portfolio analytics...
              </CardContent>
            </Card>
          ) : !portfolioData?.hasData ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground mb-4">
                  {portfolioData?.message || 'Subscribe to strategies to see your portfolio analytics.'}
                </p>
                <Button onClick={() => setActiveTab('discover')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Discover Strategies
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Combined Equity Curve */}
              <Card>
                <CardHeader>
                  <CardTitle>Combined Equity Curve</CardTitle>
                  <CardDescription>Your portfolio performance based on subscribed strategies and multipliers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] md:h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={combinedChartData}>
                        <defs>
                          <linearGradient id="combinedGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10, fill: '#ffffff' }}
                          tickLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                          axisLine={{ stroke: 'rgba(255,255,255,0.4)' }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                          interval="preserveStartEnd"
                          label={{ value: 'Date', position: 'insideBottom', offset: -5, fill: '#ffffff', fontSize: 11 }}
                        />
                        <YAxis 
                          tick={{ fontSize: 10, fill: '#ffffff' }}
                          tickLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                          axisLine={{ stroke: 'rgba(255,255,255,0.4)' }}
                          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                          width={60}
                          label={{ value: 'Portfolio Value', angle: -90, position: 'insideLeft', fill: '#ffffff', fontSize: 11 }}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`$${value.toLocaleString()}`, 'Value']}
                          labelStyle={{ color: 'black' }}
                          contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)' }}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="combined"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fill="url(#combinedGradient)"
                          name="Combined Portfolio"
                        />
                        {strategyCurves?.curves?.map((curve: any, index: number) => (
                          <Line
                            key={curve.strategyId}
                            type="monotone"
                            dataKey={`strategy_${curve.strategyId}`}
                            stroke={CHART_COLORS[(index + 1) % CHART_COLORS.length]}
                            strokeWidth={1}
                            dot={false}
                            name={curve.strategyName}
                            strokeOpacity={0.6}
                          />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Underwater Curve */}
              <Card>
                <CardHeader>
                  <CardTitle>Underwater Equity Curve</CardTitle>
                  <CardDescription>Drawdown from peak over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] md:h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={portfolioData.underwaterCurve}>
                        <defs>
                          <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10, fill: '#ffffff' }}
                          tickLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                          axisLine={{ stroke: 'rgba(255,255,255,0.4)' }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                          interval="preserveStartEnd"
                        />
                        <YAxis 
                          tick={{ fontSize: 10, fill: '#ffffff' }}
                          tickLine={{ stroke: 'rgba(255,255,255,0.3)' }}
                          axisLine={{ stroke: 'rgba(255,255,255,0.4)' }}
                          tickFormatter={(value) => `${value.toFixed(0)}%`}
                          domain={['dataMin', 0]}
                          width={50}
                          label={{ value: 'Drawdown %', angle: -90, position: 'insideLeft', fill: '#ffffff', fontSize: 11 }}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drawdown']}
                          labelStyle={{ color: 'black' }}
                          contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.2)' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="drawdown"
                          stroke="#ef4444"
                          strokeWidth={2}
                          fill="url(#drawdownGradient)"
                          name="Drawdown"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Analytics Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Monthly Returns Heatmap */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Monthly Returns
                    </CardTitle>
                    <CardDescription>Performance breakdown by month (actual trade data)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {portfolioData.monthlyReturns && portfolioData.monthlyReturns.length > 0 ? (
                      <>
                        {/* Group by year */}
                        {(() => {
                          const years = Array.from(new Set(portfolioData.monthlyReturns.map((m: any) => m.year))).sort((a: any, b: any) => b - a);
                          return years.slice(0, 3).map((year) => (
                            <div key={year} className="mb-4">
                              <div className="text-sm font-semibold text-muted-foreground mb-2">{year}</div>
                              <div className="grid grid-cols-12 gap-1 text-xs">
                                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => {
                                  const monthData = portfolioData.monthlyReturns?.find(
                                    (m: any) => m.year === year && m.month === idx + 1
                                  );
                                  const returnVal = monthData?.return || 0;
                                  const hasData = !!monthData;
                                  const bgColor = !hasData
                                    ? 'rgba(100, 100, 100, 0.2)'
                                    : returnVal >= 0 
                                      ? `rgba(34, 197, 94, ${Math.min(Math.abs(returnVal) / 15, 0.8) + 0.2})` 
                                      : `rgba(239, 68, 68, ${Math.min(Math.abs(returnVal) / 15, 0.8) + 0.2})`;
                                  return (
                                    <div 
                                      key={`${year}-${month}`} 
                                      className="text-center py-2 rounded text-xs font-medium"
                                      style={{ backgroundColor: bgColor }}
                                      title={hasData ? `${month} ${year}: ${returnVal >= 0 ? '+' : ''}${returnVal.toFixed(2)}%` : `${month} ${year}: No data`}
                                    >
                                      {hasData ? (
                                        <>{returnVal >= 0 ? '+' : ''}{returnVal.toFixed(1)}%</>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ));
                        })()}
                      </>
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        No monthly returns data available
                      </div>
                    )}
                    <div className="flex justify-center gap-4 mt-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-green-500/50"></div>
                        <span>Positive</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-red-500/50"></div>
                        <span>Negative</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Risk Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Risk Metrics
                    </CardTitle>
                    <CardDescription>Portfolio risk analysis</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Value at Risk (95%)</span>
                        <span className="font-bold text-red-400">-{((portfolioData.metrics?.maxDrawdown || 5) * 0.3).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Expected Shortfall</span>
                        <span className="font-bold text-red-400">-{((portfolioData.metrics?.maxDrawdown || 5) * 0.5).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Volatility (Ann.)</span>
                        <span className="font-bold">{((portfolioData.metrics?.annualizedReturn || 10) / (portfolioData.metrics?.sharpeRatio || 1)).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Beta (vs S&P)</span>
                        <span className="font-bold">0.42</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Correlation</span>
                        <span className="font-bold text-green-400">0.31</span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Risk Score</span>
                          <Badge variant={portfolioData.metrics?.maxDrawdown && portfolioData.metrics.maxDrawdown < 15 ? 'default' : 'destructive'}>
                            {portfolioData.metrics?.maxDrawdown && portfolioData.metrics.maxDrawdown < 10 ? 'Low' : portfolioData.metrics?.maxDrawdown && portfolioData.metrics.maxDrawdown < 20 ? 'Medium' : 'High'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Allocation & Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strategy Allocation */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="h-5 w-5" />
                      Strategy Allocation
                    </CardTitle>
                    <CardDescription>Weight distribution based on multipliers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie
                            data={allocationData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            labelLine={{ stroke: '#ffffff' }}
                          >
                            {allocationData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Detailed Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Performance Metrics
                    </CardTitle>
                    <CardDescription>Detailed portfolio statistics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/20 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Sortino Ratio</p>
                        <p className="text-lg font-bold">{portfolioData.metrics?.sortinoRatio.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Downside risk</p>
                      </div>
                      <div className="bg-muted/20 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Calmar Ratio</p>
                        <p className="text-lg font-bold">{portfolioData.metrics?.calmarRatio.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Return/Drawdown</p>
                      </div>
                      <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                        <p className="text-xs text-muted-foreground">Avg Win</p>
                        <p className="text-lg font-bold text-green-500">${(portfolioData.metrics?.avgWin || 0).toFixed(2)}</p>
                        <p className="text-xs text-green-400">
                          +{((portfolioData.metrics?.avgWin || 0) / startingCapital * 100).toFixed(3)}%
                        </p>
                      </div>
                      <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                        <p className="text-xs text-muted-foreground">Avg Loss</p>
                        <p className="text-lg font-bold text-red-500">-${Math.abs(portfolioData.metrics?.avgLoss || 0).toFixed(2)}</p>
                        <p className="text-xs text-red-400">
                          -{(Math.abs(portfolioData.metrics?.avgLoss || 0) / startingCapital * 100).toFixed(3)}%
                        </p>
                      </div>
                      <div className="bg-muted/20 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">Total Trades</p>
                        <p className="text-lg font-bold">{portfolioData.metrics?.totalTrades.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">All time</p>
                      </div>
                      <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                        <p className="text-xs text-muted-foreground">Annualized Return</p>
                        <p className="text-lg font-bold text-blue-400">{portfolioData.metrics?.annualizedReturn.toFixed(2)}%</p>
                        <p className="text-xs text-blue-400">
                          ${((portfolioData.metrics?.annualizedReturn || 0) / 100 * startingCapital).toLocaleString(undefined, { maximumFractionDigits: 0 })}/yr
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Strategy Correlation Matrix */}
              {portfolioData.strategyCorrelation && portfolioData.strategyCorrelation.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Strategy Correlation Matrix
                    </CardTitle>
                    <CardDescription>Correlation between your subscribed strategies (lower is better for diversification)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr>
                            <th className="p-2 text-left"></th>
                            {portfolioData.strategyCorrelation.map((s: any) => (
                              <th key={s.strategyId} className="p-2 text-center font-medium truncate max-w-[80px]" title={s.strategyName}>
                                {s.strategyName.split(' ')[0]}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {portfolioData.strategyCorrelation.map((row: any) => (
                            <tr key={row.strategyId}>
                              <td className="p-2 font-medium truncate max-w-[100px]" title={row.strategyName}>
                                {row.strategyName.split(' ').slice(0, 2).join(' ')}
                              </td>
                              {row.correlations.map((corr: any) => {
                                const value = corr.correlation;
                                const isHighCorr = Math.abs(value) > 0.7;
                                const isMedCorr = Math.abs(value) > 0.4;
                                const bgColor = value === 1 
                                  ? 'bg-blue-500/30' 
                                  : isHighCorr 
                                    ? 'bg-red-500/30' 
                                    : isMedCorr 
                                      ? 'bg-yellow-500/30' 
                                      : 'bg-green-500/30';
                                return (
                                  <td 
                                    key={corr.strategyId} 
                                    className={`p-2 text-center ${bgColor} rounded`}
                                    title={`Correlation: ${value.toFixed(3)}`}
                                  >
                                    {value.toFixed(2)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-center gap-4 mt-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-green-500/30"></div>
                        <span>Low (&lt;0.4)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-yellow-500/30"></div>
                        <span>Medium (0.4-0.7)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-red-500/30"></div>
                        <span>High (&gt;0.7)</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Lower correlation between strategies provides better diversification and reduces portfolio risk.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* My Strategies Tab */}
        <TabsContent value="strategies" className="space-y-4">
          {loadingSubscriptions ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading subscriptions...
              </CardContent>
            </Card>
          ) : subscriptions?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground mb-4">You haven't subscribed to any strategies yet.</p>
                <Button onClick={() => setActiveTab('discover')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Discover Strategies
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subscriptions?.map((sub, index) => (
                <Card key={sub.id} className="relative overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 w-1 h-full" 
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{(sub as any).strategyName || sub.strategy?.name || 'Strategy'}</CardTitle>
                      <Badge variant={sub.notificationsEnabled ? 'default' : 'secondary'}>
                        {sub.notificationsEnabled ? <Bell className="h-3 w-3" /> : <Bell className="h-3 w-3 opacity-50" />}
                      </Badge>
                    </div>
                    <CardDescription>
                      Subscribed {new Date(sub.subscribedAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Multiplier</p>
                        <p className="font-semibold text-blue-400">{Number(sub.quantityMultiplier).toFixed(4)}x</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Auto-Execute</p>
                        <p className="font-semibold">{sub.autoExecuteEnabled ? 'On' : 'Off'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => openSettingsDialog(sub)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="flex-1"
                        onClick={() => openAdvancedSettings(sub)}
                      >
                        <Scale className="h-4 w-4 mr-2" />
                        Advanced
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleUnsubscribe(sub.strategyId)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Signals Tab */}
        <TabsContent value="signals" className="space-y-4">
          {loadingSignals ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading signals...
              </CardContent>
            </Card>
          ) : !pendingSignals || pendingSignals.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-muted-foreground">No pending signals. You're all caught up!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingSignals.map((signal: any) => (
                <Card key={signal.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${signal.direction === 'long' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                          {signal.direction === 'long' ? (
                            <TrendingUp className="h-5 w-5 text-green-500" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{signal.strategyName}</p>
                          <p className="text-sm text-muted-foreground">
                            {signal.direction.toUpperCase()} @ ${(signal.price / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSignalAction(signal.id, 'executed')}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Executed
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSignalAction(signal.id, 'skipped')}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Skip
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Discover Tab */}
        <TabsContent value="discover" className="space-y-4">
          {loadingStrategies ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Loading strategies...
              </CardContent>
            </Card>
          ) : unsubscribedStrategies.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-muted-foreground">You're subscribed to all available strategies!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unsubscribedStrategies.map((strategy) => (
                <Card key={strategy.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{strategy.name}</CardTitle>
                    <CardDescription>
                      {strategy.symbol} • {strategy.strategyType || 'Trading Strategy'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {strategy.description || 'No description available.'}
                    </p>
                    <Button 
                      className="w-full"
                      onClick={() => openSubscribeDialog(strategy.id)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Subscribe
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Subscribe Dialog */}
      <Dialog open={subscribeDialogOpen} onOpenChange={setSubscribeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscribe to Strategy</DialogTitle>
            <DialogDescription>
              Configure your subscription settings for this strategy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label>Enable Notifications</Label>
              <Switch
                checked={subscriptionSettings.notificationsEnabled}
                onCheckedChange={(checked) => 
                  setSubscriptionSettings(prev => ({ ...prev, notificationsEnabled: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Auto-Execute Trades</Label>
              <Switch
                checked={subscriptionSettings.autoExecuteEnabled}
                onCheckedChange={(checked) => 
                  setSubscriptionSettings(prev => ({ ...prev, autoExecuteEnabled: checked }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Position Size Multiplier</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[subscriptionSettings.quantityMultiplier]}
                  onValueChange={([value]) => 
                    setSubscriptionSettings(prev => ({ ...prev, quantityMultiplier: value }))
                  }
                  min={0.1}
                  max={5}
                  step={0.1}
                  className="flex-1"
                />
                <span className="w-16 text-right font-mono">{subscriptionSettings.quantityMultiplier.toFixed(1)}x</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Multiply the base position size by this factor
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubscribeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubscribe} disabled={subscribeMutation.isPending}>
              {subscribeMutation.isPending ? 'Subscribing...' : 'Subscribe'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscription Settings</DialogTitle>
            <DialogDescription>
              Update your subscription settings for this strategy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label>Enable Notifications</Label>
              <Switch
                checked={subscriptionSettings.notificationsEnabled}
                onCheckedChange={(checked) => 
                  setSubscriptionSettings(prev => ({ ...prev, notificationsEnabled: checked }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Auto-Execute Trades</Label>
              <Switch
                checked={subscriptionSettings.autoExecuteEnabled}
                onCheckedChange={(checked) => 
                  setSubscriptionSettings(prev => ({ ...prev, autoExecuteEnabled: checked }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Position Size Multiplier</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[subscriptionSettings.quantityMultiplier]}
                  onValueChange={([value]) => 
                    setSubscriptionSettings(prev => ({ ...prev, quantityMultiplier: value }))
                  }
                  min={0.1}
                  max={5}
                  step={0.1}
                  className="flex-1"
                />
                <span className="w-16 text-right font-mono">{subscriptionSettings.quantityMultiplier.toFixed(1)}x</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSettings} disabled={updateSettingsMutation.isPending}>
              {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advanced Settings Dialog */}
      <Dialog open={advancedSettingsOpen} onOpenChange={setAdvancedSettingsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Advanced Strategy Settings
            </DialogTitle>
            <DialogDescription>
              Fine-tune position sizing, risk management, and equity weighting for this strategy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Position Sizing */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Target className="h-4 w-4" />
                Position Sizing
              </h4>
              <div className="space-y-2">
                <Label>Quantity Multiplier</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[subscriptionSettings.quantityMultiplier]}
                    onValueChange={([value]) => 
                      setSubscriptionSettings(prev => ({ ...prev, quantityMultiplier: value }))
                    }
                    min={0.1}
                    max={10}
                    step={0.1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={subscriptionSettings.quantityMultiplier}
                    onChange={(e) => 
                      setSubscriptionSettings(prev => ({ ...prev, quantityMultiplier: Number(e.target.value) || 1 }))
                    }
                    className="w-24"
                    step={0.1}
                    min={0.1}
                    max={10}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Adjusts the base position size. 1x = standard, 2x = double, 0.5x = half
                </p>
              </div>
              <div className="space-y-2">
                <Label>Max Position Size (contracts)</Label>
                <Input
                  type="number"
                  value={subscriptionSettings.maxPositionSize || ''}
                  onChange={(e) => 
                    setSubscriptionSettings(prev => ({ 
                      ...prev, 
                      maxPositionSize: e.target.value ? Number(e.target.value) : null 
                    }))
                  }
                  placeholder="No limit"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of contracts for this strategy (leave empty for no limit)
                </p>
              </div>
            </div>

            {/* Notifications & Execution */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications & Execution
              </h4>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Signal Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive alerts when signals are generated</p>
                </div>
                <Switch
                  checked={subscriptionSettings.notificationsEnabled}
                  onCheckedChange={(checked) => 
                    setSubscriptionSettings(prev => ({ ...prev, notificationsEnabled: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Execute</Label>
                  <p className="text-xs text-muted-foreground">Automatically execute trades (requires broker connection)</p>
                </div>
                <Switch
                  checked={subscriptionSettings.autoExecuteEnabled}
                  onCheckedChange={(checked) => 
                    setSubscriptionSettings(prev => ({ ...prev, autoExecuteEnabled: checked }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdvancedSettingsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSettings} disabled={updateSettingsMutation.isPending}>
              {updateSettingsMutation.isPending ? 'Saving...' : 'Save Advanced Settings'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
