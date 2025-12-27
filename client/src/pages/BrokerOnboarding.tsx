import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { useLocation } from "wouter";

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
  status: "available" | "coming_soon" | "paper_only";
}

const brokerOptions: BrokerOption[] = [
  {
    id: "paper",
    name: "Paper Trading",
    logo: "📝",
    description:
      "Practice with $100,000 virtual capital. No account needed, start trading immediately.",
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
  },
  {
    id: "alpaca",
    name: "Alpaca",
    logo: "🦙",
    description:
      "Commission-free trading with modern REST API. Great for stocks and ETFs.",
    features: [
      "Commission-free trading",
      "Modern REST + WebSocket API",
      "Paper trading mode included",
      "OAuth authentication",
      "Real-time market data",
    ],
    requirements: [
      "Create free Alpaca account",
      "Generate API key and secret",
      "No minimum deposit for paper trading",
    ],
    setupTime: "5-10 minutes",
    minDeposit: "$0 (paper) / $0 (live)",
    apiCost: "Free",
    recommended: false,
    status: "available",
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
      "Apply for API access ($25/month)",
      "Wait for approval (1-3 days)",
    ],
    setupTime: "3-5 days",
    minDeposit: "$1,000",
    apiCost: "$25/month",
    recommended: false,
    status: "available",
  },
  {
    id: "ibkr",
    name: "Interactive Brokers",
    logo: "🏦",
    description: "Industry-leading broker with comprehensive API access.",
    features: [
      "Full futures support",
      "Lowest commissions",
      "Global market access",
      "Professional-grade API",
    ],
    requirements: [
      "Create IBKR account",
      "Complete identity verification",
      "Fund account ($2,000 minimum)",
      "Third-party app approval (8-14 weeks)",
    ],
    setupTime: "8-14 weeks",
    minDeposit: "$2,000",
    apiCost: "Free",
    recommended: false,
    status: "coming_soon",
  },
];

const setupSteps = {
  paper: [
    {
      step: 1,
      title: "Sign In",
      description: "Log in to your STS Futures dashboard",
      completed: true,
    },
    {
      step: 2,
      title: "Navigate",
      description: "Go to Paper Trading from the sidebar",
      completed: false,
    },
    {
      step: 3,
      title: "Start Trading",
      description: "Place your first paper trade!",
      completed: false,
    },
  ],
  alpaca: [
    {
      step: 1,
      title: "Create Account",
      description: "Sign up at alpaca.markets (free)",
      completed: false,
    },
    {
      step: 2,
      title: "Generate API Keys",
      description: "Go to API Keys section and create new keys",
      completed: false,
    },
    {
      step: 3,
      title: "Connect to STS",
      description: "Enter your API key and secret in Broker Settings",
      completed: false,
    },
    {
      step: 4,
      title: "Test Connection",
      description: "Verify connection with a paper trade",
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
      description: "Apply for API access ($25/month)",
      completed: false,
    },
    {
      step: 4,
      title: "Wait for Approval",
      description: "Typically 1-3 business days",
      completed: false,
    },
    {
      step: 5,
      title: "Connect to STS",
      description: "Enter credentials in Broker Settings",
      completed: false,
    },
  ],
  ibkr: [
    {
      step: 1,
      title: "Create Account",
      description: "Sign up at interactivebrokers.com",
      completed: false,
    },
    {
      step: 2,
      title: "Complete Verification",
      description: "Identity verification and risk assessment",
      completed: false,
    },
    {
      step: 3,
      title: "Fund Account",
      description: "Deposit minimum $2,000",
      completed: false,
    },
    {
      step: 4,
      title: "Third-Party Approval",
      description: "Wait for OAuth app approval (8-14 weeks)",
      completed: false,
    },
    {
      step: 5,
      title: "Connect to STS",
      description: "Complete OAuth flow in Broker Settings",
      completed: false,
    },
  ],
};

export default function BrokerOnboarding() {
  const [selectedBroker, setSelectedBroker] = useState<string>("paper");
  const [, setLocation] = useLocation();

  const selectedBrokerData = brokerOptions.find(b => b.id === selectedBroker);
  const steps = setupSteps[selectedBroker as keyof typeof setupSteps] || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Connect Your Broker</h1>
          <p className="text-muted-foreground mt-1">
            Choose how you want to execute trades - start with paper trading or
            connect a live broker
          </p>
        </div>

        {/* Broker Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <div className="flex gap-2">
                    {broker.recommended && (
                      <Badge variant="default" className="bg-green-600">
                        <Star className="h-3 w-3 mr-1" />
                        Recommended
                      </Badge>
                    )}
                    {broker.status === "coming_soon" && (
                      <Badge variant="secondary">Coming Soon</Badge>
                    )}
                  </div>
                </div>
                <CardTitle className="text-lg">{broker.name}</CardTitle>
                <CardDescription className="text-xs">
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
                    <TabsTrigger value="features">Features</TabsTrigger>
                    <TabsTrigger value="requirements">Requirements</TabsTrigger>
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
                  <h4 className="font-medium mb-2">Cost Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Setup Time</p>
                      <p className="font-medium">
                        {selectedBrokerData.setupTime}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Min Deposit</p>
                      <p className="font-medium">
                        {selectedBrokerData.minDeposit}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">API Cost</p>
                      <p className="font-medium">
                        {selectedBrokerData.apiCost}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Setup Steps */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Setup Steps
                </CardTitle>
                <CardDescription>
                  Follow these steps to get started
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          step.completed
                            ? "bg-green-500 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {step.completed ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          step.step
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{step.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                <div className="mt-6">
                  {selectedBroker === "paper" ? (
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => setLocation("/paper-trading")}
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
                        onClick={() => setLocation("/admin?tab=broker")}
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />I Have an Account
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
                        onClick={() => setLocation("/admin?tab=broker")}
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />I Have an Account
                      </Button>
                    </div>
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

        {/* Info Banner */}
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="flex items-start gap-4 pt-6">
            <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-500">
                Start with Paper Trading
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                We strongly recommend testing your strategies with paper trading
                before connecting a live broker. This lets you validate your
                setup and understand how the system works without risking real
                capital. Once you're confident, you can connect a live broker to
                execute real trades.
              </p>
            </div>
          </CardContent>
        </Card>

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
                time from your broker's settings. All trades are executed
                directly through your broker's API - we never hold your funds.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
