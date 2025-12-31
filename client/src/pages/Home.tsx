import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  TrendingUp,
  Zap,
  BarChart3,
  ArrowRight,
  Target,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Calculator,
  Cpu,
  Webhook,
  AlertTriangle,
  Brain,
  Database,
  Play,
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useMemo, useEffect } from "react";
import { SEOHead, SEO_CONFIG } from "@/components/SEOHead";
import {
  trackCTAClick,
  initTimeTracking,
  trackScrollDepth,
} from "@/lib/analytics";
import { Star } from "lucide-react";

// FAQ data
const faqs = [
  {
    question: "What is STS Systematic Trading Strategies?",
    answer:
      "A professional analytics platform for tracking and analyzing algorithmic futures trading strategies. We provide real-time signals, comprehensive performance metrics, and risk management tools based on 14+ years of backtested data across ES, NQ, YM, CL, GC, and BTC futures.",
  },
  {
    question: "How do the trading signals work?",
    answer:
      "Our strategies generate signals via TradingView alerts that are delivered through secure webhooks. When a strategy identifies a trade opportunity, you receive instant notifications with entry price, direction, and position details.",
  },
  {
    question: "What markets do you cover?",
    answer:
      "We focus on futures markets including E-mini S&P 500 (ES), E-mini NASDAQ (NQ), E-mini Dow (YM), Crude Oil (CL), Gold (GC), and Bitcoin (BTC). Each strategy is specifically designed and backtested for its target market.",
  },
  {
    question: "How accurate is your backtesting data?",
    answer:
      "Our backtesting uses 15+ years of tick-level historical data with realistic slippage and commission assumptions. We don't curve-fit or cherry-pick results. All performance metrics are calculated using industry-standard formulas.",
  },
  {
    question: "Is past performance a guarantee of future results?",
    answer:
      "No. While our strategies have demonstrated strong historical performance with 130% total return and 1.50 Sharpe ratio over 14+ years, past performance is not indicative of future results. Trading involves substantial risk of loss.",
  },
  {
    question: "Can I try before subscribing?",
    answer:
      "Yes! We offer a free tier that lets you view public strategy performance, access limited historical data, and explore the platform. No credit card required to get started.",
  },
  {
    question: "What makes your strategies different?",
    answer:
      "Our strategies are built on rigorous backtesting with 15+ years of data, focus on risk-adjusted returns (not just raw profits), and provide full transparency with detailed performance metrics including Sharpe, Sortino, and Calmar ratios. Every trade is logged and verifiable.",
  },
  {
    question: "Do I get access to new strategies?",
    answer:
      "Yes! As a subscriber, you get access to all future strategies we deploy and release to the dashboard at no additional cost. We're constantly developing and testing new systematic strategies across different markets and timeframes.",
  },
];

// Pricing tiers - Single tier with monthly/yearly options
const pricingTiers = [
  {
    name: "Free",
    price: 0,
    period: "forever",
    description: "Explore the platform",
    features: [
      "View public strategy performance",
      "Limited historical data",
      "Basic analytics overview",
    ],
    cta: "Get Started",
    popular: false,
    priceId: null,
  },
  {
    name: "STS Pro Monthly",
    price: 50,
    period: "month",
    description: "Full access to everything",
    features: [
      "Full historical data (14+ years)",
      "Real-time TradingView signals",
      "All strategies included",
      "Kelly criterion position sizing calculator",
      "Advanced analytics & metrics",
      "Kelly criterion calculator",
      "Portfolio correlation tools",
      "Priority support",
      "Lock in your rate forever",
    ],
    cta: "Subscribe Monthly",
    popular: true,
    priceId: "price_1SjfvXLQsJRtPDrZBEMq9bWX",
  },
  {
    name: "STS Pro Yearly",
    price: 500,
    period: "year",
    monthlyEquivalent: 41.67,
    savings: 100,
    description: "Best value - Save $100/year",
    features: [
      "Everything in monthly plan",
      "Save $100 per year",
      "Only $41.67/month equivalent",
      "Lock in your rate forever",
      "Priority onboarding support",
    ],
    cta: "Subscribe Yearly",
    popular: false,
    priceId: "price_1SjfwvLQsJRtPDrZT0dxyReY",
  },
];

// Comparison data - What you get vs alternatives
const comparisonFeatures = [
  {
    feature: "Backtested strategies (14+ years)",
    sts: true,
    discretionary: false,
    diy: "Months of work",
  },
  {
    feature: "Real-time TradingView signals",
    sts: true,
    discretionary: false,
    diy: "Build yourself",
  },
  {
    feature: "Kelly criterion position sizing",
    sts: true,
    discretionary: false,
    diy: "Build yourself",
  },
  {
    feature: "Risk-adjusted metrics (Sharpe, Sortino)",
    sts: true,
    discretionary: false,
    diy: "Build yourself",
  },
  {
    feature: "Portfolio correlation analysis",
    sts: true,
    discretionary: false,
    diy: "Build yourself",
  },
  {
    feature: "Kelly criterion sizing",
    sts: true,
    discretionary: false,
    diy: "Build yourself",
  },
  {
    feature: "Emotion-free execution",
    sts: true,
    discretionary: false,
    diy: true,
  },
  {
    feature: "24/7 market monitoring",
    sts: true,
    discretionary: false,
    diy: true,
  },
  {
    feature: "Time investment",
    sts: "Minutes/day",
    discretionary: "Hours/day",
    diy: "Months to build",
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { data: stats, isLoading } = trpc.platform.stats.useQuery();

  // SEO: Set document title (52 chars - within 30-60 recommended range)
  useEffect(() => {
    document.title = "STS Futures | Systematic Trading Strategies Platform";
  }, []);

  // Analytics: Initialize time tracking and scroll depth tracking
  useEffect(() => {
    initTimeTracking();

    const trackedDepths = new Set<number>();
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const scrollPercent = Math.round((scrollTop / docHeight) * 100);

      [25, 50, 75, 100].forEach(depth => {
        if (scrollPercent >= depth && !trackedDepths.has(depth)) {
          trackedDepths.add(depth);
          trackScrollDepth(depth as 25 | 50 | 75 | 100);
        }
      });
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  // Strategies query available for future use
  trpc.subscription.availableStrategies.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [contractSize, setContractSize] = useState<"micro" | "mini">("micro");
  const [expandedScreenshot, setExpandedScreenshot] = useState<string | null>(
    null
  );

  // Calculate potential returns
  const potentialReturns = useMemo(() => {
    const annualReturn = stats?.annualizedReturn || 130;
    const microStarting = 5400; // Minimum for micros
    const miniStarting = 54000; // Minimum for minis

    const microAnnual = (microStarting * (annualReturn / 100)) / 10; // Micros are 1/10th
    const miniAnnual = miniStarting * (annualReturn / 100);

    return {
      microAnnual: Math.round(microAnnual),
      miniAnnual: Math.round(miniAnnual),
      microStarting,
      miniStarting,
    };
  }, [stats]);

  return (
    <>
      <SEOHead {...SEO_CONFIG.home} />
      <div className="min-h-screen bg-[#0a0a0f]">
        {/* Navigation Bar - Mobile Optimized */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/95 backdrop-blur-lg border-b border-gray-800/50 safe-area-top">
          <div className="container flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4">
            <Link href="/">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <span className="text-lg sm:text-xl font-semibold text-white">
                  STS
                </span>
                <span className="hidden sm:inline text-xs text-emerald-400 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  Futures
                </span>
              </div>
            </Link>
            <div className="hidden md:flex items-center gap-6 lg:gap-8">
              <a
                href="#what-you-get"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                What You Get
              </a>
              <a
                href="#compare"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Compare
              </a>
              <a
                href="#why-sts"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Why STS
              </a>
              <a
                href="#pricing"
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Pricing
              </a>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {isAuthenticated ? (
                <Link href="/overview">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500"
                  >
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <a href={getLoginUrl()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-300 hover:text-white"
                    >
                      Sign In
                    </Button>
                  </a>
                  <a href={getLoginUrl()}>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500"
                    >
                      Get Started
                    </Button>
                  </a>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Hero Section - Mobile Optimized */}
        <section className="relative min-h-[85vh] sm:min-h-[95vh] flex items-center justify-center overflow-hidden pt-14 sm:pt-16">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:60px_60px] sm:bg-[size:100px_100px]" />

          <div className="container relative z-10 py-6 sm:py-12 px-4">
            <div className="max-w-5xl mx-auto text-center">
              <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-white mb-4 sm:mb-6 tracking-tight leading-tight">
                <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                  Systematic Trading Strategies
                </span>
                <br />
                <span className="text-white">for Futures.</span>
              </h1>

              <p className="text-base sm:text-xl text-gray-400 mb-6 sm:mb-8 max-w-3xl mx-auto font-light leading-relaxed px-2">
                Get access to{" "}
                <span className="text-white font-medium">
                  8 backtested futures strategies
                </span>{" "}
                with 15+ years of data, real-time TradingView signals, and{" "}
                <span className="text-emerald-400 font-medium">
                  professional-grade analytics
                </span>
                .
              </p>

              {/* Key Stats - Mobile Optimized */}
              {!isLoading && stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 max-w-3xl mx-auto mb-6 sm:mb-10">
                  <div className="bg-gray-900/50 border border-gray-800 rounded-lg sm:rounded-xl p-3 sm:p-4">
                    <div className="text-xl sm:text-3xl font-bold text-emerald-400 mb-0.5 sm:mb-1">
                      +{stats.annualizedReturn.toFixed(1)}%
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-300 uppercase tracking-wider">
                      Avg Return/Year
                    </div>
                  </div>
                  <div className="bg-gray-900/50 border border-gray-800 rounded-lg sm:rounded-xl p-3 sm:p-4">
                    <div className="text-xl sm:text-3xl font-bold text-white mb-0.5 sm:mb-1">
                      {stats.sharpeRatio.toFixed(2)}
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-300 uppercase tracking-wider">
                      Sharpe Ratio
                    </div>
                  </div>
                  <div className="bg-gray-900/50 border border-gray-800 rounded-lg sm:rounded-xl p-3 sm:p-4">
                    <div className="text-xl sm:text-3xl font-bold text-white mb-0.5 sm:mb-1">
                      $
                      {contractSize === "micro"
                        ? potentialReturns.microAnnual.toLocaleString()
                        : potentialReturns.miniAnnual.toLocaleString()}
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-300 uppercase tracking-wider">
                      Avg Annual ({contractSize})
                    </div>
                  </div>
                  <div className="bg-gray-900/50 border border-gray-800 rounded-lg sm:rounded-xl p-3 sm:p-4">
                    <div className="text-xl sm:text-3xl font-bold text-white mb-0.5 sm:mb-1">
                      14+
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-300 uppercase tracking-wider">
                      Years Data
                    </div>
                  </div>
                </div>
              )}

              {/* Contract Size Toggle - Mobile Optimized */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-6 sm:mb-8">
                <span className="text-xs sm:text-sm text-gray-300">
                  Contract Size:
                </span>
                <div className="inline-flex bg-gray-900 rounded-lg p-1">
                  <button
                    onClick={() => setContractSize("micro")}
                    className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all min-h-[40px] ${
                      contractSize === "micro"
                        ? "bg-emerald-600 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Micro
                  </button>
                  <button
                    onClick={() => setContractSize("mini")}
                    className={`px-3 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all min-h-[40px] ${
                      contractSize === "mini"
                        ? "bg-emerald-600 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Mini
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 px-4 sm:px-0">
                {isAuthenticated ? (
                  <Link href="/overview">
                    <Button
                      size="lg"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 sm:px-10 py-5 sm:py-6 text-base sm:text-lg rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25 w-full sm:w-auto min-h-[52px]"
                      onClick={() => trackCTAClick("hero", "Go to Dashboard")}
                    >
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </Link>
                ) : (
                  <a
                    href={getLoginUrl()}
                    onClick={() => trackCTAClick("hero", "Start Free Trial")}
                  >
                    <Button
                      size="lg"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 sm:px-10 py-5 sm:py-6 text-base sm:text-lg rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25 w-full sm:w-auto min-h-[52px]"
                    >
                      Start Free Trial
                      <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                    </Button>
                  </a>
                )}
              </div>

              {/* Trust Badges - Mobile Optimized */}
              <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-gray-300 px-4 sm:px-0 mb-8">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>15+ years backtested data</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Access to all future strategies</span>
                </div>
              </div>

              {/* Social Proof - Testimonials */}
              <div className="mt-8 pt-8 border-t border-gray-800/50">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star
                        key={i}
                        className="w-5 h-5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                    <span className="ml-2 text-sm text-gray-400">
                      4.9/5 from traders
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl">
                    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 text-left">
                      <p className="text-gray-300 text-sm italic mb-3">
                        "Finally, a platform that shows real backtested data
                        without the hype. The Sharpe ratios and drawdown metrics
                        helped me size my positions properly."
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-medium">
                          M
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">
                            Mike T.
                          </p>
                          <p className="text-gray-500 text-xs">
                            Futures Trader, 5 years
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 text-left">
                      <p className="text-gray-300 text-sm italic mb-3">
                        "The TradingView integration is seamless. I get alerts
                        the moment a strategy triggers and can execute in
                        seconds."
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-medium">
                          S
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">
                            Sarah K.
                          </p>
                          <p className="text-gray-500 text-xs">
                            Day Trader, NQ & ES
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-4 text-left">
                      <p className="text-gray-300 text-sm italic mb-3">
                        "I spent months trying to build my own backtesting
                        system. STS gave me everything I needed in minutes.
                        Worth every penny."
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-sm font-medium">
                          J
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">
                            James R.
                          </p>
                          <p className="text-gray-500 text-xs">
                            Algorithmic Trader
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What You Get Section - Mobile Optimized */}
        <section
          id="what-you-get"
          className="py-12 sm:py-20 border-t border-gray-800/50"
        >
          <div className="container px-4">
            <div className="text-center mb-8 sm:mb-16">
              <h2 className="text-2xl sm:text-4xl font-light text-white mb-3 sm:mb-4">
                Everything You Need to{" "}
                <span className="font-bold text-emerald-400">
                  Trade Systematically
                </span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base px-2">
                Stop spending months building infrastructure. Get proven
                strategies, real-time signals, and auto-execution — all in one
                platform.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-16">
              {/* Feature Cards */}
              <Card className="bg-gray-900/50 border-gray-800 hover:border-emerald-500/50 transition-colors">
                <CardContent className="p-4 sm:p-6">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                    <Database className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    8 Backtested Strategies
                  </h3>
                  <p className="text-gray-400 text-sm">
                    ES, NQ, YM, CL, GC, and BTC futures strategies with 14+
                    years of historical data. Trend following and opening range
                    breakout systems.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800 hover:border-emerald-500/50 transition-colors">
                <CardContent className="p-4 sm:p-6">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                    <Webhook className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Real-Time TradingView Signals
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Instant webhook alerts when strategies trigger. Entry, exit,
                    and position sizing delivered in milliseconds.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800 hover:border-emerald-500/50 transition-colors">
                <CardContent className="p-4 sm:p-6">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Real-Time Alerts
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Get instant TradingView alerts when strategies signal. Never
                    miss a trade opportunity with webhook notifications.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800 hover:border-emerald-500/50 transition-colors">
                <CardContent className="p-4 sm:p-6">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
                    <BarChart3 className="w-6 h-6 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Professional Analytics
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Sharpe, Sortino, Calmar ratios. Drawdown analysis,
                    correlation matrices, and rolling performance metrics.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800 hover:border-emerald-500/50 transition-colors">
                <CardContent className="p-4 sm:p-6">
                  <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center mb-4">
                    <Calculator className="w-6 h-6 text-rose-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Kelly Criterion Sizing
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Optimal position sizing calculator based on your risk
                    tolerance and strategy performance. Maximize growth while
                    managing risk.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800 hover:border-emerald-500/50 transition-colors">
                <CardContent className="p-4 sm:p-6">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4">
                    <Target className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Portfolio Builder
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Combine strategies for diversification. See combined equity
                    curves, correlations, and risk metrics in real-time.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Dashboard Preview */}
            <div className="max-w-5xl mx-auto">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-light text-white mb-2">
                  See Your Dashboard
                </h3>
                <p className="text-gray-400">
                  Full transparency into every trade and metric
                </p>
              </div>
              <div className="relative rounded-2xl overflow-hidden border border-gray-800 shadow-2xl shadow-emerald-500/10">
                <img
                  src="/screenshots/overview-all-time.webp"
                  alt="STS Futures Trading Dashboard showing portfolio equity curve, performance metrics including Sharpe ratio, total return, and max drawdown for systematic futures strategies"
                  className="w-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 flex justify-center">
                  <a href={getLoginUrl()}>
                    <Button className="bg-emerald-600 hover:bg-emerald-500">
                      <Play className="w-4 h-4 mr-2" />
                      Try It Free
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Section - Mobile Optimized */}
        <section
          id="compare"
          className="py-12 sm:py-20 border-t border-gray-800/50 bg-gray-900/20"
        >
          <div className="container px-4">
            <div className="text-center mb-8 sm:mb-16">
              <h2 className="text-2xl sm:text-4xl font-light text-white mb-3 sm:mb-4">
                Why <span className="font-bold text-emerald-400">STS</span> vs.
                The Alternatives?
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base px-2">
                Compare systematic trading with STS against discretionary
                trading or building your own tech stack.
              </p>
            </div>

            <div className="max-w-4xl mx-auto overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[500px] sm:min-w-0">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-4 px-4 text-gray-400 font-medium">
                      Feature
                    </th>
                    <th className="text-center py-4 px-4">
                      <div className="inline-flex flex-col items-center">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-2">
                          <TrendingUp className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span className="text-emerald-400 font-semibold">
                          STS
                        </span>
                      </div>
                    </th>
                    <th className="text-center py-4 px-4">
                      <div className="inline-flex flex-col items-center">
                        <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center mb-2">
                          <Brain className="w-5 h-5 text-gray-400" />
                        </div>
                        <span className="text-gray-400 font-medium">
                          Discretionary
                        </span>
                      </div>
                    </th>
                    <th className="text-center py-4 px-4">
                      <div className="inline-flex flex-col items-center">
                        <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center mb-2">
                          <Cpu className="w-5 h-5 text-gray-400" />
                        </div>
                        <span className="text-gray-400 font-medium">
                          DIY Tech Stack
                        </span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((row, index) => (
                    <tr key={index} className="border-b border-gray-800/50">
                      <td className="py-4 px-4 text-gray-300 text-sm">
                        {row.feature}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {row.sts === true ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                        ) : typeof row.sts === "string" ? (
                          <span className="text-emerald-400 text-sm font-medium">
                            {row.sts}
                          </span>
                        ) : (
                          <X className="w-5 h-5 text-gray-400 mx-auto" />
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {row.discretionary === true ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                        ) : row.discretionary === false ? (
                          <X className="w-5 h-5 text-red-400 mx-auto" />
                        ) : (
                          <span className="text-gray-300 text-sm">
                            {row.discretionary}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {row.diy === true ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                        ) : row.diy === false ? (
                          <X className="w-5 h-5 text-red-400 mx-auto" />
                        ) : (
                          <span className="text-amber-400 text-sm">
                            {row.diy}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Key Differentiators */}
            <div className="grid md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto">
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 text-center">
                <div className="text-4xl font-bold text-emerald-400 mb-2">
                  0
                </div>
                <div className="text-gray-400 text-sm">
                  Emotions in execution
                </div>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 text-center">
                <div className="text-4xl font-bold text-emerald-400 mb-2">
                  24/7
                </div>
                <div className="text-gray-400 text-sm">Market monitoring</div>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 text-center">
                <div className="text-4xl font-bold text-emerald-400 mb-2">
                  14+
                </div>
                <div className="text-gray-400 text-sm">
                  Years of backtested data
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose STS Section */}
        <section id="why-sts" className="py-20 border-t border-gray-800/50">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-light text-white mb-4">
                Why Choose{" "}
                <span className="font-bold text-emerald-400">STS Platform</span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Everything you need to trade futures systematically, backed by
                15+ years of data.
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-2 gap-8">
                {/* DIY Approach */}
                <div className="bg-red-950/20 border border-red-900/30 rounded-2xl p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        Building It Yourself
                      </h3>
                      <p className="text-red-400 text-sm">The hard way</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-red-900/30">
                      <span className="text-gray-400">
                        Strategy Development
                      </span>
                      <span className="text-red-400 font-semibold">
                        6-12 months
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-red-900/30">
                      <span className="text-gray-400">Historical Data</span>
                      <span className="text-red-400 font-semibold">
                        $500-2000/yr
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-red-900/30">
                      <span className="text-gray-400">
                        Backtesting Platform
                      </span>
                      <span className="text-red-400 font-semibold">
                        $100-300/mo
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-white font-medium">
                        Total Investment
                      </span>
                      <span className="text-red-400 font-bold text-xl">
                        $5000+ & 1 year
                      </span>
                    </div>
                  </div>
                </div>

                {/* STS Platform */}
                <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        STS Platform
                      </h3>
                      <p className="text-emerald-400 text-sm">
                        Ready to trade today
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-emerald-900/30">
                      <span className="text-gray-400">8 Proven Strategies</span>
                      <span className="text-emerald-400 font-semibold">
                        Included
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-emerald-900/30">
                      <span className="text-gray-400">15+ Years Data</span>
                      <span className="text-emerald-400 font-semibold">
                        Included
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-emerald-900/30">
                      <span className="text-gray-400">
                        Professional Analytics
                      </span>
                      <span className="text-emerald-400 font-semibold">
                        Included
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-white font-medium">
                        Get Started
                      </span>
                      <span className="text-emerald-400 font-bold text-xl">
                        $50/month
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Value Highlight */}
              <div className="mt-8 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center">
                <div className="text-5xl font-bold text-emerald-400 mb-2">
                  15+ Years
                </div>
                <div className="text-gray-400 mb-4">
                  of backtested performance data at your fingertips
                </div>
                <p className="text-sm text-gray-300 max-w-xl mx-auto">
                  Skip the months of development and years of data collection.
                  Get instant access to proven strategies with transparent,
                  verifiable track records.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard Screenshots Section */}
        <section className="py-20 border-t border-gray-800/50 bg-gray-900/20">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-light text-white mb-4">
                See{" "}
                <span className="font-bold text-emerald-400">
                  Inside the Platform
                </span>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Full transparency. Every metric, every trade, every correlation
                — visible before you subscribe.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[
                {
                  src: "/screenshots/strategies-page.webp",
                  alt: "Futures trading strategy performance comparison showing ES, NQ, CL, GC, and BTC strategies with equity curves and key metrics",
                  title: "Strategy Performance",
                  description:
                    "Compare all 8 strategies side by side with detailed metrics",
                },
                {
                  src: "/screenshots/compare-page.webp",
                  alt: "Portfolio builder tool comparing ES and NQ futures trading strategies with combined equity curves over 15 years",
                  title: "Portfolio Builder",
                  description:
                    "Combine strategies and see combined equity curves",
                },
                {
                  src: "/screenshots/my-dashboard.webp",
                  alt: "Personal futures trading dashboard showing customized portfolio performance with 15+ years of data",
                  title: "Personal Dashboard",
                  description:
                    "Select your strategies and track your personal portfolio",
                },
              ].map((screenshot, index) => (
                <div
                  key={index}
                  className="group rounded-2xl overflow-hidden border border-gray-800 cursor-pointer transition-all hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10"
                  onClick={() => setExpandedScreenshot(screenshot.src)}
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={screenshot.src}
                      alt={screenshot.alt}
                      className="w-full transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Click to expand
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-900 p-4 h-[88px] flex flex-col justify-center">
                    <h4 className="text-white font-medium mb-1 text-base">
                      {screenshot.title}
                    </h4>
                    <p className="text-gray-400 text-sm line-clamp-2">
                      {screenshot.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Expanded Screenshot Modal */}
            {expandedScreenshot && (
              <div
                className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
                onClick={() => setExpandedScreenshot(null)}
              >
                <div className="relative max-w-7xl max-h-[90vh] overflow-auto">
                  <img
                    src={expandedScreenshot}
                    alt="Expanded screenshot"
                    className="w-full h-auto rounded-lg"
                  />
                  <button
                    className="absolute top-4 right-4 bg-gray-900/80 text-white p-2 rounded-full hover:bg-gray-800 transition-colors"
                    onClick={e => {
                      e.stopPropagation();
                      setExpandedScreenshot(null);
                    }}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 border-t border-gray-800/50">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-light text-white mb-4">
                Simple,{" "}
                <span className="font-bold text-emerald-400">
                  Transparent Pricing
                </span>
              </h2>
              <p className="text-gray-400 max-w-xl mx-auto">
                Start free, upgrade when you're ready. All strategies and
                analytics included in paid plans.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {pricingTiers.map((tier, index) => (
                <Card
                  key={index}
                  className={`relative bg-gray-900/50 border-gray-800 ${
                    tier.popular
                      ? "border-emerald-500 ring-1 ring-emerald-500/20"
                      : ""
                  }`}
                >
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-xl text-white">
                      {tier.name}
                    </CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-white">
                        ${tier.price}
                      </span>
                      {tier.price > 0 && (
                        <span className="text-gray-400">/{tier.period}</span>
                      )}
                    </div>
                    {tier.monthlyEquivalent && (
                      <p className="text-sm text-emerald-400 mt-1">
                        Only ${tier.monthlyEquivalent.toFixed(2)}/mo equivalent
                      </p>
                    )}
                    {tier.savings && (
                      <span className="inline-block mt-2 bg-emerald-500/20 text-emerald-400 text-xs font-semibold px-2 py-1 rounded-full">
                        Save ${tier.savings}/year
                      </span>
                    )}
                    <p className="text-sm text-gray-400 mt-2">
                      {tier.description}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {tier.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-300 text-sm">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {isAuthenticated ? (
                      tier.priceId ? (
                        <Link
                          href={`/checkout?priceId=${tier.priceId}&interval=${tier.period === "year" ? "yearly" : "monthly"}`}
                        >
                          <Button
                            className={`w-full ${
                              tier.popular
                                ? "bg-emerald-600 hover:bg-emerald-500"
                                : "bg-gray-700 hover:bg-gray-600"
                            }`}
                          >
                            {tier.cta}
                          </Button>
                        </Link>
                      ) : (
                        <Link href="/my-dashboard">
                          <Button
                            className={`w-full ${
                              tier.popular
                                ? "bg-emerald-600 hover:bg-emerald-500"
                                : "bg-gray-700 hover:bg-gray-600"
                            }`}
                          >
                            {tier.cta}
                          </Button>
                        </Link>
                      )
                    ) : (
                      <a href={getLoginUrl()}>
                        <Button
                          className={`w-full ${
                            tier.popular
                              ? "bg-emerald-600 hover:bg-emerald-500"
                              : "bg-gray-700 hover:bg-gray-600"
                          }`}
                        >
                          {tier.cta}
                        </Button>
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <p className="text-center text-sm text-gray-300 mt-8">
              All prices in USD. Enterprise plans available for institutions.{" "}
              <a
                href="mailto:support@ststrading.com"
                className="text-emerald-400 hover:underline"
              >
                Contact us
              </a>{" "}
              for custom solutions.
            </p>
          </div>
        </section>

        {/* Coming Soon - Brokerage Auto-Execution */}
        <section className="py-16 border-t border-gray-800/50 bg-gradient-to-b from-amber-950/10 to-transparent">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-2 mb-6">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 text-sm font-medium">
                  Coming Soon
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-light text-white mb-4">
                Automated{" "}
                <span className="font-bold text-amber-400">
                  Trade Execution
                </span>
              </h2>
              <p className="text-gray-400 mb-6">
                We're building direct brokerage integrations to automatically
                execute trades from your strategies. Connect your Tradovate,
                Interactive Brokers, or TradeStation account and let the system
                handle execution while you focus on what matters.
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400/60" />
                  Paper trading available now
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400/60" />
                  Live execution Q1 2025
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400/60" />
                  Free for Pro subscribers
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-20 border-t border-gray-800/50">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-light text-white mb-4">
                Frequently Asked{" "}
                <span className="font-semibold">Questions</span>
              </h2>
              <p className="text-gray-400 max-w-xl mx-auto">
                Everything you need to know about the platform
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-4">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-gray-800/50 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="w-full flex items-center justify-between p-6 text-left bg-gray-900/30 hover:bg-gray-900/50 transition-colors"
                  >
                    <span className="text-white font-medium pr-4">
                      {faq.question}
                    </span>
                    {openFaq === index ? (
                      <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                  {openFaq === index && (
                    <div className="p-6 pt-0 bg-gray-900/30">
                      <p className="text-gray-400 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 border-t border-gray-800/50">
          <div className="container">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl font-light text-white mb-6">
                Ready to{" "}
                <span className="font-semibold text-emerald-400">
                  Trade Systematically?
                </span>
              </h2>
              <p className="text-gray-400 mb-10">
                Join traders who use data-driven strategies instead of gut
                feelings
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {isAuthenticated ? (
                  <Link href="/overview">
                    <Button
                      size="lg"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-6 text-lg rounded-full"
                    >
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                ) : (
                  <a href={getLoginUrl()}>
                    <Button
                      size="lg"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-6 text-lg rounded-full"
                    >
                      Start Free Trial
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </a>
                )}
              </div>

              <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>15+ years backtested data</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Access to all future strategies</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-gray-800/50">
          <div className="container">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white font-semibold">STS</span>
                </div>
                <p className="text-gray-300 text-sm">
                  Systematic Trading Strategies for futures traders.
                  Professional analytics, real-time signals, and auto-execution.
                </p>
              </div>
              <div>
                <h4 className="text-gray-300 font-medium mb-4">Product</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a
                      href="#what-you-get"
                      className="text-gray-300 hover:text-white transition-colors"
                    >
                      What You Get
                    </a>
                  </li>
                  <li>
                    <a
                      href="#compare"
                      className="text-gray-300 hover:text-white transition-colors"
                    >
                      Compare
                    </a>
                  </li>
                  <li>
                    <a
                      href="#why-sts"
                      className="text-gray-300 hover:text-white transition-colors"
                    >
                      Why STS
                    </a>
                  </li>
                  <li>
                    <a
                      href="#pricing"
                      className="text-gray-300 hover:text-white transition-colors"
                    >
                      Pricing
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-gray-300 font-medium mb-4">Resources</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/overview">
                      <span className="text-gray-300 hover:text-white transition-colors cursor-pointer">
                        Dashboard
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link href="/strategies">
                      <span className="text-gray-300 hover:text-white transition-colors cursor-pointer">
                        All Strategies
                      </span>
                    </Link>
                  </li>
                  <li>
                    <Link href="/compare">
                      <span className="text-gray-300 hover:text-white transition-colors cursor-pointer">
                        Compare
                      </span>
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-gray-300 font-medium mb-4">Legal</h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <span className="text-gray-300">Terms of Service</span>
                  </li>
                  <li>
                    <span className="text-gray-300">Privacy Policy</span>
                  </li>
                  <li>
                    <span className="text-gray-300">Risk Disclosure</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-gray-800/50 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-gray-300 text-sm">
                © {new Date().getFullYear()} STS Systematic Trading Strategies.
                All rights reserved.
              </div>
              <div className="text-gray-400 text-xs max-w-xl text-center md:text-right">
                Trading involves substantial risk of loss and is not suitable
                for all investors. Past performance is not indicative of future
                results. This platform is for informational purposes only and
                does not constitute financial advice.
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
