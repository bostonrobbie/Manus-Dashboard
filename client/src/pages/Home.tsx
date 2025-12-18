import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Clock
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { data: stats, isLoading } = trpc.platform.stats.useQuery();

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Minimalistic Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 via-transparent to-transparent" />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:100px_100px]" />
        
        <div className="container relative z-10 py-20">
          <div className="max-w-4xl mx-auto text-center">
            {/* Simple tagline */}
            <p className="text-blue-400 text-sm font-medium tracking-widest uppercase mb-6">
              Algorithmic Trading Analytics
            </p>
            
            {/* Clean headline */}
            <h1 className="text-5xl md:text-7xl font-light text-white mb-6 tracking-tight">
              Trade <span className="font-semibold">Smarter</span>
            </h1>
            
            {/* Subtle subheadline */}
            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto font-light leading-relaxed">
              Professional-grade analytics for futures trading strategies. 
              Track performance, manage risk, and optimize your portfolio.
            </p>
            
            {/* CTA buttons */}
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
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
              )}
              <Link href="/overview">
                <Button size="lg" variant="outline" className="border-gray-700 text-gray-300 hover:bg-gray-800/50 px-10 py-6 text-lg rounded-full">
                  View Strategies
                </Button>
              </Link>
            </div>
            
            {/* Live Performance Stats from Dashboard */}
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
        <section className="py-20 border-t border-gray-800/50">
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
              {/* Returns Card */}
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
              
              {/* Risk-Adjusted Card */}
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
              
              {/* Risk Management Card */}
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

      {/* Features Section - Clean and Minimal */}
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

      {/* CTA Section */}
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
                    Start Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
              )}
            </div>
            
            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Free tier available</span>
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
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-gray-500 text-sm">
              © {new Date().getFullYear()} Intraday Strategies Dashboard. All rights reserved.
            </div>
            <div className="text-gray-600 text-xs max-w-xl text-center md:text-right">
              Trading involves substantial risk. Past performance is not indicative of future results. 
              This platform is for informational purposes only and does not constitute financial advice.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
