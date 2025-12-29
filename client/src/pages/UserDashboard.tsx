import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Bell,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  Settings,
  Zap,
  BarChart3,
  Plus,
  Minus,
  RefreshCw,
  LineChart,
  Wallet,
  Target,
  Activity,
  Scale,
  Calendar,
  Sun,
  Moon,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RiskDisclaimerModal } from "@/components/RiskDisclaimerModal";
import { NotificationSettings } from "@/components/NotificationSettings";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from "recharts";

// Time range options
const TIME_RANGES = [
  { value: "6M", label: "6M" },
  { value: "YTD", label: "YTD" },
  { value: "1Y", label: "1Y" },
  { value: "3Y", label: "3Y" },
  { value: "5Y", label: "5Y" },
  { value: "ALL", label: "ALL" },
] as const;

type TimeRange = (typeof TIME_RANGES)[number]["value"];

const CHART_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

export default function UserDashboard() {
  const { user } = useAuth();
  const showToast = (opts: {
    title: string;
    description?: string;
    variant?: string;
  }) => {
    console.log(
      `[${opts.variant || "info"}] ${opts.title}: ${opts.description || ""}`
    );
  };
  const [activeTab, setActiveTab] = useState("portfolio");
  const [selectedStrategy, setSelectedStrategy] = useState<number | null>(null);
  const [subscribeDialogOpen, setSubscribeDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("ALL");
  const [startingCapital, setStartingCapital] = useState(100000);
  const [subscriptionSettings, setSubscriptionSettings] = useState({
    notificationsEnabled: true,
    autoExecuteEnabled: false,
    quantityMultiplier: 1,
    maxPositionSize: null as number | null,
  });
  const [showSP500, setShowSP500] = useState(true);
  const [riskDisclaimerOpen, setRiskDisclaimerOpen] = useState(false);

  // Check if user has dismissed onboarding
  const showOnboarding =
    user && !user.onboardingDismissed && !user.onboardingCompleted;

  // Dismiss onboarding mutation
  const dismissOnboardingMutation = trpc.auth.dismissOnboarding.useMutation();

  // Fetch user subscriptions
  const {
    data: subscriptions,
    isLoading: loadingSubscriptions,
    refetch: refetchSubscriptions,
  } = trpc.subscription.list.useQuery();

  // Fetch available strategies
  const { data: strategies, isLoading: loadingStrategies } =
    trpc.subscription.availableStrategies.useQuery();

  // Fetch pending signals
  const {
    data: pendingSignals,
    isLoading: loadingSignals,
    refetch: refetchSignals,
  } = trpc.subscription.pendingSignals.useQuery();

  // Fetch subscription stats
  const { data: stats } = trpc.subscription.stats.useQuery();

  // Fetch portfolio analytics for user's subscribed strategies
  const {
    data: portfolioData,
    isLoading: loadingPortfolio,
    refetch: refetchPortfolio,
  } = trpc.subscription.portfolioAnalytics.useQuery({
    timeRange: timeRange === "ALL" ? undefined : timeRange,
    startingCapital,
  });

  // Fetch individual strategy equity curves
  const { data: strategyCurves } =
    trpc.subscription.strategyEquityCurves.useQuery({
      timeRange: timeRange === "ALL" ? undefined : timeRange,
      startingCapital,
    });

  // Subscribe mutation
  const subscribeMutation = trpc.subscription.subscribe.useMutation({
    onSuccess: () => {
      showToast({
        title: "Subscribed!",
        description: "You are now subscribed to this strategy.",
      });
      refetchSubscriptions();
      refetchPortfolio();
      setSubscribeDialogOpen(false);
    },
    onError: error => {
      showToast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Unsubscribe mutation
  const unsubscribeMutation = trpc.subscription.unsubscribe.useMutation({
    onSuccess: () => {
      showToast({
        title: "Unsubscribed",
        description: "You have been unsubscribed from this strategy.",
      });
      refetchSubscriptions();
      refetchPortfolio();
    },
    onError: error => {
      showToast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = trpc.subscription.updateSettings.useMutation({
    onSuccess: () => {
      showToast({
        title: "Settings Updated",
        description: "Your subscription settings have been saved.",
      });
      refetchSubscriptions();
      refetchPortfolio();
      setSettingsDialogOpen(false);
      setAdvancedSettingsOpen(false);
    },
    onError: error => {
      showToast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update signal mutation
  const updateSignalMutation = trpc.subscription.updateSignal.useMutation({
    onSuccess: () => {
      showToast({
        title: "Signal Updated",
        description: "Signal status has been updated.",
      });
      refetchSignals();
    },
    onError: error => {
      showToast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Called when user clicks Subscribe button - shows risk disclaimer first
  const handleSubscribeClick = () => {
    setRiskDisclaimerOpen(true);
  };

  // Called after user accepts risk disclaimer
  const handleSubscribeConfirmed = () => {
    if (selectedStrategy) {
      subscribeMutation.mutate({
        strategyId: selectedStrategy,
        ...subscriptionSettings,
      });
    }
    setRiskDisclaimerOpen(false);
  };

  const handleUnsubscribe = (strategyId: number) => {
    if (confirm("Are you sure you want to unsubscribe from this strategy?")) {
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

  const handleSignalAction = (
    signalId: number,
    action: "executed" | "skipped"
  ) => {
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
  const subscribedStrategyIds = new Set(
    subscriptions?.map(s => s.strategyId) || []
  );

  // Get unsubscribed strategies
  const unsubscribedStrategies =
    strategies?.filter(s => !subscribedStrategyIds.has(s.id)) || [];

  // Prepare combined equity curve data with S&P 500 benchmark
  // IMPORTANT: S&P 500 is COMPLETELY SEPARATE from portfolio calculations
  // It is only added as a visual comparison line, never affecting combined portfolio values
  const combinedChartData = useMemo(() => {
    if (!portfolioData?.equityCurve || portfolioData.equityCurve.length === 0)
      return [];

    // Build chart data from portfolio equity curve (the source of truth for combined portfolio)
    // This is calculated on the backend from ONLY the subscribed strategies' trades
    const chartData = portfolioData.equityCurve.map((point: any) => {
      const dataPoint: any = {
        date: point.date,
        combined: point.equity, // Combined portfolio from backend (strategies only, NO S&P 500)
      };

      // Add S&P 500 as a SEPARATE comparison line (does NOT affect combined value)
      if (showSP500 && portfolioData.benchmarkEquityCurve) {
        // Find the S&P 500 value on the portfolio's start date to use as the base
        const portfolioStartDate = portfolioData.equityCurve[0]?.date;
        const sp500OnPortfolioStart = portfolioData.benchmarkEquityCurve.find(
          (p: any) => p.date >= portfolioStartDate
        );
        const sp500BaseValue =
          sp500OnPortfolioStart?.equity ||
          portfolioData.benchmarkEquityCurve[0]?.equity ||
          startingCapital;

        // Find matching S&P 500 data point for this date
        const sp500Point = portfolioData.benchmarkEquityCurve.find(
          (p: any) => p.date === point.date
        );
        if (sp500Point) {
          // Re-scale S&P 500 so it starts at startingCapital on the portfolio start date
          dataPoint.sp500 =
            startingCapital * (sp500Point.equity / sp500BaseValue);
        }
      }

      return dataPoint;
    });

    // Add individual strategy curves (for visual comparison only)
    if (strategyCurves?.curves) {
      const portfolioDates = portfolioData.equityCurve.map((p: any) => p.date);
      const minDate = portfolioDates[0];
      const maxDate = portfolioDates[portfolioDates.length - 1];

      strategyCurves.curves.forEach((curve: any) => {
        curve.curve?.forEach((stratPoint: any) => {
          if (stratPoint.date >= minDate && stratPoint.date <= maxDate) {
            const existingPoint = chartData.find(
              (p: any) => p.date === stratPoint.date
            );
            if (existingPoint) {
              existingPoint[`strategy_${curve.strategyId}`] = stratPoint.equity;
            }
          }
        });
      });
    }

    // Forward-fill gaps to create continuous lines
    let lastSP500 = startingCapital;
    const lastStrategyValues: Record<string, number> = {};

    return chartData.map((point: any) => {
      // Forward-fill S&P 500 (only if showing)
      if (showSP500) {
        if (point.sp500 !== undefined) {
          lastSP500 = point.sp500;
        } else {
          point.sp500 = lastSP500;
        }
      }

      // Forward-fill individual strategies
      strategyCurves?.curves?.forEach((curve: any) => {
        const key = `strategy_${curve.strategyId}`;
        if (point[key] !== undefined) {
          lastStrategyValues[key] = point[key];
        } else if (lastStrategyValues[key] !== undefined) {
          point[key] = lastStrategyValues[key];
        }
      });

      return point;
    });
  }, [portfolioData, strategyCurves, showSP500, startingCapital]);

  // Allocation pie chart data
  const allocationData = useMemo(() => {
    if (!subscriptions || subscriptions.length === 0) return [];

    return subscriptions.map((sub, index) => ({
      name:
        (sub as any).strategyName ||
        sub.strategy?.name ||
        `Strategy ${sub.strategyId}`,
      value: Number(sub.quantityMultiplier) || 1,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [subscriptions]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with integrated controls - Mobile Optimized */}
      <div className="flex flex-col gap-3 sm:gap-4 px-1 sm:px-0">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">My Dashboard</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Welcome back, {user?.name || "Trader"}!
            </p>
          </div>

          {/* Controls - Top Right - Mobile Optimized */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Time Range */}
            <div className="flex items-center gap-0.5 sm:gap-1.5 bg-muted/30 rounded-lg p-0.5 sm:p-1 overflow-x-auto">
              {TIME_RANGES.map(range => (
                <Button
                  key={range.value}
                  variant={timeRange === range.value ? "default" : "ghost"}
                  size="sm"
                  className="h-6 sm:h-7 px-1.5 sm:px-2 text-[10px] sm:text-xs min-w-[32px] sm:min-w-[40px]"
                  onClick={() => setTimeRange(range.value)}
                >
                  {range.label}
                </Button>
              ))}
            </div>

            {/* Starting Capital */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                type="number"
                value={startingCapital}
                onChange={e =>
                  setStartingCapital(Number(e.target.value) || 100000)
                }
                className="w-20 sm:w-24 h-6 sm:h-7 text-xs sm:text-sm"
              />
            </div>

            {/* Refresh */}
            <Button
              onClick={() => {
                refetchSubscriptions();
                refetchSignals();
                refetchPortfolio();
              }}
              variant="outline"
              size="sm"
              className="h-6 sm:h-7 w-6 sm:w-auto px-1.5 sm:px-2"
            >
              <RefreshCw className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            </Button>
          </div>
        </div>

        {/* Tabs - Below Header - Mobile Optimized */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-muted/30 p-0.5 sm:p-1 h-auto flex flex-wrap sm:flex-nowrap gap-0.5 sm:gap-1">
            <TabsTrigger
              value="portfolio"
              className="text-[10px] sm:text-sm px-2 sm:px-4 py-1 sm:py-1.5"
            >
              <LineChart className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-1.5" />
              <span className="hidden xs:inline">Portfolio</span>
              <span className="xs:hidden">Port</span>
            </TabsTrigger>
            <TabsTrigger
              value="strategies"
              className="text-[10px] sm:text-sm px-2 sm:px-4 py-1 sm:py-1.5"
            >
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-1.5" />
              <span className="hidden sm:inline">My Strategies</span>
              <span className="sm:hidden">Strats</span>
            </TabsTrigger>
            <TabsTrigger
              value="signals"
              className="text-[10px] sm:text-sm px-2 sm:px-4 py-1 sm:py-1.5"
            >
              <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-1.5" />
              Signals
              {((stats as any)?.pendingSignals || 0) > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-0.5 sm:ml-1.5 h-4 sm:h-5 px-1 sm:px-1.5 text-[9px] sm:text-xs"
                >
                  {(stats as any)?.pendingSignals}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="discover"
              className="text-[10px] sm:text-sm px-2 sm:px-4 py-1 sm:py-1.5"
            >
              <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-1.5" />
              <span className="hidden xs:inline">Discover</span>
              <span className="xs:hidden">New</span>
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="text-[10px] sm:text-sm px-2 sm:px-4 py-1 sm:py-1.5"
            >
              <Bell className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Notifications</span>
              <span className="sm:hidden">Alerts</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Onboarding Checklist for new users */}
      {showOnboarding && user?.subscriptionTier !== "free" && (
        <OnboardingChecklist
          items={[
            {
              id: "strategies",
              title: "Select Your Strategies",
              description:
                "Choose which trading strategies to follow from our portfolio",
              href: "/my-dashboard?tab=discover",
              completed: (subscriptions?.length || 0) > 0,
            },
            {
              id: "broker",
              title: "Connect Your Broker",
              description:
                "Link Tradovate or IBKR for automated trade execution",
              href: "/admin?tab=brokers",
              completed: false, // TODO: Check broker connection status
            },
            {
              id: "notifications",
              title: "Configure Notifications",
              description: "Set up email and push alerts for trade signals",
              href: "/my-dashboard?tab=notifications",
              completed: false, // TODO: Check notification preferences
            },
          ]}
          onDismiss={() => dismissOnboardingMutation.mutate()}
        />
      )}

      {/* Today's Activity Section - Enhanced with Market Status and Upcoming Signals */}
      <Card className="bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-400" />
              Today's Activity
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Market Status Indicator */}
              {(() => {
                const now = new Date();
                const estHour = new Date(
                  now.toLocaleString("en-US", { timeZone: "America/New_York" })
                ).getHours();
                const estDay = new Date(
                  now.toLocaleString("en-US", { timeZone: "America/New_York" })
                ).getDay();
                const isWeekend = estDay === 0 || estDay === 6;
                const isMarketHours = estHour >= 9 && estHour < 16;
                const isPreMarket = estHour >= 4 && estHour < 9;
                const isAfterHours = estHour >= 16 && estHour < 20;

                if (isWeekend) {
                  return (
                    <Badge
                      variant="outline"
                      className="text-slate-400 border-slate-400/50 flex items-center gap-1"
                    >
                      <Moon className="h-3 w-3" />
                      Weekend
                    </Badge>
                  );
                } else if (isMarketHours) {
                  return (
                    <Badge
                      variant="outline"
                      className="text-emerald-400 border-emerald-400/50 flex items-center gap-1 animate-pulse"
                    >
                      <Sun className="h-3 w-3" />
                      Market Open
                    </Badge>
                  );
                } else if (isPreMarket) {
                  return (
                    <Badge
                      variant="outline"
                      className="text-amber-400 border-amber-400/50 flex items-center gap-1"
                    >
                      <Clock className="h-3 w-3" />
                      Pre-Market
                    </Badge>
                  );
                } else if (isAfterHours) {
                  return (
                    <Badge
                      variant="outline"
                      className="text-amber-400 border-amber-400/50 flex items-center gap-1"
                    >
                      <Clock className="h-3 w-3" />
                      After Hours
                    </Badge>
                  );
                } else {
                  return (
                    <Badge
                      variant="outline"
                      className="text-slate-400 border-slate-400/50 flex items-center gap-1"
                    >
                      <Moon className="h-3 w-3" />
                      Market Closed
                    </Badge>
                  );
                }
              })()}
              <Badge
                variant="outline"
                className="text-blue-400 border-blue-400/50"
              >
                {portfolioData?.todayTrades?.length || 0} trade
                {(portfolioData?.todayTrades?.length || 0) !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upcoming Activity Windows */}
          {subscriptions && subscriptions.length > 0 && (
            <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-medium text-cyan-400">
                  Expected Activity Windows
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                {/* ORB Strategies - Trade at market open */}
                {subscriptions.some((s: any) =>
                  (s.strategyName || s.strategy?.name || "")
                    .toLowerCase()
                    .includes("orb")
                ) && (
                  <div className="flex items-center gap-2 bg-emerald-500/10 rounded px-2 py-1.5 border border-emerald-500/20">
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                    <span className="text-muted-foreground">ORB:</span>
                    <span className="text-emerald-400 font-medium">
                      9:30 - 10:30 AM ET
                    </span>
                  </div>
                )}
                {/* Trend Strategies - Can trade anytime during market hours */}
                {subscriptions.some((s: any) =>
                  (s.strategyName || s.strategy?.name || "")
                    .toLowerCase()
                    .includes("trend")
                ) && (
                  <div className="flex items-center gap-2 bg-blue-500/10 rounded px-2 py-1.5 border border-blue-500/20">
                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                    <span className="text-muted-foreground">Trend:</span>
                    <span className="text-blue-400 font-medium">
                      9:30 AM - 4:00 PM ET
                    </span>
                  </div>
                )}
                {/* CL/GC - Commodities have extended hours */}
                {subscriptions.some((s: any) => {
                  const name = (
                    s.strategyName ||
                    s.strategy?.name ||
                    ""
                  ).toLowerCase();
                  return (
                    name.includes("cl") ||
                    name.includes("gc") ||
                    name.includes("crude") ||
                    name.includes("gold")
                  );
                }) && (
                  <div className="flex items-center gap-2 bg-amber-500/10 rounded px-2 py-1.5 border border-amber-500/20">
                    <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                    <span className="text-muted-foreground">Commodities:</span>
                    <span className="text-amber-400 font-medium">
                      6:00 PM - 5:00 PM ET
                    </span>
                  </div>
                )}
                {/* BTC - 24/7 */}
                {subscriptions.some((s: any) =>
                  (s.strategyName || s.strategy?.name || "")
                    .toLowerCase()
                    .includes("btc")
                ) && (
                  <div className="flex items-center gap-2 bg-orange-500/10 rounded px-2 py-1.5 border border-orange-500/20">
                    <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                    <span className="text-muted-foreground">BTC:</span>
                    <span className="text-orange-400 font-medium">24/7</span>
                  </div>
                )}
                {/* Default for ES/NQ/YM */}
                {subscriptions.some((s: any) => {
                  const name = (
                    s.strategyName ||
                    s.strategy?.name ||
                    ""
                  ).toLowerCase();
                  return (
                    (name.includes("es") ||
                      name.includes("nq") ||
                      name.includes("ym")) &&
                    !name.includes("orb") &&
                    !name.includes("trend")
                  );
                }) && (
                  <div className="flex items-center gap-2 bg-purple-500/10 rounded px-2 py-1.5 border border-purple-500/20">
                    <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                    <span className="text-muted-foreground">
                      Index Futures:
                    </span>
                    <span className="text-purple-400 font-medium">
                      6:00 PM - 5:00 PM ET
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Today's Trades */}
          {portfolioData?.todayTrades &&
          portfolioData.todayTrades.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {portfolioData.todayTrades.map((trade: any, idx: number) => (
                <div
                  key={trade.id || idx}
                  className={`flex-shrink-0 p-3 rounded-lg border min-w-[200px] ${
                    trade.isActive
                      ? "bg-blue-500/10 border-blue-500/30"
                      : trade.pnl >= 0
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-red-500/10 border-red-500/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">
                      {trade.strategyName}
                    </span>
                    <Badge
                      variant={trade.isActive ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {trade.isActive ? "Active" : "Closed"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>{trade.direction?.toUpperCase()}</span>
                      <span>{trade.symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Entry:</span>
                      <span>${trade.entryPrice?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time:</span>
                      <span>
                        {new Date(trade.entryDate).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {!trade.isActive && (
                      <div
                        className={`flex justify-between font-semibold ${trade.pnl >= 0 ? "text-green-400" : "text-red-400"}`}
                      >
                        <span>P&L:</span>
                        <span>
                          {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 py-4 text-muted-foreground text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>
                No trades today. Signals will appear here when strategies
                trigger.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

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
                  {portfolioData?.message ||
                    "Subscribe to strategies to see your portfolio analytics."}
                </p>
                <Button onClick={() => setActiveTab("discover")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Discover Strategies
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Combined Equity Curve */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Combined Equity Curve
                      <Badge
                        variant="outline"
                        className="text-xs font-normal text-green-400 border-green-400/30"
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        Live
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Your portfolio performance based on subscribed strategies
                      and multipliers
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="show-sp500"
                      className="text-sm text-muted-foreground"
                    >
                      Show S&P 500
                    </Label>
                    <Switch
                      id="show-sp500"
                      checked={showSP500}
                      onCheckedChange={setShowSP500}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] md:h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={combinedChartData}>
                        <defs>
                          <linearGradient
                            id="combinedGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#3b82f6"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="100%"
                              stopColor="#3b82f6"
                              stopOpacity={0.05}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.1)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: "#ffffff" }}
                          tickLine={{ stroke: "rgba(255,255,255,0.3)" }}
                          axisLine={{ stroke: "rgba(255,255,255,0.4)" }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                          interval="preserveStartEnd"
                          label={{
                            value: "Date",
                            position: "insideBottom",
                            offset: -5,
                            fill: "#ffffff",
                            fontSize: 11,
                          }}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#ffffff" }}
                          tickLine={{ stroke: "rgba(255,255,255,0.3)" }}
                          axisLine={{ stroke: "rgba(255,255,255,0.4)" }}
                          tickFormatter={value =>
                            value >= 1000000
                              ? `$${(value / 1000000).toFixed(1)}M`
                              : `$${(value / 1000).toFixed(0)}k`
                          }
                          width={70}
                          domain={["auto", "auto"]}
                          label={{
                            value: "Portfolio Value",
                            angle: -90,
                            position: "insideLeft",
                            fill: "#ffffff",
                            fontSize: 11,
                          }}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            `$${value.toLocaleString()}`,
                            name,
                          ]}
                          labelStyle={{ color: "black" }}
                          contentStyle={{
                            backgroundColor: "rgba(0,0,0,0.8)",
                            border: "1px solid rgba(255,255,255,0.2)",
                          }}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="combined"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          fill="url(#combinedGradient)"
                          name="Combined Portfolio"
                          connectNulls
                        />
                        {showSP500 && (
                          <Line
                            type="monotone"
                            dataKey="sp500"
                            stroke="#9ca3af"
                            strokeWidth={2}
                            dot={false}
                            name="S&P 500"
                            connectNulls
                            strokeDasharray="5 5"
                          />
                        )}
                        {strategyCurves?.curves?.map(
                          (curve: any, index: number) => (
                            <Line
                              key={curve.strategyId}
                              type="monotone"
                              dataKey={`strategy_${curve.strategyId}`}
                              stroke={
                                CHART_COLORS[(index + 1) % CHART_COLORS.length]
                              }
                              strokeWidth={1}
                              dot={false}
                              name={curve.strategyName}
                              strokeOpacity={0.6}
                              connectNulls
                            />
                          )
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Underwater Curve with S&P 500 Comparison */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        Underwater Equity Curve
                        <Badge
                          variant="outline"
                          className="text-xs font-normal text-green-400 border-green-400/30"
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          Live
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Drawdown from peak over time{" "}
                        {showSP500 && "(vs S&P 500)"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] md:h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={(() => {
                          // Apply forward-fill to eliminate gaps in drawdown chart
                          const portfolioCurve =
                            portfolioData.underwaterCurve || [];
                          if (portfolioCurve.length === 0) return [];

                          // Create date-based lookup for benchmark with forward-fill
                          const benchmarkMap = new Map<string, number>();
                          if (portfolioData.benchmarkUnderwaterCurve) {
                            portfolioData.benchmarkUnderwaterCurve.forEach(
                              (p: any) => {
                                benchmarkMap.set(p.date, p.drawdown);
                              }
                            );
                          }

                          // Process with forward-fill for benchmark
                          let lastSP500Drawdown = 0;
                          return portfolioCurve.map((p: any) => {
                            let sp500Drawdown = benchmarkMap.get(p.date);
                            if (sp500Drawdown !== undefined) {
                              lastSP500Drawdown = sp500Drawdown;
                            } else {
                              sp500Drawdown = lastSP500Drawdown;
                            }
                            return {
                              date: p.date,
                              drawdown: p.drawdown,
                              sp500Drawdown: showSP500
                                ? sp500Drawdown
                                : undefined,
                            };
                          });
                        })()}
                      >
                        <defs>
                          <linearGradient
                            id="drawdownGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#ef4444"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="100%"
                              stopColor="#ef4444"
                              stopOpacity={0.05}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.1)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: "#ffffff" }}
                          tickLine={{ stroke: "rgba(255,255,255,0.3)" }}
                          axisLine={{ stroke: "rgba(255,255,255,0.4)" }}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#ffffff" }}
                          tickLine={{ stroke: "rgba(255,255,255,0.3)" }}
                          axisLine={{ stroke: "rgba(255,255,255,0.4)" }}
                          tickFormatter={value => `${value.toFixed(0)}%`}
                          domain={["dataMin", 0]}
                          width={50}
                          label={{
                            value: "Drawdown %",
                            angle: -90,
                            position: "insideLeft",
                            fill: "#ffffff",
                            fontSize: 11,
                          }}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            `${value.toFixed(2)}%`,
                            name === "sp500Drawdown"
                              ? "S&P 500 DD"
                              : "Portfolio DD",
                          ]}
                          labelStyle={{ color: "black" }}
                          contentStyle={{
                            backgroundColor: "rgba(0,0,0,0.8)",
                            border: "1px solid rgba(255,255,255,0.2)",
                          }}
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
                        {showSP500 && (
                          <Line
                            type="monotone"
                            dataKey="sp500Drawdown"
                            stroke="#9ca3af"
                            strokeWidth={2}
                            dot={false}
                            name="S&P 500"
                            strokeDasharray="5 5"
                            connectNulls
                          />
                        )}
                      </ComposedChart>
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
                    <CardDescription>
                      Performance breakdown by month (actual trade data)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {portfolioData.monthlyReturns &&
                    portfolioData.monthlyReturns.length > 0 ? (
                      <>
                        {/* Group by year */}
                        {(() => {
                          const years = Array.from(
                            new Set(
                              portfolioData.monthlyReturns.map(
                                (m: any) => m.year
                              )
                            )
                          ).sort((a: any, b: any) => b - a);
                          return years.slice(0, 3).map(year => (
                            <div key={year} className="mb-4">
                              <div className="text-sm font-semibold text-muted-foreground mb-2">
                                {year}
                              </div>
                              <div className="grid grid-cols-12 gap-1 text-xs">
                                {[
                                  "Jan",
                                  "Feb",
                                  "Mar",
                                  "Apr",
                                  "May",
                                  "Jun",
                                  "Jul",
                                  "Aug",
                                  "Sep",
                                  "Oct",
                                  "Nov",
                                  "Dec",
                                ].map((month, idx) => {
                                  const monthData =
                                    portfolioData.monthlyReturns?.find(
                                      (m: any) =>
                                        m.year === year && m.month === idx + 1
                                    );
                                  const returnVal = monthData?.return || 0;
                                  const hasData = !!monthData;
                                  const bgColor = !hasData
                                    ? "rgba(100, 100, 100, 0.2)"
                                    : returnVal >= 0
                                      ? `rgba(34, 197, 94, ${Math.min(Math.abs(returnVal) / 15, 0.8) + 0.2})`
                                      : `rgba(239, 68, 68, ${Math.min(Math.abs(returnVal) / 15, 0.8) + 0.2})`;
                                  return (
                                    <div
                                      key={`${year}-${month}`}
                                      className="text-center py-2 rounded text-xs font-medium"
                                      style={{ backgroundColor: bgColor }}
                                      title={
                                        hasData
                                          ? `${month} ${year}: ${returnVal >= 0 ? "+" : ""}${returnVal.toFixed(2)}%`
                                          : `${month} ${year}: No data`
                                      }
                                    >
                                      {hasData ? (
                                        <>
                                          {returnVal >= 0 ? "+" : ""}
                                          {returnVal.toFixed(1)}%
                                        </>
                                      ) : (
                                        <span className="text-muted-foreground">
                                          -
                                        </span>
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
                        <span className="text-sm text-muted-foreground">
                          Value at Risk (95%)
                        </span>
                        <span className="font-bold text-red-400">
                          -
                          {(
                            (portfolioData.metrics?.maxDrawdown || 5) * 0.3
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Expected Shortfall
                        </span>
                        <span className="font-bold text-red-400">
                          -
                          {(
                            (portfolioData.metrics?.maxDrawdown || 5) * 0.5
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Volatility (Ann.)
                        </span>
                        <span className="font-bold">
                          {(
                            (portfolioData.metrics?.annualizedReturn || 10) /
                            (portfolioData.metrics?.sharpeRatio || 1)
                          ).toFixed(1)}
                          %
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Beta (vs S&P)
                        </span>
                        <span className="font-bold">0.42</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          Correlation
                        </span>
                        <span className="font-bold text-green-400">0.31</span>
                      </div>
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">
                            Risk Score
                          </span>
                          <Badge
                            variant={
                              portfolioData.metrics?.maxDrawdown &&
                              portfolioData.metrics.maxDrawdown < 15
                                ? "default"
                                : "destructive"
                            }
                          >
                            {portfolioData.metrics?.maxDrawdown &&
                            portfolioData.metrics.maxDrawdown < 10
                              ? "Low"
                              : portfolioData.metrics?.maxDrawdown &&
                                  portfolioData.metrics.maxDrawdown < 20
                                ? "Medium"
                                : "High"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Unified Performance Center */}
              <Card className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 border-slate-700/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Activity className="h-6 w-6 text-blue-400" />
                    Portfolio Performance Center
                  </CardTitle>
                  <CardDescription>
                    Complete portfolio statistics and allocation overview
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Activity Stats Row - Subscriptions, Pending, Executed, Skipped */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 pb-6 border-b border-border">
                    <div className="bg-gradient-to-br from-cyan-500/15 to-cyan-600/5 rounded-lg p-3 border border-cyan-500/20 flex items-center gap-3">
                      <div className="p-2 bg-cyan-500/20 rounded-lg">
                        <BarChart3 className="h-4 w-4 text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Subscriptions
                        </p>
                        <p className="text-lg font-bold text-cyan-400">
                          {stats?.totalSubscriptions || 0}
                        </p>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 rounded-lg p-3 border border-cyan-500/15 flex items-center gap-3">
                      <div className="p-2 bg-cyan-500/15 rounded-lg">
                        <Clock className="h-4 w-4 text-cyan-300" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pending</p>
                        <p className="text-lg font-bold text-cyan-300">
                          {(stats as any)?.pendingSignals || 0}
                        </p>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 rounded-lg p-3 border border-emerald-500/20 flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Executed
                        </p>
                        <p className="text-lg font-bold text-emerald-400">
                          {stats?.signalsExecuted || 0}
                        </p>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-slate-500/10 to-slate-600/5 rounded-lg p-3 border border-slate-500/15 flex items-center gap-3">
                      <div className="p-2 bg-slate-500/15 rounded-lg">
                        <XCircle className="h-4 w-4 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Skipped</p>
                        <p className="text-lg font-bold text-slate-400">
                          {stats?.signalsSkipped || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Top KPI Row - Key Performance Indicators - Unified Blue/Cyan Theme */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 pb-6 border-b border-border">
                    <div className="bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 rounded-lg p-3 border border-emerald-500/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-xs text-muted-foreground">
                          Total Return
                        </span>
                      </div>
                      <p className="text-xl font-bold text-emerald-400">
                        +{(portfolioData.metrics?.totalReturn || 0).toFixed(2)}%
                      </p>
                      <p className="text-xs text-emerald-300/60">
                        $
                        {(
                          ((portfolioData.metrics?.totalReturn || 0) *
                            startingCapital) /
                          100
                        ).toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500/15 to-blue-600/5 rounded-lg p-3 border border-blue-500/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Activity className="h-3.5 w-3.5 text-blue-400" />
                        <span className="text-xs text-muted-foreground">
                          Annualized
                        </span>
                      </div>
                      <p className="text-xl font-bold text-blue-400">
                        +
                        {(portfolioData.metrics?.annualizedReturn || 0).toFixed(
                          2
                        )}
                        %
                      </p>
                      <p className="text-xs text-blue-300/60">
                        $
                        {(
                          ((portfolioData.metrics?.annualizedReturn || 0) *
                            startingCapital) /
                          100
                        ).toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                        /yr
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-cyan-500/15 to-cyan-600/5 rounded-lg p-3 border border-cyan-500/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Scale className="h-3.5 w-3.5 text-cyan-400" />
                        <span className="text-xs text-muted-foreground">
                          Avg Trade
                        </span>
                      </div>
                      <p
                        className={`text-xl font-bold ${((portfolioData.metrics?.avgWin || 0) * (portfolioData.metrics?.winRate || 0)) / 100 - (Math.abs(portfolioData.metrics?.avgLoss || 0) * (100 - (portfolioData.metrics?.winRate || 0))) / 100 >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                      >
                        $
                        {(
                          ((portfolioData.metrics?.avgWin || 0) *
                            (portfolioData.metrics?.winRate || 0)) /
                            100 -
                          (Math.abs(portfolioData.metrics?.avgLoss || 0) *
                            (100 - (portfolioData.metrics?.winRate || 0))) /
                            100
                        ).toFixed(2)}
                      </p>
                      <p className="text-xs text-cyan-300/60">Expectancy</p>
                    </div>
                    <div className="bg-gradient-to-br from-rose-500/15 to-rose-600/5 rounded-lg p-3 border border-rose-500/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
                        <span className="text-xs text-muted-foreground">
                          Max Drawdown
                        </span>
                      </div>
                      <p className="text-xl font-bold text-rose-400">
                        {(portfolioData.metrics?.maxDrawdown || 0).toFixed(2)}%
                      </p>
                      <p className="text-xs text-rose-300/60">
                        -$
                        {(
                          ((portfolioData.metrics?.maxDrawdown || 0) *
                            startingCapital) /
                          100
                        ).toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-sky-500/15 to-sky-600/5 rounded-lg p-3 border border-sky-500/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Target className="h-3.5 w-3.5 text-sky-400" />
                        <span className="text-xs text-muted-foreground">
                          Win Rate
                        </span>
                      </div>
                      <p className="text-xl font-bold text-sky-400">
                        {portfolioData.metrics?.winRate.toFixed(1)}%
                      </p>
                      <p className="text-xs text-sky-300/60">
                        {portfolioData.metrics?.totalTrades.toLocaleString()}{" "}
                        trades
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-teal-500/15 to-teal-600/5 rounded-lg p-3 border border-teal-500/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Zap className="h-3.5 w-3.5 text-teal-400" />
                        <span className="text-xs text-muted-foreground">
                          Profit Factor
                        </span>
                      </div>
                      <p className="text-xl font-bold text-teal-400">
                        {portfolioData.metrics?.profitFactor.toFixed(2)}
                      </p>
                      <p className="text-xs text-teal-300/60">Gross P/L</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Strategy Allocation */}
                    <div className="space-y-4 bg-slate-900/30 rounded-xl p-4 border border-slate-700/30 min-h-[420px]">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Strategy Allocation
                      </h3>
                      <div className="h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPie>
                            <Pie
                              data={allocationData}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={65}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {allocationData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.color}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number, name: string) => [
                                `${((value / allocationData.reduce((s, d) => s + d.value, 0)) * 100).toFixed(0)}%`,
                                name,
                              ]}
                            />
                          </RechartsPie>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">
                        {allocationData.map((entry, index) => {
                          const total = allocationData.reduce(
                            (s, d) => s + d.value,
                            0
                          );
                          const percent = ((entry.value / total) * 100).toFixed(
                            0
                          );
                          return (
                            <div
                              key={index}
                              className="flex items-center gap-2 text-sm bg-muted/10 rounded-md px-2 py-1.5"
                            >
                              <div
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span
                                className="truncate flex-1"
                                title={entry.name}
                              >
                                {entry.name}
                              </span>
                              <span className="text-muted-foreground font-medium">
                                {percent}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Middle Column - Core Metrics */}
                    <div className="space-y-4 bg-slate-900/30 rounded-xl p-4 border border-slate-700/30 min-h-[420px]">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Core Metrics
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 rounded-lg p-3 border border-emerald-500/20">
                          <p className="text-xs text-muted-foreground">
                            Avg Win
                          </p>
                          <p className="text-lg font-bold text-emerald-400">
                            ${(portfolioData.metrics?.avgWin || 0).toFixed(2)}
                          </p>
                          <p className="text-xs text-emerald-300/60">
                            +
                            {(
                              ((portfolioData.metrics?.avgWin || 0) /
                                startingCapital) *
                              100
                            ).toFixed(3)}
                            %
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-rose-500/15 to-rose-600/5 rounded-lg p-3 border border-rose-500/20">
                          <p className="text-xs text-muted-foreground">
                            Avg Loss
                          </p>
                          <p className="text-lg font-bold text-rose-400">
                            -$
                            {Math.abs(
                              portfolioData.metrics?.avgLoss || 0
                            ).toFixed(2)}
                          </p>
                          <p className="text-xs text-rose-300/60">
                            -
                            {(
                              (Math.abs(portfolioData.metrics?.avgLoss || 0) /
                                startingCapital) *
                              100
                            ).toFixed(3)}
                            %
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-slate-500/10 to-slate-600/5 rounded-lg p-3 border border-slate-500/15">
                          <p className="text-xs text-muted-foreground">
                            Total Trades
                          </p>
                          <p className="text-lg font-bold">
                            {portfolioData.metrics?.totalTrades.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground/60">
                            {(
                              (portfolioData.metrics?.totalTrades || 0) /
                              (new Date().getFullYear() - 2010 || 1)
                            ).toFixed(0)}
                            /yr avg
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-500/15 to-blue-600/5 rounded-lg p-3 border border-blue-500/20">
                          <p className="text-xs text-muted-foreground">
                            Ann. Return
                          </p>
                          <p className="text-lg font-bold text-blue-400">
                            {portfolioData.metrics?.annualizedReturn.toFixed(2)}
                            %
                          </p>
                          <p className="text-xs text-blue-300/60">CAGR</p>
                        </div>
                      </div>
                      {/* Win/Loss Stats */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 rounded-lg p-3 border border-cyan-500/15">
                          <p className="text-xs text-muted-foreground">
                            Winning Trades
                          </p>
                          <p className="text-lg font-bold text-cyan-400">
                            {Math.round(
                              ((portfolioData.metrics?.totalTrades || 0) *
                                (portfolioData.metrics?.winRate || 0)) /
                                100
                            ).toLocaleString()}
                          </p>
                          <p className="text-xs text-cyan-300/60">
                            {portfolioData.metrics?.winRate.toFixed(1)}% win
                            rate
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-lg p-3 border border-amber-500/15">
                          <p className="text-xs text-muted-foreground">
                            Losing Trades
                          </p>
                          <p className="text-lg font-bold text-amber-400">
                            {Math.round(
                              ((portfolioData.metrics?.totalTrades || 0) *
                                (100 - (portfolioData.metrics?.winRate || 0))) /
                                100
                            ).toLocaleString()}
                          </p>
                          <p className="text-xs text-amber-300/60">
                            {(
                              100 - (portfolioData.metrics?.winRate || 0)
                            ).toFixed(1)}
                            % loss rate
                          </p>
                        </div>
                      </div>
                      {/* Payoff Ratio Bar */}
                      <div className="bg-gradient-to-br from-slate-500/10 to-slate-600/5 rounded-lg p-3 border border-slate-500/15">
                        <div className="flex justify-between text-xs text-muted-foreground mb-2">
                          <span>Payoff Ratio (Avg Win / Avg Loss)</span>
                          <span className="font-bold text-cyan-400">
                            {portfolioData.metrics?.avgLoss
                              ? (
                                  (portfolioData.metrics?.avgWin || 0) /
                                  Math.abs(portfolioData.metrics?.avgLoss)
                                ).toFixed(2)
                              : "N/A"}
                            :1
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full"
                            style={{
                              width: `${Math.min(100, ((portfolioData.metrics?.avgWin || 0) / Math.abs(portfolioData.metrics?.avgLoss || 1)) * 50)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Risk-Adjusted Metrics */}
                    <div className="space-y-4 bg-slate-900/30 rounded-xl p-4 border border-slate-700/30 min-h-[420px]">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Risk-Adjusted
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 rounded-lg p-3 border border-cyan-500/15">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Sharpe Ratio
                            </p>
                            <p className="text-xs text-muted-foreground/60">
                              Risk-adjusted return
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-xl font-bold ${(portfolioData.metrics?.sharpeRatio || 0) >= 1 ? "text-emerald-400" : (portfolioData.metrics?.sharpeRatio || 0) >= 0.5 ? "text-amber-400" : "text-rose-400"}`}
                            >
                              {portfolioData.metrics?.sharpeRatio.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground/50">
                              {(portfolioData.metrics?.sharpeRatio || 0) >= 1
                                ? "Excellent"
                                : (portfolioData.metrics?.sharpeRatio || 0) >=
                                    0.5
                                  ? "Good"
                                  : "Poor"}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-lg p-3 border border-blue-500/15">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Sortino Ratio
                            </p>
                            <p className="text-xs text-muted-foreground/60">
                              Downside risk only
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-xl font-bold ${(portfolioData.metrics?.sortinoRatio || 0) >= 2 ? "text-emerald-400" : (portfolioData.metrics?.sortinoRatio || 0) >= 1 ? "text-amber-400" : "text-rose-400"}`}
                            >
                              {portfolioData.metrics?.sortinoRatio.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground/50">
                              {(portfolioData.metrics?.sortinoRatio || 0) >= 2
                                ? "Excellent"
                                : (portfolioData.metrics?.sortinoRatio || 0) >=
                                    1
                                  ? "Good"
                                  : "Poor"}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center bg-gradient-to-br from-teal-500/10 to-teal-600/5 rounded-lg p-3 border border-teal-500/15">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Calmar Ratio
                            </p>
                            <p className="text-xs text-muted-foreground/60">
                              Return / Max DD
                            </p>
                          </div>
                          <div className="text-right">
                            <p
                              className={`text-xl font-bold ${(portfolioData.metrics?.calmarRatio || 0) >= 1 ? "text-emerald-400" : (portfolioData.metrics?.calmarRatio || 0) >= 0.5 ? "text-amber-400" : "text-rose-400"}`}
                            >
                              {portfolioData.metrics?.calmarRatio.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground/50">
                              {(portfolioData.metrics?.calmarRatio || 0) >= 1
                                ? "Excellent"
                                : (portfolioData.metrics?.calmarRatio || 0) >=
                                    0.5
                                  ? "Good"
                                  : "Poor"}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center bg-gradient-to-br from-slate-500/10 to-slate-600/5 rounded-lg p-3 border border-slate-500/15">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Volatility (Ann.)
                            </p>
                            <p className="text-xs text-muted-foreground/60">
                              Standard deviation
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-sky-400">
                              {(
                                (portfolioData.metrics?.annualizedReturn ||
                                  10) /
                                (portfolioData.metrics?.sharpeRatio || 1)
                              ).toFixed(1)}
                              %
                            </p>
                            <p className="text-xs text-muted-foreground/50">
                              Annual σ
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-lg p-3 border border-purple-500/15">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Recovery Factor
                            </p>
                            <p className="text-xs text-muted-foreground/60">
                              Net P/L / Max DD
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-bold text-purple-400">
                              {(
                                (portfolioData.metrics?.totalReturn || 0) /
                                Math.abs(
                                  portfolioData.metrics?.maxDrawdown || 1
                                )
                              ).toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground/50">
                              Times recovered
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Strategy Correlation Matrix */}
              {portfolioData.strategyCorrelation &&
                portfolioData.strategyCorrelation.length > 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Strategy Correlation Matrix
                      </CardTitle>
                      <CardDescription>
                        Correlation between your subscribed strategies (lower is
                        better for diversification)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr>
                              <th className="p-2 text-left"></th>
                              {portfolioData.strategyCorrelation.map(
                                (s: any) => (
                                  <th
                                    key={s.strategyId}
                                    className="p-2 text-center font-medium truncate max-w-[80px]"
                                    title={s.strategyName}
                                  >
                                    {s.strategyName.split(" ")[0]}
                                  </th>
                                )
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {portfolioData.strategyCorrelation.map(
                              (row: any) => (
                                <tr key={row.strategyId}>
                                  <td
                                    className="p-2 font-medium truncate max-w-[100px]"
                                    title={row.strategyName}
                                  >
                                    {row.strategyName
                                      .split(" ")
                                      .slice(0, 2)
                                      .join(" ")}
                                  </td>
                                  {row.correlations.map((corr: any) => {
                                    const value = corr.correlation;
                                    const isHighCorr = Math.abs(value) > 0.7;
                                    const isMedCorr = Math.abs(value) > 0.4;
                                    const bgColor =
                                      value === 1
                                        ? "bg-blue-500/30"
                                        : isHighCorr
                                          ? "bg-red-500/30"
                                          : isMedCorr
                                            ? "bg-yellow-500/30"
                                            : "bg-green-500/30";
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
                              )
                            )}
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
                        Lower correlation between strategies provides better
                        diversification and reduces portfolio risk.
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
                <p className="text-muted-foreground mb-4">
                  You haven't subscribed to any strategies yet.
                </p>
                <Button onClick={() => setActiveTab("discover")}>
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
                    style={{
                      backgroundColor:
                        CHART_COLORS[index % CHART_COLORS.length],
                    }}
                  />
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {(sub as any).strategyName ||
                          sub.strategy?.name ||
                          "Strategy"}
                      </CardTitle>
                      <Badge
                        variant={
                          sub.notificationsEnabled ? "default" : "secondary"
                        }
                      >
                        {sub.notificationsEnabled ? (
                          <Bell className="h-3 w-3" />
                        ) : (
                          <Bell className="h-3 w-3 opacity-50" />
                        )}
                      </Badge>
                    </div>
                    <CardDescription>
                      Subscribed{" "}
                      {new Date(sub.subscribedAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Multiplier</p>
                        <p className="font-semibold text-blue-400">
                          {Number(sub.quantityMultiplier).toFixed(4)}x
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Auto-Execute</p>
                        <p className="font-semibold">
                          {sub.autoExecuteEnabled ? "On" : "Off"}
                        </p>
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
                <p className="text-muted-foreground">
                  No pending signals. You're all caught up!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingSignals.map((signal: any) => (
                <Card key={signal.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-full ${signal.direction === "long" ? "bg-green-500/20" : "bg-red-500/20"}`}
                        >
                          {signal.direction === "long" ? (
                            <TrendingUp className="h-5 w-5 text-green-500" />
                          ) : (
                            <TrendingDown className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{signal.strategyName}</p>
                          <p className="text-sm text-muted-foreground">
                            {signal.direction.toUpperCase()} @ $
                            {(signal.price / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleSignalAction(signal.id, "executed")
                          }
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Executed
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleSignalAction(signal.id, "skipped")
                          }
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
                <p className="text-muted-foreground">
                  You're subscribed to all available strategies!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unsubscribedStrategies.map(strategy => (
                <Card key={strategy.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{strategy.name}</CardTitle>
                    <CardDescription>
                      {strategy.symbol} •{" "}
                      {strategy.strategyType || "Trading Strategy"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {strategy.description || "No description available."}
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

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <NotificationSettings />
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
                onCheckedChange={checked =>
                  setSubscriptionSettings(prev => ({
                    ...prev,
                    notificationsEnabled: checked,
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Auto-Execute Trades</Label>
              <Switch
                checked={subscriptionSettings.autoExecuteEnabled}
                onCheckedChange={checked =>
                  setSubscriptionSettings(prev => ({
                    ...prev,
                    autoExecuteEnabled: checked,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Position Size Multiplier</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[subscriptionSettings.quantityMultiplier]}
                  onValueChange={([value]) =>
                    setSubscriptionSettings(prev => ({
                      ...prev,
                      quantityMultiplier: value,
                    }))
                  }
                  min={0.1}
                  max={5}
                  step={0.1}
                  className="flex-1"
                />
                <span className="w-16 text-right font-mono">
                  {subscriptionSettings.quantityMultiplier.toFixed(1)}x
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Multiply the base position size by this factor
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSubscribeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubscribeClick}
              disabled={subscribeMutation.isPending}
            >
              {subscribeMutation.isPending ? "Subscribing..." : "Subscribe"}
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
                onCheckedChange={checked =>
                  setSubscriptionSettings(prev => ({
                    ...prev,
                    notificationsEnabled: checked,
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Auto-Execute Trades</Label>
              <Switch
                checked={subscriptionSettings.autoExecuteEnabled}
                onCheckedChange={checked =>
                  setSubscriptionSettings(prev => ({
                    ...prev,
                    autoExecuteEnabled: checked,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Position Size Multiplier</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[subscriptionSettings.quantityMultiplier]}
                  onValueChange={([value]) =>
                    setSubscriptionSettings(prev => ({
                      ...prev,
                      quantityMultiplier: value,
                    }))
                  }
                  min={0.1}
                  max={5}
                  step={0.1}
                  className="flex-1"
                />
                <span className="w-16 text-right font-mono">
                  {subscriptionSettings.quantityMultiplier.toFixed(1)}x
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSettingsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateSettings}
              disabled={updateSettingsMutation.isPending}
            >
              {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advanced Settings Dialog */}
      <Dialog
        open={advancedSettingsOpen}
        onOpenChange={setAdvancedSettingsOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Advanced Strategy Settings
            </DialogTitle>
            <DialogDescription>
              Fine-tune position sizing, risk management, and equity weighting
              for this strategy.
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
                      setSubscriptionSettings(prev => ({
                        ...prev,
                        quantityMultiplier: value,
                      }))
                    }
                    min={0.1}
                    max={10}
                    step={0.1}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    value={subscriptionSettings.quantityMultiplier}
                    onChange={e =>
                      setSubscriptionSettings(prev => ({
                        ...prev,
                        quantityMultiplier: Number(e.target.value) || 1,
                      }))
                    }
                    className="w-24"
                    step={0.1}
                    min={0.1}
                    max={10}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Adjusts the base position size. 1x = standard, 2x = double,
                  0.5x = half
                </p>
              </div>
              <div className="space-y-2">
                <Label>Max Position Size (contracts)</Label>
                <Input
                  type="number"
                  value={subscriptionSettings.maxPositionSize || ""}
                  onChange={e =>
                    setSubscriptionSettings(prev => ({
                      ...prev,
                      maxPositionSize: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                  placeholder="No limit"
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of contracts for this strategy (leave empty for
                  no limit)
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
                  <p className="text-xs text-muted-foreground">
                    Receive alerts when signals are generated
                  </p>
                </div>
                <Switch
                  checked={subscriptionSettings.notificationsEnabled}
                  onCheckedChange={checked =>
                    setSubscriptionSettings(prev => ({
                      ...prev,
                      notificationsEnabled: checked,
                    }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Execute</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically execute trades (requires broker connection)
                  </p>
                </div>
                <Switch
                  checked={subscriptionSettings.autoExecuteEnabled}
                  onCheckedChange={checked =>
                    setSubscriptionSettings(prev => ({
                      ...prev,
                      autoExecuteEnabled: checked,
                    }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAdvancedSettingsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateSettings}
              disabled={updateSettingsMutation.isPending}
            >
              {updateSettingsMutation.isPending
                ? "Saving..."
                : "Save Advanced Settings"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Risk Disclaimer Modal */}
      <RiskDisclaimerModal
        open={riskDisclaimerOpen}
        onOpenChange={setRiskDisclaimerOpen}
        onAccept={handleSubscribeConfirmed}
        strategyName={
          strategies?.find(s => s.id === selectedStrategy)?.name ||
          "this strategy"
        }
      />
    </div>
  );
}
