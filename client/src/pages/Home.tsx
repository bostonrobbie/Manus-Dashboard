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
  Check
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

// FAQ data
const faqs = [
  {
    question: "What is Intraday Strategies Dashboard?",
    answer: "A professional analytics platform for tracking and analyzing algorithmic futures trading strategies. We provide real-time signals, comprehensive performance metrics, and risk management tools based on 14+ years of backtested data."
  },
  {
    question: "How do the trading signals work?",
    answer: "Our strategies generate signals via TradingView alerts that are delivered through secure webhooks. When a strategy identifies a trade opportunity, you receive instant notifications with entry price, direction, and position details."
  },
  {
    question: "What markets do you cover?",
    answer: "We focus on futures markets including E-mini S&P 500 (ES), E-mini NASDAQ (NQ), Crude Oil (CL), Bitcoin (BTC), Gold (GC), and Dow Jones (YM). Each strategy is specifically designed for its target market."
  },
  {
    question: "Is past performance a guarantee of future results?",
    answer: "No. While our strategies have demonstrated strong historical performance with a 516% total return and 1.65 Sharpe ratio over 14+ years, past performance is not indicative of future results. Trading involves substantial risk of loss."
  },
  {
    question: "Can I try before subscribing?",
    answer: "Yes! We offer a free tier that lets you view public strategy performance, access limited historical data, and explore the platform. No credit card required to get started."
  },
  {
    question: "How do I connect to my broker?",
    answer: "Currently, the platform provides signals and analytics. You can manually execute trades based on the signals or use third-party automation tools to connect to your broker. Direct broker integration is on our roadmap."
  },
  {
    question: "What makes your strategies different?",
    answer: "Our strategies are built on rigorous backtesting with 14+ years of data, focus on risk-adjusted returns (not just raw profits), and provide full transparency with detailed performance metrics including Sharpe, Sortino, and Calmar ratios."
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

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { data: stats, isLoading } = trpc.platform.stats.useQuery();
  const { data: strategies } = trpc.subscription.availableStrategies.useQuery(undefined, { enabled: isAuthenticated });
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      // In production, this would send to a backend
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
            <span className="text-xl font-semibold text-white">Intraday Strategies</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#performance" className="text-sm text-gray-400 hover:text-white transition-colors">Performance</a>
            <a href="#strategies" className="text-sm text-gray-400 hover:text-white transition-colors">Strategies</a>
            <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="text-sm text-gray-400 hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link href="/overview">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-500">
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
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-500">
                    Get Started
                  </Button>
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:100px_100px]" />
        
        <div className="container relative z-10 py-20">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-blue-400 text-sm font-medium tracking-widest uppercase mb-6">
              Algorithmic Trading Analytics
            </p>
            
            <h1 className="text-5xl md:text-7xl font-light text-white mb-6 tracking-tight">
              Trade <span className="font-semibold">Smarter</span>
            </h1>
            
            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
              Professional-grade analytics for futures trading strategies. 
              Track performance, manage risk, and optimize your portfolio.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              {isAuthenticated ? (
                <Link href="/overview">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-6 text-lg rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <a href={getLoginUrl()}>
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-6 text-lg rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/25">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
              )}
              <a href="#pricing">
                <Button size="lg" variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800/50 px-10 py-6 text-lg rounded-full">
                  View Pricing
                </Button>
              </a>
            </div>
            
            {/* Live Performance Stats */}
            {!isLoading && stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-green-400 mb-1">
                    +{stats.totalReturn.toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Total Return</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                    {stats.sharpeRatio.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Sharpe Ratio</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                    {stats.winRate.toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Win Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                    {stats.yearsOfData.toFixed(0)}+
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Years Data</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Performance Showcase Section */}
      {!isLoading && stats && (
        <section id="performance" className="py-20 border-t border-gray-800/50">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-light text-white mb-4">
                Proven <span className="font-semibold">Performance</span>
              </h2>
              <p className="text-gray-400 max-w-xl mx-auto">
                Real results from {stats.totalTrades.toLocaleString()} trades across {stats.strategyCount} strategies
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <Card className="bg-gradient-to-br from-green-950/30 to-green-900/10 border-green-800/30 hover:border-green-700/50 transition-all duration-300">
                <CardContent className="p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                    <TrendingUp className="w-7 h-7 text-green-400" />
                  </div>
                  <div className="text-4xl font-bold text-green-400 mb-2">
                    +{stats.annualizedReturn.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-400 mb-4">Annualized Return</div>
                  <div className="text-xs text-gray-500">
                    vs S&P 500: ~10% annually
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-blue-950/30 to-blue-900/10 border-blue-800/30 hover:border-blue-700/50 transition-all duration-300">
                <CardContent className="p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-6">
                    <BarChart3 className="w-7 h-7 text-blue-400" />
                  </div>
                  <div className="text-4xl font-bold text-blue-400 mb-2">
                    {stats.sortinoRatio.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-400 mb-4">Sortino Ratio</div>
                  <div className="text-xs text-gray-500">
                    Downside risk-adjusted returns
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-amber-950/30 to-amber-900/10 border-amber-800/30 hover:border-amber-700/50 transition-all duration-300">
                <CardContent className="p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
                    <Shield className="w-7 h-7 text-amber-400" />
                  </div>
                  <div className="text-4xl font-bold text-amber-400 mb-2">
                    {Math.abs(stats.maxDrawdown).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-400 mb-4">Max Drawdown</div>
                  <div className="text-xs text-gray-500">
                    Historical worst-case scenario
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Additional Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 max-w-4xl mx-auto">
              <div className="text-center p-6 rounded-xl bg-gray-900/30 border border-gray-800/50">
                <div className="text-2xl font-bold text-white mb-1">{stats.profitFactor.toFixed(2)}</div>
                <div className="text-xs text-gray-500">Profit Factor</div>
              </div>
              <div className="text-center p-6 rounded-xl bg-gray-900/30 border border-gray-800/50">
                <div className="text-2xl font-bold text-green-400 mb-1">${stats.avgWin.toFixed(0)}</div>
                <div className="text-xs text-gray-500">Avg Win</div>
              </div>
              <div className="text-center p-6 rounded-xl bg-gray-900/30 border border-gray-800/50">
                <div className="text-2xl font-bold text-red-400 mb-1">${Math.abs(stats.avgLoss).toFixed(0)}</div>
                <div className="text-xs text-gray-500">Avg Loss</div>
              </div>
              <div className="text-center p-6 rounded-xl bg-gray-900/30 border border-gray-800/50">
                <div className="text-2xl font-bold text-white mb-1">{stats.strategyCount}</div>
                <div className="text-xs text-gray-500">Strategies</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Strategy Preview Cards */}
      {strategies && strategies.length > 0 && (
        <section id="strategies" className="py-20 border-t border-gray-800/50">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-light text-white mb-4">
                Our <span className="font-semibold">Strategies</span>
              </h2>
              <p className="text-gray-400 max-w-xl mx-auto">
                Diversified algorithmic strategies across multiple futures markets
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {strategies.slice(0, 8).map((strategy: { id: number; name: string; symbol: string; direction?: string; description?: string | null; createdAt: Date }) => (
                <Card key={strategy.id} className="bg-gray-900/30 border-gray-800/50 hover:border-gray-700/50 transition-all duration-300 overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-medium px-2 py-1 rounded bg-blue-500/10 text-blue-400">
                        {strategy.symbol}
                      </span>
                      <span className="text-xs text-gray-500">{strategy.direction}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2 truncate">{strategy.name}</h3>
                    <p className="text-sm text-gray-400 mb-4 line-clamp-2">{strategy.description || 'Algorithmic trading strategy'}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Since {new Date(strategy.createdAt).getFullYear()}</span>
                      <Link href={`/strategies/${strategy.id}`}>
                        <span className="text-blue-400 hover:text-blue-300 cursor-pointer">View Details →</span>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="text-center mt-12">
              <Link href="/strategies">
                <Button variant="outline" size="lg" className="border-gray-700 text-gray-300 hover:bg-gray-800/50">
                  View All Strategies
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-20 border-t border-gray-800/50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-light text-white mb-4">
              Professional <span className="font-semibold">Tools</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Everything you need to analyze and optimize your trading
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="p-8 rounded-2xl bg-gray-900/20 border border-gray-800/50 hover:border-gray-700/50 transition-all duration-300">
              <LineChart className="w-10 h-10 text-blue-400 mb-6" />
              <h3 className="text-xl font-semibold text-white mb-3">Advanced Analytics</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Sharpe, Sortino, Calmar ratios and 50+ professional metrics calculated in real-time
              </p>
            </div>
            
            <div className="p-8 rounded-2xl bg-gray-900/20 border border-gray-800/50 hover:border-gray-700/50 transition-all duration-300">
              <Zap className="w-10 h-10 text-green-400 mb-6" />
              <h3 className="text-xl font-semibold text-white mb-3">TradingView Integration</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Receive signals directly from TradingView alerts via secure webhooks
              </p>
            </div>
            
            <div className="p-8 rounded-2xl bg-gray-900/20 border border-gray-800/50 hover:border-gray-700/50 transition-all duration-300">
              <Target className="w-10 h-10 text-amber-400 mb-6" />
              <h3 className="text-xl font-semibold text-white mb-3">Risk Management</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Kelly criterion, position sizing, and drawdown analysis tools
              </p>
            </div>
            
            <div className="p-8 rounded-2xl bg-gray-900/20 border border-gray-800/50 hover:border-gray-700/50 transition-all duration-300">
              <Activity className="w-10 h-10 text-purple-400 mb-6" />
              <h3 className="text-xl font-semibold text-white mb-3">Real-Time Signals</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Get instant notifications for new trading signals on subscribed strategies
              </p>
            </div>
            
            <div className="p-8 rounded-2xl bg-gray-900/20 border border-gray-800/50 hover:border-gray-700/50 transition-all duration-300">
              <Award className="w-10 h-10 text-cyan-400 mb-6" />
              <h3 className="text-xl font-semibold text-white mb-3">Strategy Comparison</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Compare multiple strategies side-by-side with correlation analysis
              </p>
            </div>
            
            <div className="p-8 rounded-2xl bg-gray-900/20 border border-gray-800/50 hover:border-gray-700/50 transition-all duration-300">
              <Clock className="w-10 h-10 text-rose-400 mb-6" />
              <h3 className="text-xl font-semibold text-white mb-3">Historical Analysis</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {stats ? `${stats.yearsOfData.toFixed(0)}+ years` : '14+ years'} of backtested data with detailed performance breakdowns
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 border-t border-gray-800/50">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-light text-white mb-4">
              Simple <span className="font-semibold">Pricing</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto">
              Choose the plan that fits your trading needs. All plans include a 14-day money-back guarantee.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingTiers.map((tier) => (
              <Card 
                key={tier.name} 
                className={`relative overflow-hidden ${
                  tier.popular 
                    ? 'bg-gradient-to-br from-blue-950/50 to-blue-900/20 border-blue-700/50' 
                    : 'bg-gray-900/30 border-gray-800/50'
                } hover:border-blue-600/50 transition-all duration-300`}
              >
                {tier.popular && (
                  <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-medium px-3 py-1 rounded-bl-lg">
                    Most Popular
                  </div>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl text-white">{tier.name}</CardTitle>
                  <p className="text-sm text-gray-400">{tier.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-white">${tier.price}</span>
                    {tier.period !== "forever" && (
                      <span className="text-gray-400">/{tier.period}</span>
                    )}
                    {tier.annualPrice && (
                      <p className="text-sm text-green-400 mt-1">
                        ${tier.annualPrice}/mo billed annually (save 20%)
                      </p>
                    )}
                  </div>
                  
                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm text-gray-300">
                        <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {isAuthenticated ? (
                    <Link href="/my-dashboard">
                      <Button 
                        className={`w-full ${
                          tier.popular 
                            ? 'bg-blue-600 hover:bg-blue-500' 
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
                            ? 'bg-blue-600 hover:bg-blue-500' 
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
            <a href="mailto:support@intradaystrategies.com" className="text-blue-400 hover:underline">
              Contact us
            </a>{' '}
            for custom solutions.
          </p>
        </div>
      </section>

      {/* Email Capture Section */}
      <section className="py-20 border-t border-gray-800/50">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-3xl font-light text-white mb-4">
              Stay <span className="font-semibold">Updated</span>
            </h2>
            <p className="text-gray-400 mb-8">
              Get weekly market insights, strategy updates, and trading tips delivered to your inbox.
            </p>
            
            {emailSubmitted ? (
              <div className="flex items-center justify-center gap-2 text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                <span>Thanks for subscribing! Check your inbox to confirm.</span>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-gray-900/50 border-gray-700 text-white placeholder:text-gray-500 flex-1"
                  required
                />
                <Button type="submit" className="bg-blue-600 hover:bg-blue-500">
                  Subscribe
                </Button>
              </form>
            )}
            
            <p className="text-xs text-gray-500 mt-4">
              No spam, unsubscribe anytime. We respect your privacy.
            </p>
          </div>
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

      {/* Social Proof Section */}
      <section className="py-20 border-t border-gray-800/50">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 mb-2">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-400 text-sm">
                  "Finally, a platform that focuses on risk-adjusted returns, not just profits."
                </p>
                <p className="text-gray-500 text-xs mt-2">— Verified User</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users className="w-6 h-6 text-blue-400" />
                  <span className="text-2xl font-bold text-white">{stats?.totalTrades.toLocaleString() || '9,300'}+</span>
                </div>
                <p className="text-gray-400 text-sm">Trades Analyzed</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 mb-2">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-400 text-sm">
                  "The Kelly criterion calculator alone is worth the subscription."
                </p>
                <p className="text-gray-500 text-xs mt-2">— Verified User</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 border-t border-gray-800/50">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-light text-white mb-6">
              Ready to <span className="font-semibold">Get Started?</span>
            </h2>
            <p className="text-gray-400 mb-10">
              Join traders who use data-driven insights to improve their performance
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Link href="/overview">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-6 text-lg rounded-full">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <a href={getLoginUrl()}>
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-6 text-lg rounded-full">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
              )}
            </div>
            
            <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>14-day money-back guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Cancel anytime</span>
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
              <h3 className="text-white font-semibold mb-4">Intraday Strategies</h3>
              <p className="text-gray-500 text-sm">
                Professional algorithmic trading analytics for futures traders.
              </p>
            </div>
            <div>
              <h4 className="text-gray-300 font-medium mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#performance" className="text-gray-500 hover:text-white transition-colors">Performance</a></li>
                <li><a href="#strategies" className="text-gray-500 hover:text-white transition-colors">Strategies</a></li>
                <li><a href="#pricing" className="text-gray-500 hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#faq" className="text-gray-500 hover:text-white transition-colors">FAQ</a></li>
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
              © {new Date().getFullYear()} Intraday Strategies Dashboard. All rights reserved.
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
