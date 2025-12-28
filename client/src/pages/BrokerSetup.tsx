import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import type { PaperOrderResult } from "../../../server/paperTradingService";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  CheckCircle,
  Circle,
  ExternalLink,
  PlayCircle,
  Shield,
  Zap,
  DollarSign,
  Clock,
  ArrowRight,
  AlertTriangle,
  Star,
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  Target,
  Info,
  HelpCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================================================
// TYPES & DATA
// ============================================================================

interface BrokerOption {
  id: string;
  name: string;
  logo: string;
  description: string;
  features: string[];
  requirements: string[];
  setupTime: string;
  minDeposit: string;
  apiCost: string;
  recommended: boolean;
  status: "available" | "coming_soon";
  difficulty: "easy" | "medium" | "advanced";
}

const brokerOptions: BrokerOption[] = [
  {
    id: "paper",
    name: "Paper Trading",
    logo: "📝",
    description:
      "Practice with $100,000 virtual capital. Start immediately - no account needed.",
    features: [
      "Instant setup - no approval needed",
      "$100,000 virtual capital",
      "Full order types (Market, Limit, Stop)",
      "Real-time position tracking",
      "P&L and win rate analytics",
    ],
    requirements: ["None - just sign in to your dashboard"],
    setupTime: "Instant",
    minDeposit: "$0",
    apiCost: "Free",
    recommended: true,
    status: "available",
    difficulty: "easy",
  },
  {
    id: "alpaca",
    name: "Alpaca",
    logo: "🦙",
    description:
      "Commission-free trading with modern API. Great for stocks and ETFs.",
    features: [
      "Commission-free trading",
      "Modern REST + WebSocket API",
      "Paper trading mode included",
      "Real-time market data",
    ],
    requirements: ["Create free Alpaca account", "Generate API key and secret"],
    setupTime: "5-10 minutes",
    minDeposit: "$0",
    apiCost: "Free",
    recommended: false,
    status: "available",
    difficulty: "easy",
  },
  {
    id: "tradovate",
    name: "Tradovate",
    logo: "📊",
    description:
      "Professional futures trading platform with competitive pricing.",
    features: [
      "Futures trading (ES, NQ, CL, etc.)",
      "REST + WebSocket API",
      "Real-time market data",
      "Advanced order types",
    ],
    requirements: [
      "Create Tradovate account",
      "Fund account with $1,000+",
      "Apply for API access",
    ],
    setupTime: "3-5 days",
    minDeposit: "$1,000",
    apiCost: "$25/month",
    recommended: false,
    status: "available",
    difficulty: "medium",
  },
  {
    id: "ibkr",
    name: "Interactive Brokers",
    logo: "🏦",
    description:
      "Industry-leading broker with comprehensive API access via Client Portal Gateway.",
    features: [
      "Full futures support (ES, NQ, CL, etc.)",
      "Lowest commissions in the industry",
      "Global market access (100+ markets)",
      "Professional-grade REST API",
      "Paper trading mode available",
    ],
    requirements: [
      "Create IBKR account (free)",
      "Download Client Portal Gateway",
      "Set up tunnel (ngrok or Cloudflare)",
      "Fund account ($2,000 minimum for futures)",
    ],
    setupTime: "30-60 minutes",
    minDeposit: "$2,000",
    apiCost: "Free",
    recommended: false,
    status: "available",
    difficulty: "advanced",
  },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BrokerSetup() {
  const [selectedBroker, setSelectedBroker] = useState<string>("paper");
  const [activeView, setActiveView] = useState<"select" | "trade">("select");

  const selectedBrokerData = brokerOptions.find(b => b.id === selectedBroker);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Broker Setup</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Connect a broker to execute trades automatically from your
              strategies
            </p>
          </div>
          {selectedBroker === "paper" && activeView === "trade" && (
            <Button variant="outline" onClick={() => setActiveView("select")}>
              <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
              Back to Broker Selection
            </Button>
          )}
        </div>

        {/* Quick Start Guide */}
        <Card className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-emerald-500/20">
          <CardContent className="flex items-start gap-4 pt-6">
            <div className="p-2 rounded-full bg-emerald-500/20">
              <Info className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-400">
                Getting Started
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                <strong>Step 1:</strong> Start with Paper Trading to test your
                strategies risk-free. <strong>Step 2:</strong> Once confident,
                connect a live broker. <strong>Step 3:</strong> Enable
                auto-execution in your strategy settings.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        {activeView === "select" ? (
          <BrokerSelectionView
            selectedBroker={selectedBroker}
            setSelectedBroker={setSelectedBroker}
            selectedBrokerData={selectedBrokerData}
            onStartPaperTrading={() => setActiveView("trade")}
          />
        ) : (
          <PaperTradingView onBack={() => setActiveView("select")} />
        )}

        {/* Security Note */}
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="flex items-start gap-4 pt-6">
            <Shield className="h-6 w-6 text-blue-500 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-500">
                Your Credentials Are Secure
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                API credentials are encrypted and stored securely. We never have
                access to your broker password. You can revoke API access at any
                time from your broker's settings.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

// ============================================================================
// BROKER SELECTION VIEW
// ============================================================================

function BrokerSelectionView({
  selectedBroker,
  setSelectedBroker,
  selectedBrokerData,
  onStartPaperTrading,
}: {
  selectedBroker: string;
  setSelectedBroker: (id: string) => void;
  selectedBrokerData: BrokerOption | undefined;
  onStartPaperTrading: () => void;
}) {
  const [showApiForm, setShowApiForm] = useState<string | null>(null);

  // If showing API form, render that instead
  if (showApiForm === "alpaca") {
    return <AlpacaSetupForm onBack={() => setShowApiForm(null)} />;
  }
  if (showApiForm === "tradovate") {
    return <TradovateSetupForm onBack={() => setShowApiForm(null)} />;
  }

  return (
    <BrokerSelectionViewInner
      selectedBroker={selectedBroker}
      setSelectedBroker={setSelectedBroker}
      selectedBrokerData={selectedBrokerData}
      onStartPaperTrading={onStartPaperTrading}
      onShowApiForm={setShowApiForm}
    />
  );
}

function BrokerSelectionViewInner({
  selectedBroker,
  setSelectedBroker,
  selectedBrokerData,
  onStartPaperTrading,
  onShowApiForm,
}: {
  selectedBroker: string;
  setSelectedBroker: (id: string) => void;
  selectedBrokerData: BrokerOption | undefined;
  onStartPaperTrading: () => void;
  onShowApiForm: (broker: string) => void;
}) {
  return (
    <>
      {/* Broker Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {brokerOptions.map(broker => (
          <Card
            key={broker.id}
            className={`cursor-pointer transition-all hover:border-primary/50 ${
              selectedBroker === broker.id
                ? "border-primary ring-2 ring-primary/20"
                : ""
            } ${broker.status === "coming_soon" ? "opacity-60" : ""}`}
            onClick={() =>
              broker.status !== "coming_soon" && setSelectedBroker(broker.id)
            }
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-3xl">{broker.logo}</span>
                <div className="flex flex-col gap-1 items-end">
                  {broker.recommended && (
                    <Badge variant="default" className="bg-emerald-600 text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Start Here
                    </Badge>
                  )}
                  {broker.status === "coming_soon" && (
                    <Badge variant="secondary" className="text-xs">
                      Coming Soon
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      broker.difficulty === "easy"
                        ? "border-green-500/50 text-green-400"
                        : broker.difficulty === "medium"
                          ? "border-yellow-500/50 text-yellow-400"
                          : "border-red-500/50 text-red-400"
                    }`}
                  >
                    {broker.difficulty === "easy"
                      ? "Beginner"
                      : broker.difficulty === "medium"
                        ? "Intermediate"
                        : "Advanced"}
                  </Badge>
                </div>
              </div>
              <CardTitle className="text-lg mt-2">{broker.name}</CardTitle>
              <CardDescription className="text-xs line-clamp-2">
                {broker.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {broker.setupTime}
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {broker.minDeposit}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected Broker Details */}
      {selectedBrokerData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Features & Requirements */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">{selectedBrokerData.logo}</span>
                {selectedBrokerData.name}
              </CardTitle>
              <CardDescription>
                {selectedBrokerData.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="features">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="features">What You Get</TabsTrigger>
                  <TabsTrigger value="requirements">What You Need</TabsTrigger>
                </TabsList>
                <TabsContent value="features" className="mt-4">
                  <ul className="space-y-2">
                    {selectedBrokerData.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </TabsContent>
                <TabsContent value="requirements" className="mt-4">
                  <ul className="space-y-2">
                    {selectedBrokerData.requirements.map((req, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Circle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{req}</span>
                      </li>
                    ))}
                  </ul>
                </TabsContent>
              </Tabs>

              {/* Cost Summary */}
              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  Cost Summary
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">
                          These are broker costs, not STS Futures fees.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center p-2 bg-background rounded">
                    <p className="text-muted-foreground text-xs">Setup Time</p>
                    <p className="font-medium">
                      {selectedBrokerData.setupTime}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-background rounded">
                    <p className="text-muted-foreground text-xs">Min Deposit</p>
                    <p className="font-medium">
                      {selectedBrokerData.minDeposit}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-background rounded">
                    <p className="text-muted-foreground text-xs">API Cost</p>
                    <p className="font-medium">{selectedBrokerData.apiCost}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Setup Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                How to Connect
              </CardTitle>
              <CardDescription>
                Follow these steps to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SetupSteps brokerId={selectedBroker} />

              {/* Action Button */}
              <div className="mt-6">
                {selectedBroker === "paper" ? (
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={onStartPaperTrading}
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Start Paper Trading
                  </Button>
                ) : selectedBroker === "alpaca" ? (
                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      onClick={() =>
                        window.open(
                          "https://app.alpaca.markets/signup",
                          "_blank"
                        )
                      }
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Create Alpaca Account
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => onShowApiForm("alpaca")}
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />I Have API Keys
                    </Button>
                  </div>
                ) : selectedBroker === "tradovate" ? (
                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      onClick={() =>
                        window.open("https://www.tradovate.com/", "_blank")
                      }
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Create Tradovate Account
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => onShowApiForm("tradovate")}
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />I Have API Keys
                    </Button>
                  </div>
                ) : selectedBroker === "ibkr" ? (
                  <IBKRSetupForm />
                ) : (
                  <Button disabled className="w-full">
                    <Clock className="h-4 w-4 mr-2" />
                    Coming Soon
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

// ============================================================================
// SETUP STEPS COMPONENT
// ============================================================================

function SetupSteps({ brokerId }: { brokerId: string }) {
  const steps = {
    paper: [
      {
        step: 1,
        title: "You're Already Signed In",
        description: "No additional setup needed",
        completed: true,
      },
      {
        step: 2,
        title: "Click Start Paper Trading",
        description: "Begin with $100,000 virtual capital",
        completed: false,
      },
      {
        step: 3,
        title: "Place Your First Trade",
        description: "Test your strategies risk-free",
        completed: false,
      },
    ],
    alpaca: [
      {
        step: 1,
        title: "Create Free Account",
        description: "Sign up at alpaca.markets",
        completed: false,
      },
      {
        step: 2,
        title: "Generate API Keys",
        description: "Go to API Keys section",
        completed: false,
      },
      {
        step: 3,
        title: "Enter Keys Here",
        description: "Paste your API key and secret",
        completed: false,
      },
      {
        step: 4,
        title: "Test Connection",
        description: "Verify with a paper trade",
        completed: false,
      },
    ],
    tradovate: [
      {
        step: 1,
        title: "Create Account",
        description: "Sign up at tradovate.com",
        completed: false,
      },
      {
        step: 2,
        title: "Fund Account",
        description: "Deposit minimum $1,000",
        completed: false,
      },
      {
        step: 3,
        title: "Request API Access",
        description: "Apply in account settings",
        completed: false,
      },
      {
        step: 4,
        title: "Wait for Approval",
        description: "Usually 1-3 business days",
        completed: false,
      },
      {
        step: 5,
        title: "Enter Credentials",
        description: "Connect your account here",
        completed: false,
      },
    ],
    ibkr: [
      {
        step: 1,
        title: "Create IBKR Account",
        description: "Sign up free at interactivebrokers.com",
        completed: false,
      },
      {
        step: 2,
        title: "Download Client Portal Gateway",
        description: "Get the gateway from IBKR's website",
        completed: false,
      },
      {
        step: 3,
        title: "Set Up Tunnel",
        description: "Use ngrok or Cloudflare Tunnel to expose gateway",
        completed: false,
      },
      {
        step: 4,
        title: "Enter Gateway URL",
        description: "Paste your tunnel URL below",
        completed: false,
      },
      {
        step: 5,
        title: "Test Connection",
        description: "Verify gateway is authenticated",
        completed: false,
      },
    ],
  };

  const currentSteps = steps[brokerId as keyof typeof steps] || [];

  return (
    <div className="space-y-3">
      {currentSteps.map((step, i) => (
        <div key={i} className="flex items-start gap-3">
          <div
            className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              step.completed
                ? "bg-green-500 text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {step.completed ? <CheckCircle className="h-4 w-4" /> : step.step}
          </div>
          <div>
            <p className="font-medium text-sm">{step.title}</p>
            <p className="text-xs text-muted-foreground">{step.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// PAPER TRADING VIEW
// ============================================================================

function PaperTradingView({ onBack: _onBack }: { onBack: () => void }) {
  const [symbol, setSymbol] = useState("ES");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState(1);
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP">(
    "MARKET"
  );
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");

  const {
    data: account,
    isLoading: accountLoading,
    refetch: refetchAccount,
  } = trpc.paperTrading.getAccount.useQuery();
  const {
    data: positions,
    isLoading: positionsLoading,
    refetch: refetchPositions,
  } = trpc.paperTrading.getPositions.useQuery();
  const {
    data: tradeHistory,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = trpc.paperTrading.getTradeHistory.useQuery({ limit: 20 });

  const executeTrade = trpc.paperTrading.executeTrade.useMutation({
    onSuccess: (result: PaperOrderResult) => {
      if (result.success) {
        toast.success(result.message || "Trade executed successfully");
        refetchAccount();
        refetchPositions();
        refetchHistory();
      } else {
        toast.error(result.error || "Trade failed");
      }
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  const resetAccount = trpc.paperTrading.resetAccount.useMutation({
    onSuccess: () => {
      toast.success("Paper trading account reset to $100,000");
      refetchAccount();
      refetchPositions();
      refetchHistory();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeTrade.mutate({
      symbol,
      side,
      quantity,
      orderType,
      limitPrice: limitPrice ? parseFloat(limitPrice) * 100 : undefined,
      stopPrice: stopPrice ? parseFloat(stopPrice) * 100 : undefined,
    });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">📝</span>
            Paper Trading
          </h2>
          <p className="text-muted-foreground text-sm">
            Practice with $100,000 virtual capital - no risk, real learning
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchAccount();
              refetchPositions();
              refetchHistory();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              if (
                confirm(
                  "Reset your paper trading account? This will close all positions and reset your balance to $100,000."
                )
              ) {
                resetAccount.mutate();
              }
            }}
          >
            Reset Account
          </Button>
        </div>
      </div>

      {/* Account Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {accountLoading ? "..." : formatCurrency(account?.balance || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Starting: $100,000</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            {(account?.realizedPnl || 0) >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-xl sm:text-2xl font-bold ${(account?.realizedPnl || 0) >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              {accountLoading
                ? "..."
                : formatCurrency(account?.realizedPnl || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPercent(((account?.realizedPnl || 0) / 10000000) * 100)}{" "}
              return
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {accountLoading
                ? "..."
                : `${(account?.winRate || 0).toFixed(1)}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              {account?.totalTrades || 0} trades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Open Positions
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {positionsLoading ? "..." : positions?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Unrealized: {formatCurrency(account?.unrealizedPnl || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Entry */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-emerald-500" />
              Place Order
            </CardTitle>
            <CardDescription>
              Execute paper trades to test your strategies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Select value={symbol} onValueChange={setSymbol}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select symbol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ES">ES (E-mini S&P 500)</SelectItem>
                    <SelectItem value="NQ">NQ (E-mini Nasdaq)</SelectItem>
                    <SelectItem value="CL">CL (Crude Oil)</SelectItem>
                    <SelectItem value="GC">GC (Gold)</SelectItem>
                    <SelectItem value="YM">YM (E-mini Dow)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Side</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={side === "BUY" ? "default" : "outline"}
                    className={
                      side === "BUY"
                        ? "bg-green-600 hover:bg-green-700 flex-1"
                        : "flex-1"
                    }
                    onClick={() => setSide("BUY")}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Buy
                  </Button>
                  <Button
                    type="button"
                    variant={side === "SELL" ? "default" : "outline"}
                    className={
                      side === "SELL"
                        ? "bg-red-600 hover:bg-red-700 flex-1"
                        : "flex-1"
                    }
                    onClick={() => setSide("SELL")}
                  >
                    <TrendingDown className="h-4 w-4 mr-2" />
                    Sell
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="orderType">Order Type</Label>
                <Select
                  value={orderType}
                  onValueChange={v =>
                    setOrderType(v as "MARKET" | "LIMIT" | "STOP")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select order type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MARKET">Market</SelectItem>
                    <SelectItem value="LIMIT">Limit</SelectItem>
                    <SelectItem value="STOP">Stop</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {orderType === "LIMIT" && (
                <div className="space-y-2">
                  <Label htmlFor="limitPrice">Limit Price ($)</Label>
                  <Input
                    id="limitPrice"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 5000.00"
                    value={limitPrice}
                    onChange={e => setLimitPrice(e.target.value)}
                  />
                </div>
              )}

              {orderType === "STOP" && (
                <div className="space-y-2">
                  <Label htmlFor="stopPrice">Stop Price ($)</Label>
                  <Input
                    id="stopPrice"
                    type="number"
                    step="0.01"
                    placeholder="e.g., 4950.00"
                    value={stopPrice}
                    onChange={e => setStopPrice(e.target.value)}
                  />
                </div>
              )}

              <Button
                type="submit"
                className={`w-full ${side === "BUY" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
                disabled={executeTrade.isPending}
              >
                {executeTrade.isPending
                  ? "Executing..."
                  : `${side} ${quantity} ${symbol}`}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Positions & History */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Positions & History</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="positions">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="positions">
                  Open Positions ({positions?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="history">Trade History</TabsTrigger>
              </TabsList>

              <TabsContent value="positions" className="mt-4">
                {positionsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading...
                  </div>
                ) : positions?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No open positions</p>
                    <p className="text-sm">Place a trade to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {positions?.map((position: any) => (
                      <div
                        key={position.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <Badge
                            variant={
                              position.side === "LONG"
                                ? "default"
                                : "destructive"
                            }
                          >
                            {position.side}
                          </Badge>
                          <div>
                            <p className="font-medium">{position.symbol}</p>
                            <p className="text-sm text-muted-foreground">
                              {position.quantity} contracts @{" "}
                              {formatCurrency(position.entryPrice)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-medium ${(position.unrealizedPnl || 0) >= 0 ? "text-green-500" : "text-red-500"}`}
                          >
                            {formatCurrency(position.unrealizedPnl || 0)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(position.entryDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                {historyLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading...
                  </div>
                ) : tradeHistory?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No trade history</p>
                    <p className="text-sm">
                      Your executed trades will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {tradeHistory?.map((trade: any) => (
                      <div
                        key={trade.id}
                        className="flex items-center justify-between p-3 border rounded-lg text-sm"
                      >
                        <div className="flex items-center gap-3">
                          {trade.side === "BUY" ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                          <div>
                            <p className="font-medium">
                              {trade.side} {trade.quantity} {trade.symbol}
                            </p>
                            <p className="text-muted-foreground">
                              @ {formatCurrency(trade.price)} •{" "}
                              {trade.orderType}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {(trade.pnl ?? 0) !== 0 && (
                            <p
                              className={`font-medium ${(trade.pnl ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`}
                            >
                              {formatCurrency(trade.pnl ?? 0)}
                            </p>
                          )}
                          <p className="text-muted-foreground">
                            {new Date(trade.executedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <Card className="bg-amber-500/10 border-amber-500/20">
        <CardContent className="flex items-start gap-4 pt-6">
          <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-500">Paper Trading Mode</h3>
            <p className="text-sm text-muted-foreground mt-1">
              This is a simulated trading environment. No real money is at risk.
              Use this to test your strategies before connecting a live broker.
              Market prices are simulated and may not reflect actual market
              conditions.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// IBKR SETUP FORM
// ============================================================================

function IBKRSetupForm() {
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [accountId, setAccountId] = useState("");
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const saveBrokerConnection = trpc.broker.connect.useMutation({
    onSuccess: () => {
      toast.success("IBKR connection saved successfully!");
      setConnectionStatus("success");
    },
    onError: error => {
      toast.error(error.message);
      setConnectionStatus("error");
      setErrorMessage(error.message);
    },
  });

  const testIBKRConnection = trpc.broker.testIBKRConnection.useMutation({
    onSuccess: result => {
      if (result.success) {
        toast.success(`Connected! Account: ${result.accountId || "Found"}`);
        setConnectionStatus("success");
      } else {
        toast.error(result.error || "Connection failed");
        setConnectionStatus("error");
        setErrorMessage(result.error || "Connection failed");
      }
    },
    onError: error => {
      toast.error(error.message);
      setConnectionStatus("error");
      setErrorMessage(error.message);
    },
  });

  const handleTestConnection = async () => {
    if (!gatewayUrl) {
      toast.error("Please enter your Gateway URL");
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus("idle");
    setErrorMessage("");

    try {
      // Test the connection via server-side
      toast.info("Testing connection to IBKR Gateway...");

      testIBKRConnection.mutate({
        gatewayUrl: gatewayUrl.replace(/\/$/, ""),
      });
    } catch (error) {
      setConnectionStatus("error");
      setErrorMessage(
        "Could not reach gateway. Make sure it's running and accessible."
      );
      toast.error("Connection test failed");
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveConnection = () => {
    if (!gatewayUrl) {
      toast.error("Please enter your Gateway URL");
      return;
    }

    saveBrokerConnection.mutate({
      broker: "ibkr",
      credentials: {
        username: gatewayUrl.replace(/\/$/, ""),
        accountId: accountId || undefined,
      },
      isDemo: false,
    });
  };

  return (
    <div className="space-y-4">
      {/* Gateway URL Input */}
      <div className="space-y-2">
        <Label htmlFor="gatewayUrl" className="flex items-center gap-2">
          Gateway URL
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Enter your ngrok or Cloudflare Tunnel URL that points to your
                  IBKR Client Portal Gateway (usually running on localhost:5000)
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Input
          id="gatewayUrl"
          placeholder="https://abc123.ngrok.io"
          value={gatewayUrl}
          onChange={e => setGatewayUrl(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Example: https://abc123.ngrok.io or https://ibkr.yourdomain.com
        </p>
      </div>

      {/* Account ID (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="accountId" className="flex items-center gap-2">
          Account ID (Optional)
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Your IBKR account ID. If not provided, we'll use the first
                  account found.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Input
          id="accountId"
          placeholder="U1234567"
          value={accountId}
          onChange={e => setAccountId(e.target.value)}
        />
      </div>

      {/* Connection Status */}
      {connectionStatus === "success" && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="text-green-500 text-sm">
            Connection saved successfully!
          </span>
        </div>
      )}

      {connectionStatus === "error" && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="text-red-500 text-sm">
            {errorMessage || "Connection failed"}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        <Button
          className="w-full"
          onClick={handleTestConnection}
          disabled={isTestingConnection || !gatewayUrl}
        >
          {isTestingConnection ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Testing Connection...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Save & Test Connection
            </>
          )}
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={() =>
            window.open(
              "https://www.interactivebrokers.com/en/trading/ib-api.php",
              "_blank"
            )
          }
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Download Client Portal Gateway
        </Button>
      </div>

      {/* Setup Help */}
      <Card className="bg-blue-500/10 border-blue-500/20">
        <CardContent className="pt-4">
          <h4 className="font-semibold text-blue-400 text-sm mb-2">
            Quick Setup Guide
          </h4>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Download and run IBKR Client Portal Gateway</li>
            <li>Log in to the gateway at https://localhost:5000</li>
            <li>
              Install ngrok:{" "}
              <code className="bg-muted px-1 rounded">brew install ngrok</code>
            </li>
            <li>
              Create tunnel:{" "}
              <code className="bg-muted px-1 rounded">ngrok http 5000</code>
            </li>
            <li>Copy the ngrok URL and paste it above</li>
          </ol>
          <Button
            variant="link"
            className="text-blue-400 p-0 h-auto mt-2 text-xs"
            onClick={() => window.open("https://ngrok.com/download", "_blank")}
          >
            Get ngrok (free) →
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// ALPACA SETUP FORM
// ============================================================================

function AlpacaSetupForm({ onBack }: { onBack: () => void }) {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [isPaperTrading, setIsPaperTrading] = useState(true);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const saveBrokerConnection = trpc.broker.connect.useMutation({
    onSuccess: () => {
      toast.success("Alpaca connection saved successfully!");
      setConnectionStatus("success");
    },
    onError: error => {
      toast.error(error.message);
      setConnectionStatus("error");
      setErrorMessage(error.message);
    },
  });

  const handleSaveConnection = async () => {
    if (!apiKey || !apiSecret) {
      toast.error("Please enter both API Key and Secret");
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus("idle");
    setErrorMessage("");

    try {
      // Save the connection
      saveBrokerConnection.mutate({
        broker: "alpaca",
        credentials: {
          apiKey: apiKey,
          apiSecret: apiSecret,
        },
        isDemo: isPaperTrading,
      });
    } catch (error) {
      setConnectionStatus("error");
      setErrorMessage("Failed to save connection");
      toast.error("Connection failed");
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🦙</span>
            <div>
              <CardTitle>Connect Alpaca</CardTitle>
              <CardDescription>
                Enter your Alpaca API credentials to enable trading
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Account Type Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div>
            <Label className="text-base font-medium">Account Type</Label>
            <p className="text-sm text-muted-foreground">
              {isPaperTrading
                ? "Paper trading (simulated, no real money)"
                : "Live trading (real money)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={
                isPaperTrading ? "text-muted-foreground" : "font-medium"
              }
            >
              Live
            </span>
            <Switch
              checked={isPaperTrading}
              onCheckedChange={setIsPaperTrading}
            />
            <span
              className={
                isPaperTrading ? "font-medium" : "text-muted-foreground"
              }
            >
              Paper
            </span>
          </div>
        </div>

        {/* API Key Input */}
        <div className="space-y-2">
          <Label htmlFor="alpacaApiKey" className="flex items-center gap-2">
            API Key ID
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Find this in your Alpaca dashboard under API Keys. Use paper
                    keys for testing.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input
            id="alpacaApiKey"
            placeholder="PKXXXXXXXXXXXXXXXX"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            className="font-mono"
          />
        </div>

        {/* API Secret Input */}
        <div className="space-y-2">
          <Label htmlFor="alpacaApiSecret" className="flex items-center gap-2">
            Secret Key
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Your secret key is only shown once when created. Generate a
                    new one if needed.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input
            id="alpacaApiSecret"
            type="password"
            placeholder="••••••••••••••••••••••••••••••••"
            value={apiSecret}
            onChange={e => setApiSecret(e.target.value)}
            className="font-mono"
          />
        </div>

        {/* Connection Status */}
        {connectionStatus === "success" && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-green-500 text-sm">
              Alpaca connection saved successfully! You can now use
              auto-execution.
            </span>
          </div>
        )}

        {connectionStatus === "error" && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="text-red-500 text-sm">
              {errorMessage ||
                "Connection failed. Please check your credentials."}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={handleSaveConnection}
            disabled={isTestingConnection || !apiKey || !apiSecret}
          >
            {isTestingConnection ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving Connection...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Save & Connect
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              window.open(
                "https://app.alpaca.markets/paper/dashboard/overview",
                "_blank"
              )
            }
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Alpaca Dashboard
          </Button>
        </div>

        {/* Help Section */}
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="pt-4">
            <h4 className="font-semibold text-blue-400 text-sm mb-2">
              How to Get Your API Keys
            </h4>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Log in to your Alpaca account</li>
              <li>Go to Paper Trading → API Keys (for testing)</li>
              <li>Click "Generate New Key"</li>
              <li>Copy both the Key ID and Secret Key</li>
              <li>Paste them above and click Save & Connect</li>
            </ol>
            <Button
              variant="link"
              className="text-blue-400 p-0 h-auto mt-2 text-xs"
              onClick={() =>
                window.open(
                  "https://alpaca.markets/docs/trading/getting_started/",
                  "_blank"
                )
              }
            >
              View Alpaca API Documentation →
            </Button>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// TRADOVATE SETUP FORM
// ============================================================================

function TradovateSetupForm({ onBack }: { onBack: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isDemo, setIsDemo] = useState(true);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const saveBrokerConnection = trpc.broker.connect.useMutation({
    onSuccess: () => {
      toast.success("Tradovate connection saved successfully!");
      setConnectionStatus("success");
    },
    onError: error => {
      toast.error(error.message);
      setConnectionStatus("error");
      setErrorMessage(error.message);
    },
  });

  const handleSaveConnection = async () => {
    if (!username || !password) {
      toast.error("Please enter both username and password");
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus("idle");
    setErrorMessage("");

    try {
      saveBrokerConnection.mutate({
        broker: "tradovate",
        credentials: {
          username: username,
          password: password,
        },
        isDemo: isDemo,
      });
    } catch (error) {
      setConnectionStatus("error");
      setErrorMessage("Failed to save connection");
      toast.error("Connection failed");
    } finally {
      setIsTestingConnection(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📈</span>
            <div>
              <CardTitle>Connect Tradovate</CardTitle>
              <CardDescription>
                Enter your Tradovate credentials to enable futures trading
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Account Type Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div>
            <Label className="text-base font-medium">Account Type</Label>
            <p className="text-sm text-muted-foreground">
              {isDemo
                ? "Demo account (simulated trading)"
                : "Live account (real money)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={isDemo ? "text-muted-foreground" : "font-medium"}>
              Live
            </span>
            <Switch checked={isDemo} onCheckedChange={setIsDemo} />
            <span className={isDemo ? "font-medium" : "text-muted-foreground"}>
              Demo
            </span>
          </div>
        </div>

        {/* Username Input */}
        <div className="space-y-2">
          <Label
            htmlFor="tradovateUsername"
            className="flex items-center gap-2"
          >
            Tradovate Username
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Your Tradovate account username (not email)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input
            id="tradovateUsername"
            placeholder="your_username"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </div>

        {/* Password Input */}
        <div className="space-y-2">
          <Label
            htmlFor="tradovatePassword"
            className="flex items-center gap-2"
          >
            Password
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Your Tradovate account password</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input
            id="tradovatePassword"
            type="password"
            placeholder="••••••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        {/* Connection Status */}
        {connectionStatus === "success" && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-green-500 text-sm">
              Tradovate connection saved successfully! You can now trade
              futures.
            </span>
          </div>
        )}

        {connectionStatus === "error" && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="text-red-500 text-sm">
              {errorMessage ||
                "Connection failed. Please check your credentials."}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={handleSaveConnection}
            disabled={isTestingConnection || !username || !password}
          >
            {isTestingConnection ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving Connection...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Save & Connect
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              window.open("https://trader.tradovate.com/", "_blank")
            }
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Tradovate Platform
          </Button>
        </div>

        {/* Help Section */}
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="pt-4">
            <h4 className="font-semibold text-blue-400 text-sm mb-2">
              Getting Started with Tradovate
            </h4>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Create a Tradovate account if you don't have one</li>
              <li>Start with a Demo account to practice</li>
              <li>Enter your username and password above</li>
              <li>Click Save & Connect to enable trading</li>
            </ol>
            <Button
              variant="link"
              className="text-blue-400 p-0 h-auto mt-2 text-xs"
              onClick={() =>
                window.open("https://www.tradovate.com/resources/", "_blank")
              }
            >
              View Tradovate Resources →
            </Button>
          </CardContent>
        </Card>

        {/* Warning for Live Trading */}
        {!isDemo && (
          <Card className="bg-amber-500/10 border-amber-500/20">
            <CardContent className="flex items-start gap-4 pt-4">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-amber-500 text-sm">
                  Live Trading Warning
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  You are connecting a live trading account. Real money will be
                  at risk. Make sure you understand the strategies before
                  enabling auto-execution.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
