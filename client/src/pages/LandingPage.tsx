import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Play,
  LayoutDashboard
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";

// FAQ data - Updated for single plan with 7-day guarantee
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
    answer: "No. While our strategies have demonstrated strong historical performance with 130% return and 1.50 Sharpe ratio over 14+ years, past performance is not indicative of future results. Trading involves substantial risk of loss."
  },
  {
    question: "What's included in the subscription?",
    answer: "Everything: 8 backtested strategies, real-time TradingView signals, brokerage auto-execution connector, professional analytics dashboard, personal portfolio builder, correlation analysis tools, and priority support. No hidden fees or add-ons."
  },
  {
    question: "What makes your strategies different?",
    answer: "Our strategies are built on rigorous backtesting with 14+ years of data, focus on risk-adjusted returns (not just raw profits), and provide full transparency with detailed performance metrics including Sharpe, Sortino, and Calmar ratios. Plus, we include the brokerage connector at no extra cost."
  },
  {
    question: "Do you offer refunds?",
    answer: "Yes, we offer a 7-day money-back guarantee. If you're not satisfied with the platform within 7 days of your subscription, contact us for a full refund. No questions asked."
  },
  {
    question: "Will prices increase?",
    answer: "Yes, prices will increase as we add more strategies and features. However, when you subscribe, you lock in your rate for life. Your price will never go up as long as you maintain your subscription."
  }
];

// Comparison data - What you get vs alternatives
const comparisonFeatures = [
  { feature: "Backtested strategies (14+ years)", sts: true, discretionary: false, diy: "Months of work" },
  { feature: "Real-time TradingView signals", sts: true, discretionary: false, diy: "Build yourself" },
  { feature: "Brokerage auto-execution", sts: true, discretionary: false, diy: "$30-50/mo extra" },
  { feature: "Risk-adjusted metrics (Sharpe, Sortino)", sts: true, discretionary: false, diy: "Build yourself" },
  { feature: "Portfolio correlation analysis", sts: true, discretionary: false, diy: "Build yourself" },
  { feature: "Personal dashboard & portfolio builder", sts: true, discretionary: false, diy: "Build yourself" },
  { feature: "Emotion-free execution", sts: true, discretionary: false, diy: true },
  { feature: "24/7 market monitoring", sts: true, discretionary: false, diy: true },
  { feature: "Time investment", sts: "Minutes/day", discretionary: "Hours/day", diy: "Months to build" },
];

export default function LandingPage() {
  const { user, isAuthenticated } = useAuth();
  const { data: stats, isLoading } = trpc.platform.stats.useQuery();
  const { data: strategies } = trpc.subscription.availableStrategies.useQuery(undefined, { enabled: isAuthenticated });
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [contractSize, setContractSize] = useState<'micro' | 'mini'>('mini');

  // Calculate savings
  const savingsData = useMemo(() => {
    const thirdPartyMonthly = 40; // Average cost of TradersPost, Alpaca, etc.
    const ourCost = 0; // Included in subscription
    const monthlySavings = thirdPartyMonthly - ourCost;
    const yearlySavings = monthlySavings * 12;
    return { monthlySavings, yearlySavings, thirdPartyMonthly };
  }, []);

  // Accurate stats based on Overview page data (All Time view)
  // Mini: $1.1M total return over 15 years = ~$73.3K/year average
  // Micro: 1/10th of dollar values = ~$7.3K/year
  // Max DD: Mini -$48.8K, Micro -$4.9K
  const displayStats = useMemo(() => {
    const isMicro = contractSize === 'micro';
    // $1.1M total over 15 years = $73.3K/year average (Mini)
    // $110K total over 15 years = $7.3K/year average (Micro)
    return {
      totalReturn: isMicro ? '+$110K' : '+$1.1M',
      totalReturnLabel: 'TOTAL RETURN (1-2 CONTRACTS MAX/TRADE)',
      totalReturnPct: '1111.5%',
      avgReturnPerYear: isMicro ? '+$7.3K' : '+$73.3K',
      avgReturnPerYearLabel: isMicro ? 'AVG RETURN/YEAR (1 CONTRACT)' : 'AVG RETURN/YEAR (2 CONTRACTS)',
      maxDrawdown: isMicro ? '-$4.9K' : '-$48.8K',
      maxDrawdownLabel: isMicro ? 'MAX DRAWDOWN (1 CONTRACT)' : 'MAX DRAWDOWN (2 CONTRACTS)',
      maxDrawdownPct: '18.6%',
      sharpe: '1.50',
      sortino: '2.33',
      winRate: '38.9%',
      trades: '9,376',
      calmar: '0.97',
      yearsData: '15+'
    };
  }, [contractSize]);

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

      {/* Hero Section - Cleaned up and reorganized */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:100px_100px]" />
        
        <div className="container relative z-10 py-12">
          <div className="max-w-5xl mx-auto text-center">
            {/* Main Headline - H1 for SEO */}
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-10 tracking-tight leading-tight">
              <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">Systematic Trading Strategies</span><br />
              <span className="text-white">for Futures.</span>
            </h1>
            
            {/* Contract Size Toggle - Moved up */}
            <div className="flex items-center justify-center gap-2 mb-6">
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
                  Micro
                </button>
                <button
                  onClick={() => setContractSize('mini')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                    contractSize === 'mini' 
                      ? 'bg-emerald-600 text-white' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Mini
                </button>
              </div>
            </div>

            {/* Key Stats - Now updates based on contract size */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 max-w-4xl mx-auto mb-8">
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <div className="text-2xl sm:text-3xl font-bold text-emerald-400 mb-1">
                  {displayStats.totalReturn}
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">{displayStats.totalReturnLabel}</div>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <div className="text-2xl sm:text-3xl font-bold text-emerald-400 mb-1">
                  {displayStats.avgReturnPerYear}
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">{displayStats.avgReturnPerYearLabel}</div>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                  {displayStats.sharpe}
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Sharpe Ratio</div>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <div className="text-2xl sm:text-3xl font-bold text-orange-400 mb-1">
                  {displayStats.maxDrawdown}
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">{displayStats.maxDrawdownLabel}</div>
              </div>
              <div className="col-span-2 md:col-span-1 bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1">
                  {displayStats.yearsData}
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Years Data</div>
              </div>
            </div>
            
            {/* Description - Moved below stats */}
            <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
              Get access to <span className="text-white font-medium">8 backtested futures strategies</span> with 15+ years of data, 
              real-time TradingView signals, and <span className="text-emerald-400 font-medium">built-in brokerage execution</span>.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
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
                    Start 7-Day Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
              )}

            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>7-day money-back guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Brokerage connector included</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Lock in your rate for life</span>
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
              Everything You Need to <span className="font-bold text-emerald-400">Trade Futures Systematically</span>
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
                  <LayoutDashboard className="w-6 h-6 text-rose-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Personal Dashboard</h3>
                <p className="text-gray-400 text-sm">
                  Build your own portfolio by selecting strategies that match your goals. Track your personal equity curve and performance metrics.
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
                    Start 7-Day Trial
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
              Why Choose <span className="font-bold text-emerald-400">Algorithmic Futures Trading</span> with STS?
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
                    <td className="py-4 px-4 text-gray-300">{row.feature}</td>
                    <td className="py-4 px-4 text-center">
                      {row.sts === true ? (
                        <Check className="w-5 h-5 text-emerald-400 mx-auto" />
                      ) : (
                        <span className="text-emerald-400 text-sm">{row.sts}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {row.discretionary === true ? (
                        <Check className="w-5 h-5 text-gray-400 mx-auto" />
                      ) : row.discretionary === false ? (
                        <X className="w-5 h-5 text-red-400 mx-auto" />
                      ) : (
                        <span className="text-gray-500 text-sm">{row.discretionary}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {row.diy === true ? (
                        <Check className="w-5 h-5 text-gray-400 mx-auto" />
                      ) : row.diy === false ? (
                        <X className="w-5 h-5 text-red-400 mx-auto" />
                      ) : (
                        <span className="text-gray-500 text-sm">{row.diy}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Savings Section */}
      <section id="savings" className="py-20 border-t border-gray-800/50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-light text-white mb-4">
              Save <span className="font-bold text-emerald-400">${savingsData.yearlySavings}+</span> on Trading Automation
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Our brokerage connector alone saves you more than most third-party services charge.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
            {/* Third Party Cost */}
            <div className="bg-red-950/20 border border-red-500/30 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Third-Party Connectors</h3>
                  <p className="text-red-400 text-sm">TradersPost, Alpaca, etc.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-red-900/30">
                  <span className="text-gray-400">Monthly Subscription</span>
                  <span className="text-red-400 font-semibold">$30-50/mo</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-red-900/30">
                  <span className="text-gray-400">Per-Trade Fees</span>
                  <span className="text-red-400 font-semibold">$0.10-0.50</span>
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
          <div className="mt-8 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center max-w-4xl mx-auto">
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
      </section>

      {/* Dashboard Screenshots Section */}
      <section className="py-20 border-t border-gray-800/50 bg-gray-900/20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-light text-white mb-4">
              Professional <span className="font-bold text-emerald-400">Trading Analytics Dashboard</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Full transparency. Every metric, every trade, every correlation — visible before you subscribe.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
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
            <div className="rounded-2xl overflow-hidden border border-gray-800">
              <img 
                src="/screenshots/my-dashboard.webp" 
                alt="Personal Dashboard" 
                className="w-full"
              />
              <div className="bg-gray-900 p-4">
                <h4 className="text-white font-medium mb-1">Personal Dashboard</h4>
                <p className="text-gray-400 text-sm">Select your strategies and track your personal portfolio</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - Single Plan */}
      <section id="pricing" className="py-20 border-t border-gray-800/50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-light text-white mb-4">
              Futures Trading <span className="font-bold text-emerald-400">Subscription Pricing</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              One plan. Everything included. Lock in your rate for life.
            </p>
          </div>
          
          <div className="max-w-lg mx-auto">
            <Card className="relative bg-gray-900/50 border-emerald-500 ring-1 ring-emerald-500/20">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Lock In Your Rate For Life
                </span>
              </div>
              <CardHeader className="text-center pb-4 pt-8">
                <CardTitle className="text-2xl text-white">Pro</CardTitle>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-white">$49</span>
                  <span className="text-gray-400">/month</span>
                </div>
                <p className="text-sm text-emerald-400 mt-2">
                  Prices will increase. Subscribe now to lock in this rate forever.
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">8 backtested strategies (14+ years data)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">Real-time TradingView signals</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">Brokerage connector (Tradovate & IBKR)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">Personal dashboard & portfolio builder</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">Professional analytics (Sharpe, Sortino, Calmar)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">Correlation analysis tools</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">Email & SMS alerts</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">Priority support</span>
                  </li>
                </ul>
                {isAuthenticated ? (
                  <Link href="/my-dashboard">
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-500 py-6 text-lg">
                      Go to Dashboard
                    </Button>
                  </Link>
                ) : (
                  <a href={getLoginUrl()}>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-500 py-6 text-lg">
                      Start 7-Day Trial
                    </Button>
                  </a>
                )}
                <p className="text-center text-sm text-gray-500 mt-4">
                  7-day money-back guarantee. Cancel anytime.
                </p>
              </CardContent>
            </Card>
          </div>
          
          <p className="text-center text-sm text-gray-500 mt-8">
            All prices in USD. Questions?{' '}
            <a href="mailto:support@ststrading.com" className="text-emerald-400 hover:underline">
              Contact us
            </a>
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 border-t border-gray-800/50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-light text-white mb-4">
              Futures Trading <span className="font-semibold text-emerald-400">FAQ</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Everything you need to know about the platform
            </p>
          </div>
          
          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="text-white font-medium pr-4">{faq.question}</span>
                  {openFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-6">
                    <p className="text-gray-400">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 border-t border-gray-800/50 bg-gradient-to-b from-emerald-950/20 to-transparent">
        <div className="container text-center">
          <h2 className="text-3xl sm:text-4xl font-light text-white mb-4">
            Start <span className="font-bold text-emerald-400">Algorithmic Futures Trading</span> Today
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto mb-8">
            Join traders who've replaced guesswork with proven, backtested strategies.
          </p>
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
                Start 7-Day Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </a>
          )}
          <p className="text-sm text-gray-500 mt-4">
            7-day money-back guarantee • Brokerage connector included • Lock in your rate for life
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-800/50">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-semibold text-white">STS</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="mailto:support@ststrading.com" className="hover:text-white transition-colors">Contact</a>
            </div>
            <p className="text-sm text-gray-500">
              © 2025 STS. All rights reserved.
            </p>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800/50">
            <p className="text-xs text-gray-600 text-center max-w-4xl mx-auto">
              <strong>Risk Disclosure:</strong> Trading futures involves substantial risk of loss and is not suitable for all investors. 
              Past performance is not indicative of future results. The information provided is for educational purposes only and 
              should not be considered investment advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
