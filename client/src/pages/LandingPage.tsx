import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { 
  TrendingUp, 
  Shield, 
  Zap, 
  BarChart3, 
  LineChart,
  Target,
  Clock,
  CheckCircle2,
  ArrowRight,
  Play,
  Star,
  Users,
  Award,
  Lock,
  RefreshCw
} from "lucide-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Stripe checkout mutation
  const checkoutMutation = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      console.error('Checkout error:', error);
      setIsCheckingOut(false);
    },
  });

  const handleSubscribe = () => {
    if (!user) {
      // Redirect to login first
      window.location.href = getLoginUrl();
      return;
    }
    setIsCheckingOut(true);
    checkoutMutation.mutate({
      tier: 'pro',
      interval: 'monthly',
    });
  };

  // Note: We no longer auto-redirect logged-in users
  // They can view the landing page and click "Go to Dashboard" if they want

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                IntraDay Strategies
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                className="text-slate-300 hover:text-white"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Features
              </Button>
              <Button 
                variant="ghost" 
                className="text-slate-300 hover:text-white"
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              >
                How It Works
              </Button>
              <Button 
                variant="ghost" 
                className="text-slate-300 hover:text-white"
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Pricing
              </Button>
              <Button 
                variant="ghost" 
                className="text-slate-300 hover:text-white"
                onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}
              >
                FAQ
              </Button>
              {user ? (
                <Button 
                  onClick={() => setLocation('/my-dashboard')}
                  className="bg-gradient-to-r from-emerald-600 to-cyan-500 hover:from-emerald-500 hover:to-cyan-400 text-white"
                >
                  Go to Dashboard
                </Button>
              ) : (
                <Button 
                  onClick={() => window.location.href = getLoginUrl()}
                  className="bg-gradient-to-r from-emerald-600 to-cyan-500 hover:from-emerald-500 hover:to-cyan-400 text-white"
                >
                  Get Started
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            <Badge className="mb-6 bg-blue-500/20 text-blue-400 border-blue-500/30 px-4 py-1.5">
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Professional-Grade Trading Strategies
            </Badge>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="text-white">Trade Smarter with</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                Quantitative Strategies
              </span>
            </h1>
            
            <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Access institutional-quality intraday trading strategies. Subscribe to signals, 
              track performance, and automate your trading with real-time webhook integration.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg"
                onClick={() => window.location.href = getLoginUrl()}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white px-8 py-6 text-lg shadow-lg shadow-blue-500/25"
              >
                Login to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-800 px-8 py-6 text-lg"
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              >
                View Pricing
              </Button>
            </div>
          </div>
          
          {/* Stats Bar */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-white mb-1">8</div>
              <div className="text-slate-400 text-sm">Active Strategies</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-emerald-400 mb-1">$17,628</div>
              <div className="text-slate-400 text-sm">Avg Annual Return</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-white mb-1">15+ Years</div>
              <div className="text-slate-400 text-sm">Backtested History</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-blue-400 mb-1">$1M+</div>
              <div className="text-slate-400 text-sm">Total Returns</div>
            </div>
          </div>
          
          {/* Portfolio Preview Chart */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10 pointer-events-none" />
            <div className="rounded-xl overflow-hidden border border-slate-700/50 shadow-2xl shadow-blue-500/10">
              <img 
                src="/portfolio-preview.webp" 
                alt="Portfolio Performance - 15 years of backtested equity curve showing $1M+ returns"
                className="w-full h-auto"
              />
            </div>
            <p className="text-center text-slate-500 text-sm mt-4">
              Live portfolio performance dashboard with 15+ years of backtested data
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything You Need to Trade Professionally
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Our platform provides comprehensive tools for strategy analysis, 
              portfolio management, and automated trade execution.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<LineChart className="h-6 w-6" />}
              title="Strategy Library"
              description="Access a curated library of backtested intraday strategies across futures, forex, and crypto markets."
              color="blue"
            />
            <FeatureCard 
              icon={<BarChart3 className="h-6 w-6" />}
              title="Performance Analytics"
              description="Deep-dive into strategy metrics including Sharpe ratio, max drawdown, win rate, and Monte Carlo simulations."
              color="emerald"
            />
            <FeatureCard 
              icon={<Target className="h-6 w-6" />}
              title="Portfolio Builder"
              description="Combine multiple strategies to create diversified portfolios with correlation analysis and risk optimization."
              color="purple"
            />
            <FeatureCard 
              icon={<Zap className="h-6 w-6" />}
              title="Real-Time Signals"
              description="Receive instant trade signals via webhooks. Connect to TradingView or your preferred platform."
              color="yellow"
            />
            <FeatureCard 
              icon={<Shield className="h-6 w-6" />}
              title="Risk Management"
              description="Built-in position sizing, Kelly Criterion calculations, and risk of ruin analysis for every strategy."
              color="red"
            />
            <FeatureCard 
              icon={<Clock className="h-6 w-6" />}
              title="Broker Integration"
              description="Connect to Tradovate, Interactive Brokers, and more for automated order execution."
              color="cyan"
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-500/20 text-purple-400 border-purple-500/30">
              How It Works
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Get Started in 3 Simple Steps
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard 
              number="1"
              title="Browse Strategies"
              description="Explore our library of quantitative strategies. Filter by market, timeframe, and risk profile to find what suits your trading style."
            />
            <StepCard 
              number="2"
              title="Subscribe & Configure"
              description="Subscribe to strategies that match your goals. Set position sizes, risk limits, and notification preferences."
            />
            <StepCard 
              number="3"
              title="Trade Automatically"
              description="Connect your broker and let the system execute trades automatically, or receive signals to trade manually."
            />
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              <Star className="w-3.5 h-3.5 mr-1.5" />
              Trusted Platform
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Built for Serious Traders
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Active Community</div>
                    <div className="text-sm text-slate-400">Growing user base</div>
                  </div>
                </div>
                <p className="text-slate-300">
                  Join a community of traders who are leveraging quantitative strategies to improve their trading results.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Award className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Verified Results</div>
                    <div className="text-sm text-slate-400">Transparent performance</div>
                  </div>
                </div>
                <p className="text-slate-300">
                  All strategy performance is tracked in real-time with verified trade logs and auditable results.
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800/50 border-slate-700/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Lock className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-white">Secure Platform</div>
                    <div className="text-sm text-slate-400">Enterprise-grade security</div>
                  </div>
                </div>
                <p className="text-slate-300">
                  Your data and credentials are protected with industry-standard encryption and secure authentication.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              Simple Pricing
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              One Plan, Everything Included
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Get full access to all strategies, real-time signals, and broker integrations for one simple monthly price.
            </p>
          </div>
          
          <div className="max-w-lg mx-auto">
            <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-emerald-500/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                MOST POPULAR
              </div>
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-white mb-2">Pro Trader</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-white">$50</span>
                    <span className="text-slate-400">/month</span>
                  </div>
                  <p className="text-slate-400 mt-2">Cancel anytime</p>
                </div>
                
                <ul className="space-y-4 mb-8">
                  <li className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                    <span>Access to all 8+ trading strategies</span>
                  </li>
                  <li className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                    <span>Real-time webhook signals</span>
                  </li>
                  <li className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                    <span>Tradovate & IBKR broker integration</span>
                  </li>
                  <li className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                    <span>Automated trade execution</span>
                  </li>
                  <li className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                    <span>Portfolio analytics & risk management</span>
                  </li>
                  <li className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                    <span>Email & push notifications</span>
                  </li>
                  <li className="flex items-center gap-3 text-slate-300">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                    <span>Priority support</span>
                  </li>
                </ul>
                
                <Button 
                  size="lg"
                  onClick={handleSubscribe}
                  disabled={isCheckingOut}
                  className="w-full bg-gradient-to-r from-emerald-600 to-cyan-500 hover:from-emerald-500 hover:to-cyan-400 text-white py-6 text-lg shadow-lg shadow-emerald-500/25 disabled:opacity-50"
                >
                  {isCheckingOut ? 'Redirecting to Checkout...' : (user ? 'Subscribe Now' : 'Login to Subscribe')}
                  {!isCheckingOut && <ArrowRight className="ml-2 h-5 w-5" />}
                </Button>
                
                <p className="text-center text-sm text-slate-500 mt-4">
                  Secure checkout powered by Stripe
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Money-back guarantee */}
          <div className="text-center mt-12">
            <div className="inline-flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-full px-6 py-3">
              <RefreshCw className="h-5 w-5 text-emerald-400" />
              <span className="text-slate-300">30-day money-back guarantee</span>
            </div>
          </div>
          
          {/* Risk Notice */}
          <p className="text-center text-xs text-slate-500 mt-6 max-w-2xl mx-auto">
            Past performance is not indicative of future results. Trading involves substantial risk of loss.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
              FAQ
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-slate-400">
              Everything you need to know about our trading strategies
            </p>
          </div>
          
          <div className="space-y-4">
            <FAQItem 
              question="How do the trading strategies work?"
              answer="Our strategies are algorithmic trading systems that analyze market data in real-time and generate buy/sell signals based on proven quantitative methods. When a signal is generated, it's sent to your connected broker for automatic execution, or you can receive notifications to execute manually."
            />
            <FAQItem 
              question="What is the historical performance?"
              answer="Our backtested results show an average annual return of $17,628 on a $100,000 account over 15+ years of historical data. Past performance doesn't guarantee future results, but our strategies have been rigorously tested across multiple market conditions including the 2008 financial crisis and 2020 COVID crash."
            />
            <FAQItem 
              question="Which brokers are supported?"
              answer="We currently support Tradovate for futures trading and Interactive Brokers (IBKR) for stocks and options. You connect your broker account securely through OAuth - we never see your login credentials. More brokers will be added based on user demand."
            />
            <FAQItem 
              question="What markets do the strategies trade?"
              answer="Our strategies focus on highly liquid futures markets including ES (S&P 500), NQ (Nasdaq), CL (Crude Oil), GC (Gold), YM (Dow Jones), and BTC (Bitcoin futures). These markets offer excellent liquidity and tight spreads for intraday trading."
            />
            <FAQItem 
              question="What is the minimum account size?"
              answer="We recommend a minimum of $25,000 for futures trading to properly manage risk and meet margin requirements. However, you can start with a smaller account and scale up as you become comfortable with the strategies."
            />
            <FAQItem 
              question="Can I cancel my subscription anytime?"
              answer="Yes, you can cancel your subscription at any time from your dashboard. We also offer a 30-day money-back guarantee - if you're not satisfied with the service, contact us for a full refund."
            />
            <FAQItem 
              question="How do I get notified of trades?"
              answer="You can customize your notification preferences in the dashboard. Options include email alerts, push notifications, and in-app alerts. You can enable/disable notifications for each strategy individually."
            />
            <FAQItem 
              question="Is my broker account secure?"
              answer="Absolutely. We use OAuth 2.0 authentication which means you log in directly with your broker - we never see or store your password. We only receive permission to place trades on your behalf, and you can revoke access at any time from your broker's settings."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Trading?
          </h2>
          <p className="text-xl text-slate-400 mb-8">
            Join traders who are already using quantitative strategies to improve their results.
          </p>
          <Button 
            size="lg"
            onClick={() => user ? setLocation('/my-dashboard') : window.location.href = getLoginUrl()}
            className="bg-gradient-to-r from-emerald-600 to-cyan-500 hover:from-emerald-500 hover:to-cyan-400 text-white px-10 py-6 text-lg shadow-lg shadow-emerald-500/25"
          >
            {user ? 'Go to Dashboard' : 'Get Started Free'}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          {/* Risk Disclaimer */}
          <div className="mb-8 p-4 bg-slate-800/30 border border-slate-700/50 rounded-lg">
            <p className="text-xs text-slate-500 leading-relaxed">
              <strong className="text-slate-400">Risk Disclaimer:</strong> Trading futures and other financial instruments involves substantial risk of loss and is not suitable for all investors. Past performance is not indicative of future results. The performance data shown is based on backtested results and may not reflect actual trading conditions. You should carefully consider whether trading is appropriate for you in light of your financial condition. Never trade with money you cannot afford to lose. IntraDay Strategies provides educational and informational content only and does not provide personalized investment advice.
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">IntraDay Strategies</span>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex gap-4 text-sm text-slate-500">
                <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
                <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
                <a href="#" className="hover:text-slate-300 transition-colors">Risk Disclosure</a>
              </div>
              <div className="text-sm text-slate-500">
                © 2025 IntraDay Strategies. All rights reserved.
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Feature Card Component
function FeatureCard({ icon, title, description, color }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    red: 'bg-red-500/20 text-red-400 border-red-500/30',
    cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  };
  
  return (
    <Card className="bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50 transition-colors">
      <CardContent className="p-6">
        <div className={`h-12 w-12 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-4 border`}>
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

// Step Card Component
function StepCard({ number, title, description }: { 
  number: string; 
  title: string; 
  description: string;
}) {
  return (
    <div className="relative">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
          {number}
        </div>
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
          <p className="text-slate-400 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}


// FAQ Item Component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
      >
        <span className="font-medium text-white">{question}</span>
        <svg
          className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-6 py-4 bg-slate-800/20 border-t border-slate-700/50">
          <p className="text-slate-400 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}
