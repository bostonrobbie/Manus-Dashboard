import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Shield, 
  Zap, 
  BarChart3, 
  Users, 
  Clock, 
  CheckCircle2,
  ArrowRight,
  LineChart,
  Target,
  Bell,
  Lock
} from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/20" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        
        <div className="container relative z-10 py-24 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-blue-500/20 text-blue-400 border-blue-500/30 px-4 py-1.5">
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Professional Trading Analytics
            </Badge>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
              Intraday Trading Strategies Dashboard
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Track, analyze, and optimize your futures trading strategies with institutional-grade analytics. 
              Real-time signals, comprehensive metrics, and portfolio management in one platform.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Link href="/overview">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <a href={getLoginUrl()}>
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
              )}
              <Link href="/overview">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  View Demo
                </Button>
              </Link>
            </div>
            
            {/* Trust Badges */}
            <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span>Bank-Level Security</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Real-Time Data</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span>500+ Active Traders</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gradient-to-b from-background to-muted/20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Trade Smarter
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Professional-grade tools designed for serious futures traders
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20 hover:border-blue-500/40 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
                  <LineChart className="w-6 h-6 text-blue-400" />
                </div>
                <CardTitle>Advanced Analytics</CardTitle>
                <CardDescription>
                  Sharpe ratio, Sortino, Calmar, and 50+ professional metrics calculated in real-time
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20 hover:border-green-500/40 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-green-400" />
                </div>
                <CardTitle>TradingView Integration</CardTitle>
                <CardDescription>
                  Receive signals directly from TradingView alerts via secure webhooks
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20 hover:border-purple-500/40 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-purple-400" />
                </div>
                <CardTitle>Strategy Comparison</CardTitle>
                <CardDescription>
                  Compare multiple strategies side-by-side with correlation analysis
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20 hover:border-amber-500/40 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-amber-500/20 flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-amber-400" />
                </div>
                <CardTitle>Risk Management</CardTitle>
                <CardDescription>
                  Kelly criterion, position sizing, and drawdown analysis tools
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20 hover:border-cyan-500/40 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-4">
                  <Bell className="w-6 h-6 text-cyan-400" />
                </div>
                <CardTitle>Signal Notifications</CardTitle>
                <CardDescription>
                  Get instant alerts for new trading signals on your subscribed strategies
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="bg-gradient-to-br from-rose-500/10 to-rose-600/5 border-rose-500/20 hover:border-rose-500/40 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-rose-500/20 flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-rose-400" />
                </div>
                <CardTitle>Secure & Private</CardTitle>
                <CardDescription>
                  Your data is encrypted and never shared. Full control over your strategies
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground">
              Start free, upgrade when you need more
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Starter</CardTitle>
                <CardDescription>For individual traders</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">Free</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {['View all strategies', 'Basic analytics', 'Portfolio overview', 'Community support'].map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full mt-6" variant="outline">
                  Get Started
                </Button>
              </CardContent>
            </Card>
            
            {/* Professional */}
            <Card className="border-blue-500/50 bg-gradient-to-b from-blue-500/10 to-transparent relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-blue-600 text-white">Most Popular</Badge>
              </div>
              <CardHeader>
                <CardTitle>Professional</CardTitle>
                <CardDescription>For serious traders</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$49</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {['Everything in Starter', 'Subscribe to strategies', 'Real-time signals', 'Advanced analytics', 'Priority support'].map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-700">
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>
            
            {/* Enterprise */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Enterprise</CardTitle>
                <CardDescription>For trading firms</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">Custom</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {['Everything in Professional', 'Custom strategies', 'API access', 'Dedicated support', 'White-label options'].map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full mt-6" variant="outline">
                  Contact Sales
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12 bg-muted/20">
        <div className="container">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                Intraday Dashboard
              </h3>
              <p className="text-sm text-muted-foreground">
                Professional trading analytics for futures traders.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/overview" className="hover:text-foreground">Dashboard</Link></li>
                <li><Link href="/strategies" className="hover:text-foreground">Strategies</Link></li>
                <li><Link href="/compare" className="hover:text-foreground">Compare</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground">API Reference</a></li>
                <li><a href="#" className="hover:text-foreground">Support</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground">Terms of Service</a></li>
                <li><a href="#" className="hover:text-foreground">Risk Disclosure</a></li>
              </ul>
            </div>
          </div>
          
          {/* Risk Disclosure */}
          <div className="border-t border-border/50 pt-8 mt-8">
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
              <p className="text-xs text-amber-200/80">
                <strong className="text-amber-200">Risk Disclosure:</strong> Trading futures involves substantial risk of loss and is not suitable for all investors. 
                Past performance is not indicative of future results. The information provided on this platform is for educational purposes only 
                and should not be considered as financial advice. You should carefully consider whether trading is appropriate for you in light 
                of your circumstances, knowledge, and financial resources.
              </p>
            </div>
            
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
              <p>© 2025 Intraday Dashboard. All rights reserved.</p>
              <p>Made with precision for serious traders.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
