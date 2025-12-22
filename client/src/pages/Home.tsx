import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  TrendingUp, 
  Shield, 
  Zap, 
  BarChart3, 
  ArrowRight,
  LineChart,
  Target,
  CheckCircle2,
  Activity,
  Award,
  Clock,
  ChevronDown,
  ChevronUp,
  Mail,
  Users,
  Star,
  Check,
  X,
  DollarSign,
  Calculator,
  Cpu,
  Webhook,
  AlertTriangle,
  Sparkles,
  Timer,
  Brain,
  Database,
  Lock,
  Play
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";

// FAQ data
const faqs = [
  {
    question: "What is STS Systematic Trading Strategies?",
    answer: "A professional analytics platform for tracking and analyzing algorithmic futures trading strategies. We provide real-time signals, comprehensive performance metrics, and risk management tools based on 14+ years of backtested data across ES, NQ, YM, CL, GC, and BTC futures."
  },
  {
    question: "How do the trading signals work?",
    answer: "Our strategies generate signals via TradingView alerts that are delivered through secure webhooks. When a strategy identifies a trade opportunity, you receive instant notifications with entry price, direction, and position details. Signals can be auto-executed through our brokerage connector to Tradovate or Interactive Brokers."
  },
  {
    question: "What markets do you cover?",
    answer: "We focus on futures markets including E-mini S&P 500 (ES), E-mini NASDAQ (NQ), E-mini Dow (YM), Crude Oil (CL), Gold (GC), and Bitcoin (BTC). Each strategy is specifically designed and backtested for its target market."
  },
  {
    question: "How much can I save with your brokerage connector?",
    answer: "Our built-in TradingView to Tradovate/IBKR connector saves you $30-50/month compared to third-party services like TradersPost or Alpaca. That's $360-600/year in savings while getting better execution and full transparency."
  },
  {
    question: "Is past performance a guarantee of future results?",
    answer: "No. While our strategies have demonstrated strong historical performance with 130% total return and 1.50 Sharpe ratio over 14+ years, past performance is not indicative of future results. Trading involves substantial risk of loss."
  },
  {
    question: "Can I try before subscribing?",
    answer: "Yes! We offer a free tier that lets you view public strategy performance, access limited historical data, and explore the platform. No credit card required to get started."
  },
  {
    question: "What makes your strategies different?",
    answer: "Our strategies are built on rigorous backtesting with 14+ years of data, focus on risk-adjusted returns (not just raw profits), and provide full transparency with detailed performance metrics including Sharpe, Sortino, and Calmar ratios. Plus, we include the brokerage connector at no extra cost."
  },
  {
    question: "Do you offer refunds?",
    answer: "We offer a 14-day money-back guarantee on all paid plans. If you're not satisfied with the platform, contact us within 14 days of your subscription for a full refund."
  }
];

// Pricing tiers
const pricingTiers = [
  {
    name: "Free",
    price: 0,
    period: "forever",
    description: "Perfect for exploring the platform",
    features: [
      "View public strategy performance",
      "1 year historical data",
      "Basic analytics dashboard",
      "Community access"
    ],
    cta: "Get Started",
    popular: false
  },
  {
    name: "Pro",
    price: 49,
    period: "month",
    annualPrice: 39,
    description: "For active traders",
    features: [
      "Full historical data (14+ years)",
      "Real-time TradingView signals",
      "Subscribe to 3 strategies",
      "Brokerage connector included",
      "Email & SMS alerts",
      "Advanced analytics",
      "Kelly criterion calculator",
      "Priority support"
    ],
    cta: "Start Pro Trial",
    popular: true
  },
  {
    name: "Premium",
    price: 99,
    period: "month",
    annualPrice: 79,
    description: "For professional traders",
    features: [
      "Everything in Pro",
      "Unlimited strategy subscriptions",
      "Priority signal delivery",
      "Correlation analysis tools",
      "Custom portfolio builder",
      "Export capabilities (CSV/Excel)",
      "Dedicated support",
      "Early access to new features"
    ],
    cta: "Start Premium Trial",
    popular: false
  }
];

// Comparison data - What you get vs alternatives
const comparisonFeatures = [
  { feature: "Backtested strategies (14+ years)", sts: true, discretionary: false, diy: "Months of work" },
  { feature: "Real-time TradingView signals", sts: true, discretionary: false, diy: "Build yourself" },
  { feature: "Brokerage auto-execution", sts: true, discretionary: false, diy: "$30-50/mo extra" },
  { feature: "Risk-adjusted metrics (Sharpe, Sortino)", sts: true, discretionary: false, diy: "Build yourself" },
  { feature: "Portfolio correlation analysis", sts: true, discretionary: false, diy: "Build yourself" },
  { feature: "Kelly criterion sizing", sts: true, discretionary: false, diy: "Build yourself" },
  { feature: "Emotion-free execution", sts: true, discretionary: false, diy: true },
  { feature: "24/7 market monitoring", sts: true, discretionary: false, diy: true },
  { feature: "Time investment", sts: "Minutes/day", discretionary: "Hours/day", diy: "Months to build" },
];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { data: stats, isLoading } = trpc.platform.stats.useQuery();
  const { data: strategies } = trpc.subscription.availableStrategies.useQuery(undefined, { enabled: isAuthenticated });
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [contractSize, setContractSize] = useState<'micro' | 'mini'>('micro');

  // Calculate savings
  const savingsData = useMemo(() => {
    const thirdPartyMonthly = 40; // Average cost of TradersPost, Alpaca, etc.
    const ourCost = 0; // Included in subscription
    const monthlySavings = thirdPartyMonthly - ourCost;
    const yearlySavings = monthlySavings * 12;
    return { monthlySavings, yearlySavings, thirdPartyMonthly };
  }, []);

  // Calculate potential returns
  const potentialReturns = useMemo(() => {
    const annualReturn = stats?.annualizedReturn || 130;
    const microStarting = 5400; // Minimum for micros
    const miniStarting = 54000; // Minimum for minis
    
    const microAnnual = microStarting * (annualReturn / 100) / 10; // Micros are 1/10th
    const miniAnnual = miniStarting * (annualReturn / 100);
    
    return {
      microAnnual: Math.round(microAnnual),
      miniAnnual: Math.round(miniAnnual),
      microStarting,
      miniStarting
    };
  }, [stats]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setEmailSubmitted(true);
      setEmail("");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-lg border-b border-gray-800/50">
        <div className="container flex items-center justify-between h-16">
          <Link href="/">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-white">STS</span>
              <span className="hidden sm:inline text-xs text-emerald-400 border border-emerald-400/30 px-2 py-0.5 rounded-full">Futures</span>
            </div>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#what-you-get" className="text-sm text-gray-400 hover:text-white transition-colors">What You Get</a>
            <a href="#compare" className="text-sm text-gray-400 hover:text-white transition-colors">Compare</a>
            <a href="#savings" className="text-sm text-gray-400 hover:text-white transition-colors">Savings</a>
            <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link href="/overview">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <a href={getLoginUrl()}>
                  <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                    Sign In
                  </Button>
                </a>
                <a href={getLoginUrl()}>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500">
                    Get Started
                  </Button>
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[95vh] flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:100px_100px]" />
        
        <div className="container relative z-10 py-12">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight leading-tight">
              <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">Systematic Trading Strategies</span><br />
              <span className="text-white">for Futures.</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-gray-400 mb-8 max-w-3xl mx-auto font-light leading-relaxed">
              Get access to <span className="text-white font-medium">8 backtested futures strategies</span> with 14+ years of data, 
              real-time TradingView signals, and <span className="text-emerald-400 font-medium">built-in brokerage execution</span> — 
              all for less than what you'd pay for the connector alone.
            </p>
            
            {/* Key Stats */}
            {!isLoading && stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-10">
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                  <div className="text-2xl sm:text-3xl font-bold text-emerald-400 mb-1">
                    +{stats.annualizedReturn.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Avg Return/Year</div>
                </div>
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                  <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                    {stats.sharpeRatio.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Sharpe Ratio</div>
                </div>
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                  <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                    ${contractSize === 'micro' ? potentialReturns.microAnnual.toLocaleString() : potentialReturns.miniAnnual.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Avg Annual ({contractSize})</div>
                </div>
                <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                  <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                    14+
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Years Data</div>
                </div>
              </div>
            )}

            {/* Contract Size Toggle */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <span className="text-sm text-gray-500">Contract Size:</span>
              <div className="inline-flex bg-gray-900 rounded-lg p-1">
                <button
                  onClick={() => setContractSize('micro')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    contractSize === 'micro' 
                      ? 'bg-emerald-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Micro ($5.4K min)
                </button>
                <button
                  onClick={() => setContractSize('mini')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    contractSize === 'mini' 
                      ? 'bg-emerald-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Mini ($54K min)
                </button>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              {isAuthenticated ? (
                <Link href="/overview">
                  <Button size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-6 text-lg rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <a href={getLoginUrl()}>
                  <Button size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-6 text-lg rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/25">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
              )}

            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Brokerage connector included</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>14-day money-back guarantee</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What You Get Section */}
      <section id="what-you-get" className="py-20 border-t border-gray-800/50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-light text-white mb-4">
              Everything You Need to <span className="font-bold text-emerald-400">Trade Systematically</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Stop spending months building infrastructure. Get proven strategies, real-time signals, and auto-execution — all in one platform.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {/* Feature Cards */}
            <Card className="bg-gray-900/50 border-gray-800 hover:border-emerald-500/50 transition-colors">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                  <Database className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">8 Backtested Strategies</h3>
                <p className="text-gray-400 text-sm">
                  ES, NQ, YM, CL, GC, and BTC futures strategies with 14+ years of historical data. Trend following and opening range breakout systems.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800 hover:border-emerald-500/50 transition-colors">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                  <Webhook className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Real-Time TradingView Signals</h3>
                <p className="text-gray-400 text-sm">
                  Instant webhook alerts when strategies trigger. Entry, exit, and position sizing delivered in milliseconds.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800 hover:border-emerald-500/50 transition-colors">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Brokerage Auto-Execution</h3>
                <p className="text-gray-400 text-sm">
                  Built-in connector to Tradovate and Interactive Brokers. Execute trades automatically — no third-party service needed.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800 hover:border-emerald-500/50 transition-colors">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Professional Analytics</h3>
                <p className="text-gray-400 text-sm">
                  Sharpe, Sortino, Calmar ratios. Drawdown analysis, correlation matrices, and rolling performance metrics.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800 hover:border-emerald-500/50 transition-colors">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center mb-4">
                  <Calculator className="w-6 h-6 text-rose-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Kelly Criterion Sizing</h3>
                <p className="text-gray-400 text-sm">
                  Optimal position sizing calculator based on your risk tolerance and strategy performance. Maximize growth while managing risk.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-900/50 border-gray-800 hover:border-emerald-500/50 transition-colors">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Portfolio Builder</h3>
                <p className="text-gray-400 text-sm">
                  Combine strategies for diversification. See combined equity curves, correlations, and risk metrics in real-time.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Dashboard Preview */}
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-light text-white mb-2">See Your Dashboard</h3>
              <p className="text-gray-400">Full transparency into every trade and metric</p>
            </div>
            <div className="relative rounded-2xl overflow-hidden border border-gray-800 shadow-2xl shadow-emerald-500/10">
              <img 
                src="/screenshots/overview-all-time.webp" 
                alt="STS Dashboard Overview" 
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

      {/* Comparison Section */}
      <section id="compare" className="py-20 border-t border-gray-800/50 bg-gray-900/20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-light text-white mb-4">
              Why <span className="font-bold text-emerald-400">STS</span> vs. The Alternatives?
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Compare systematic trading with STS against discretionary trading or building your own tech stack.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-4 px-4 text-gray-400 font-medium">Feature</th>
                  <th className="text-center py-4 px-4">
                    <div className="inline-flex flex-col items-center">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-2">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                      </div>
                      <span className="text-emerald-400 font-semibold">STS</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-4">
                    <div className="inline-flex flex-col items-center">
                      <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center mb-2">
                        <Brain className="w-5 h-5 text-gray-400" />
                      </div>
                      <span className="text-gray-400 font-medium">Discretionary</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-4">
                    <div className="inline-flex flex-col items-center">
                      <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center mb-2">
                        <Cpu className="w-5 h-5 text-gray-400" />
                      </div>
                      <span className="text-gray-400 font-medium">DIY Tech Stack</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonFeatures.map((row, index) => (
                  <tr key={index} className="border-b border-gray-800/50">
                    <td className="py-4 px-4 text-gray-300 text-sm">{row.feature}</td>
                    <td className="py-4 px-4 text-center">
                      {row.sts === true ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                      ) : typeof row.sts === 'string' ? (
                        <span className="text-emerald-400 text-sm font-medium">{row.sts}</span>
                      ) : (
                        <X className="w-5 h-5 text-gray-600 mx-auto" />
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {row.discretionary === true ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                      ) : row.discretionary === false ? (
                        <X className="w-5 h-5 text-red-400 mx-auto" />
                      ) : (
                        <span className="text-gray-500 text-sm">{row.discretionary}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {row.diy === true ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto" />
                      ) : row.diy === false ? (
                        <X className="w-5 h-5 text-red-400 mx-auto" />
                      ) : (
                        <span className="text-amber-400 text-sm">{row.diy}</span>
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
              <div className="text-4xl font-bold text-emerald-400 mb-2">0</div>
              <div className="text-gray-400 text-sm">Emotions in execution</div>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 text-center">
              <div className="text-4xl font-bold text-emerald-400 mb-2">24/7</div>
              <div className="text-gray-400 text-sm">Market monitoring</div>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 text-center">
              <div className="text-4xl font-bold text-emerald-400 mb-2">14+</div>
              <div className="text-gray-400 text-sm">Years of backtested data</div>
            </div>
          </div>
        </div>
      </section>

      {/* Cost Savings Section */}
      <section id="savings" className="py-20 border-t border-gray-800/50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-light text-white mb-4">
              Save <span className="font-bold text-emerald-400">${savingsData.yearlySavings}/Year</span> on Brokerage Connectors
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Third-party services like TradersPost, Alpaca, or custom solutions charge $30-50/month just for the connector. 
              We include it free with your subscription.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Third Party Cost */}
              <div className="bg-red-950/20 border border-red-900/30 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Third-Party Services</h3>
                    <p className="text-red-400 text-sm">Extra cost on top of signals</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-red-900/30">
                    <span className="text-gray-400">TradersPost</span>
                    <span className="text-red-400 font-semibold">$49/mo</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-red-900/30">
                    <span className="text-gray-400">Alpaca API</span>
                    <span className="text-red-400 font-semibold">$30/mo</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-red-900/30">
                    <span className="text-gray-400">Custom Development</span>
                    <span className="text-red-400 font-semibold">$1000+ once</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-white font-medium">Annual Cost</span>
                    <span className="text-red-400 font-bold text-xl">~$480/year</span>
                  </div>
                </div>
              </div>

              {/* STS Cost */}
              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">STS Platform</h3>
                    <p className="text-emerald-400 text-sm">Connector included free</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-emerald-900/30">
                    <span className="text-gray-400">8 Backtested Strategies</span>
                    <span className="text-emerald-400 font-semibold">Included</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-emerald-900/30">
                    <span className="text-gray-400">Real-Time Signals</span>
                    <span className="text-emerald-400 font-semibold">Included</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-emerald-900/30">
                    <span className="text-gray-400">Brokerage Connector</span>
                    <span className="text-emerald-400 font-semibold">Included</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-white font-medium">Connector Cost</span>
                    <span className="text-emerald-400 font-bold text-xl">$0/year</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Savings Highlight */}
            <div className="mt-8 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center">
              <div className="text-5xl font-bold text-emerald-400 mb-2">
                ${savingsData.yearlySavings}+
              </div>
              <div className="text-gray-400 mb-4">Annual savings on brokerage connector alone</div>
              <p className="text-sm text-gray-500 max-w-xl mx-auto">
                Plus you get 8 backtested strategies, professional analytics, and portfolio tools — 
                things you'd spend months building yourself.
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
              See <span className="font-bold text-emerald-400">Inside the Platform</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Full transparency. Every metric, every trade, every correlation — visible before you subscribe.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="rounded-2xl overflow-hidden border border-gray-800">
              <img 
                src="/screenshots/strategies-page.webp" 
                alt="Strategy Performance" 
                className="w-full"
              />
              <div className="bg-gray-900 p-4">
                <h4 className="text-white font-medium mb-1">Strategy Performance</h4>
                <p className="text-gray-400 text-sm">Compare all 8 strategies side by side with detailed metrics</p>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden border border-gray-800">
              <img 
                src="/screenshots/compare-page.webp" 
                alt="Portfolio Comparison" 
                className="w-full"
              />
              <div className="bg-gray-900 p-4">
                <h4 className="text-white font-medium mb-1">Portfolio Builder</h4>
                <p className="text-gray-400 text-sm">Combine strategies and see combined equity curves</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 border-t border-gray-800/50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-light text-white mb-4">
              Simple, <span className="font-bold text-emerald-400">Transparent Pricing</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Start free, upgrade when you're ready. Brokerage connector included in all paid plans.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {pricingTiers.map((tier, index) => (
              <Card 
                key={index}
                className={`relative bg-gray-900/50 border-gray-800 ${
                  tier.popular ? 'border-emerald-500 ring-1 ring-emerald-500/20' : ''
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
                  <CardTitle className="text-xl text-white">{tier.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-white">${tier.price}</span>
                    {tier.price > 0 && (
                      <span className="text-gray-400">/{tier.period}</span>
                    )}
                  </div>
                  {tier.annualPrice && (
                    <p className="text-sm text-emerald-400 mt-1">
                      ${tier.annualPrice}/mo billed annually
                    </p>
                  )}
                  <p className="text-sm text-gray-400 mt-2">{tier.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {isAuthenticated ? (
                    <Link href="/my-dashboard">
                      <Button 
                        className={`w-full ${
                          tier.popular 
                            ? 'bg-emerald-600 hover:bg-emerald-500' 
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        {tier.price === 0 ? 'Current Plan' : tier.cta}
                      </Button>
                    </Link>
                  ) : (
                    <a href={getLoginUrl()}>
                      <Button 
                        className={`w-full ${
                          tier.popular 
                            ? 'bg-emerald-600 hover:bg-emerald-500' 
                            : 'bg-gray-700 hover:bg-gray-600'
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
          
          <p className="text-center text-sm text-gray-500 mt-8">
            All prices in USD. Enterprise plans available for institutions.{' '}
            <a href="mailto:support@ststrading.com" className="text-emerald-400 hover:underline">
              Contact us
            </a>{' '}
            for custom solutions.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 border-t border-gray-800/50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-light text-white mb-4">
              Frequently Asked <span className="font-semibold">Questions</span>
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
                  <span className="text-white font-medium pr-4">{faq.question}</span>
                  {openFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="p-6 pt-0 bg-gray-900/30">
                    <p className="text-gray-400 leading-relaxed">{faq.answer}</p>
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
              Ready to <span className="font-semibold text-emerald-400">Trade Systematically?</span>
            </h2>
            <p className="text-gray-400 mb-10">
              Join traders who use data-driven strategies instead of gut feelings
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Link href="/overview">
                  <Button size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-6 text-lg rounded-full">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <a href={getLoginUrl()}>
                  <Button size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-6 text-lg rounded-full">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
              )}
            </div>
            
            <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Brokerage connector included</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>14-day money-back guarantee</span>
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
              <p className="text-gray-500 text-sm">
                Systematic Trading Strategies for futures traders. Professional analytics, real-time signals, and auto-execution.
              </p>
            </div>
            <div>
              <h4 className="text-gray-300 font-medium mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#what-you-get" className="text-gray-500 hover:text-white transition-colors">What You Get</a></li>
                <li><a href="#compare" className="text-gray-500 hover:text-white transition-colors">Compare</a></li>
                <li><a href="#savings" className="text-gray-500 hover:text-white transition-colors">Savings</a></li>
                <li><a href="#pricing" className="text-gray-500 hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-300 font-medium mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/overview"><span className="text-gray-500 hover:text-white transition-colors cursor-pointer">Dashboard</span></Link></li>
                <li><Link href="/strategies"><span className="text-gray-500 hover:text-white transition-colors cursor-pointer">All Strategies</span></Link></li>
                <li><Link href="/compare"><span className="text-gray-500 hover:text-white transition-colors cursor-pointer">Compare</span></Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-300 font-medium mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="text-gray-500">Terms of Service</span></li>
                <li><span className="text-gray-500">Privacy Policy</span></li>
                <li><span className="text-gray-500">Risk Disclosure</span></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-gray-800/50 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-gray-500 text-sm">
              © {new Date().getFullYear()} STS Systematic Trading Strategies. All rights reserved.
            </div>
            <div className="text-gray-600 text-xs max-w-xl text-center md:text-right">
              Trading involves substantial risk of loss and is not suitable for all investors. 
              Past performance is not indicative of future results. 
              This platform is for informational purposes only and does not constitute financial advice.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
