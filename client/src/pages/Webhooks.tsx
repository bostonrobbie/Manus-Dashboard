import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Copy, Check, RefreshCw, AlertCircle, CheckCircle2, Clock, XCircle, 
  AlertTriangle, Pause, Play, Trash2, Activity, Zap, Settings,
  Code, BookOpen, Shield, FlaskConical, Send, Eye, Lock, BarChart3,
  Search, Filter, Download, ChevronRight, ExternalLink, Link2,
  TrendingUp, TrendingDown, Server, Database, Wifi, WifiOff
} from "lucide-react";
import { toast } from "sonner";
import { useLocation, useSearch } from "wouter";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Webhooks() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const urlParams = new URLSearchParams(search);
  const initialTab = urlParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Check admin access
  const { data: accessCheck, isLoading: accessLoading } = trpc.webhook.checkAccess.useQuery();
  
  // Redirect non-admins
  useEffect(() => {
    if (!accessLoading && accessCheck && !accessCheck.hasAccess) {
      toast.error("Access denied. Admin privileges required.");
      setLocation("/overview");
    }
  }, [accessCheck, accessLoading, setLocation]);
  
  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setLocation(`/webhooks?tab=${tab}`, { replace: true });
  };
  
  // Show loading while checking access
  if (accessLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }
  
  // Show access denied if not admin
  if (!accessCheck?.hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              This page requires administrator privileges. Please contact the system administrator if you need access.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => setLocation("/overview")} variant="outline">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Admin Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              TradingView Webhooks
              <Badge className="bg-primary/20 text-primary border-primary/30">
                <Shield className="w-3 h-3 mr-1" />
                Admin
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure, test, and monitor TradingView alert webhooks
            </p>
          </div>
        </div>
        <WebhookStatusIndicator />
      </div>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Activity</span>
          </TabsTrigger>
          <TabsTrigger value="setup" className="gap-2">
            <Code className="h-4 w-4" />
            <span className="hidden sm:inline">Setup</span>
          </TabsTrigger>
          <TabsTrigger value="brokers" className="gap-2">
            <Server className="h-4 w-4" />
            <span className="hidden sm:inline">Brokers</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <ActivityTab />
        </TabsContent>

        <TabsContent value="setup" className="space-y-6">
          <SetupTab />
        </TabsContent>

        <TabsContent value="brokers" className="space-y-6">
          <BrokersTab />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// STATUS INDICATOR COMPONENT
// ============================================================================

function WebhookStatusIndicator() {
  const { data: status } = trpc.webhook.getStatus.useQuery();
  
  return (
    <div className="flex items-center gap-4">
      {status?.isPaused ? (
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 px-3 py-1.5">
          <Pause className="w-4 h-4 mr-2" />
          Processing Paused
        </Badge>
      ) : (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-3 py-1.5">
          <Wifi className="w-4 h-4 mr-2" />
          Active
        </Badge>
      )}
    </div>
  );
}

// ============================================================================
// OVERVIEW TAB
// ============================================================================

function OverviewTab() {
  const { data: status, refetch: refetchStatus } = trpc.webhook.getStatus.useQuery();
  const { data: healthReport } = trpc.webhook.getHealthReport.useQuery();
  const { data: logs } = trpc.webhook.getLogs.useQuery({ limit: 10 });
  
  const pauseMutation = trpc.webhook.pause.useMutation({
    onSuccess: () => {
      toast.success("Webhook processing paused");
      refetchStatus();
    },
  });
  
  const resumeMutation = trpc.webhook.resume.useMutation({
    onSuccess: () => {
      toast.success("Webhook processing resumed");
      refetchStatus();
    },
  });

  // Calculate chart data from logs
  const chartData = useMemo(() => {
    if (!logs) return [];
    
    // Group by hour for last 24 hours
    const now = new Date();
    const hours: { hour: string; success: number; failed: number }[] = [];
    
    for (let i = 23; i >= 0; i--) {
      const hourDate = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourStr = hourDate.toLocaleTimeString('en-US', { hour: '2-digit', hour12: true });
      hours.push({ hour: hourStr, success: 0, failed: 0 });
    }
    
    logs.forEach(log => {
      const logDate = new Date(log.createdAt);
      const hoursAgo = Math.floor((now.getTime() - logDate.getTime()) / (60 * 60 * 1000));
      if (hoursAgo < 24) {
        const index = 23 - hoursAgo;
        if (index >= 0 && index < 24) {
          if (log.status === 'success') {
            hours[index].success++;
          } else if (log.status === 'failed') {
            hours[index].failed++;
          }
        }
      }
    });
    
    return hours;
  }, [logs]);

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{status?.stats?.total || 0}</div>
            <div className="text-xs text-muted-foreground">Total Webhooks</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-400">{status?.stats?.success || 0}</div>
            <div className="text-xs text-muted-foreground">Successful</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-400">{status?.stats?.failed || 0}</div>
            <div className="text-xs text-muted-foreground">Failed</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-400">{status?.stats?.duplicate || 0}</div>
            <div className="text-xs text-muted-foreground">Duplicates</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{status?.avgProcessingTimeMs || 0}ms</div>
            <div className="text-xs text-muted-foreground">Avg Processing</div>
          </CardContent>
        </Card>
      </div>

      {/* Health Status & Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Health Status */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge className={healthReport?.status === 'healthy' 
                ? "bg-green-500/20 text-green-400" 
                : "bg-yellow-500/20 text-yellow-400"}>
                {healthReport?.status || 'Unknown'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Circuit Breaker</span>
              <Badge className={healthReport?.circuitBreaker?.open 
                ? "bg-red-500/20 text-red-400" 
                : "bg-green-500/20 text-green-400"}>
                {healthReport?.circuitBreaker?.open ? 'Open' : 'Closed'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last Hour Success Rate</span>
              <span className="font-mono">{healthReport?.metrics?.lastHour?.successRate || '100%'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">P95 Latency</span>
              <span className="font-mono">{healthReport?.metrics?.lastHour?.p95ProcessingMs || 0}ms</span>
            </div>
            
            {healthReport?.issues && healthReport.issues.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-sm font-medium text-yellow-400 mb-2">Issues Detected:</p>
                <ul className="space-y-1">
                  {healthReport.issues.map((issue, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {status?.isPaused ? (
              <Button 
                className="w-full justify-start"
                variant="outline"
                onClick={() => resumeMutation.mutate()}
                disabled={resumeMutation.isPending}
              >
                <Play className="h-4 w-4 mr-2 text-green-400" />
                Resume Webhook Processing
              </Button>
            ) : (
              <Button 
                className="w-full justify-start"
                variant="outline"
                onClick={() => pauseMutation.mutate()}
                disabled={pauseMutation.isPending}
              >
                <Pause className="h-4 w-4 mr-2 text-yellow-400" />
                Pause Webhook Processing
              </Button>
            )}
            <Button className="w-full justify-start" variant="outline" asChild>
              <a href="/webhooks?tab=setup">
                <Code className="h-4 w-4 mr-2" />
                View Setup Instructions
                <ChevronRight className="h-4 w-4 ml-auto" />
              </a>
            </Button>
            <Button className="w-full justify-start" variant="outline" asChild>
              <a href="/webhooks?tab=activity">
                <Activity className="h-4 w-4 mr-2" />
                View Activity Log
                <ChevronRight className="h-4 w-4 ml-auto" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <a href="/webhooks?tab=activity">
              View All <ChevronRight className="h-4 w-4 ml-1" />
            </a>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {logs?.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-3">
                  {log.status === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : log.status === 'failed' ? (
                    <XCircle className="h-4 w-4 text-red-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  )}
                  <div>
                    <span className="font-medium">{log.strategySymbol || 'Unknown'}</span>
                    <span className="text-muted-foreground text-sm ml-2">
                      {log.direction || 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{log.processingTimeMs}ms</span>
                  <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
            {(!logs || logs.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No webhook activity yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// ============================================================================
// ACTIVITY TAB
// ============================================================================

function ActivityTab() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed' | 'duplicate'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: logs, refetch, isLoading } = trpc.webhook.getLogs.useQuery({
    limit: 100,
    status: statusFilter,
    search: searchQuery || undefined,
  });
  
  const { data: strategies } = trpc.portfolio.listStrategies.useQuery();
  
  const clearLogsMutation = trpc.webhook.clearLogs.useMutation({
    onSuccess: (data) => {
      toast.success(`Cleared ${data.deleted} webhook logs`);
      refetch();
    },
  });
  
  const deleteLogMutation = trpc.webhook.deleteLog.useMutation({
    onSuccess: () => {
      toast.success("Log deleted");
      refetch();
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Success</Badge>;
      case "failed":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case "duplicate":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><AlertTriangle className="w-3 h-3 mr-1" />Duplicate</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400"><Clock className="w-3 h-3 mr-1" />{status}</Badge>;
    }
  };

  return (
    <>
      {/* Filters */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="duplicate">Duplicate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by symbol, error, or payload..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                onClick={() => {
                  if (confirm("Clear all webhook logs? This cannot be undone.")) {
                    clearLogsMutation.mutate();
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Table */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Strategy</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>P&L</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Latency</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell className="font-medium">{log.strategySymbol || '-'}</TableCell>
                  <TableCell>
                    {log.direction === 'Long' ? (
                      <span className="text-green-400 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Long
                      </span>
                    ) : log.direction === 'Short' ? (
                      <span className="text-red-400 flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" /> Short
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="font-mono">
                    {log.entryPrice ? `$${(log.entryPrice / 100).toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell className="font-mono">
                    {log.pnl !== null ? (
                      <span className={log.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {log.pnl >= 0 ? '+' : ''}${(log.pnl / 100).toFixed(2)}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {log.processingTimeMs}ms
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-400"
                      onClick={() => deleteLogMutation.mutate({ logId: log.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!logs || logs.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No webhook logs found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

// ============================================================================
// SETUP TAB
// ============================================================================

function SetupTab() {
  const [selectedStrategy, setSelectedStrategy] = useState<string>("");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [testPayload, setTestPayload] = useState('');
  const [validationResult, setValidationResult] = useState<any>(null);
  
  const { data: webhookConfig } = trpc.webhook.getConfig.useQuery();
  const { data: strategies } = trpc.portfolio.listStrategies.useQuery();
  
  const validateMutation = trpc.webhook.validatePayload.useMutation({
    onSuccess: (data) => {
      setValidationResult(data);
      if (data.valid) {
        toast.success("Payload is valid!");
      } else {
        toast.error(data.error || "Validation failed");
      }
    },
  });

  const copyToClipboard = async (text: string, type: 'url' | 'template') => {
    await navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedTemplate(true);
      setTimeout(() => setCopiedTemplate(false), 2000);
    }
    toast.success("Copied to clipboard!");
  };

  // Unified template that handles both entry and exit signals
  // TradingView will populate the action based on strategy.order.action
  const getUnifiedTemplate = () => JSON.stringify({
    symbol: selectedStrategy || "ESTrend",
    date: "{{timenow}}",
    data: "{{strategy.order.action}}",
    quantity: "{{strategy.order.contracts}}",
    price: "{{close}}",
    direction: "{{strategy.market_position}}",
    entryPrice: "{{strategy.position_avg_price}}",
    pnl: "{{strategy.order.profit}}",
    token: "your_secret_token"
  }, null, 2);

  return (
    <>
      {/* Step 1: Webhook URL */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">1</div>
            <div>
              <CardTitle>Webhook URL</CardTitle>
              <CardDescription>Copy this URL and paste it into your TradingView alert webhook settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input 
              value={webhookConfig?.webhookUrl || ''} 
              readOnly 
              className="font-mono text-sm"
            />
            <Button 
              variant="outline" 
              onClick={() => copyToClipboard(webhookConfig?.webhookUrl || '', 'url')}
            >
              {copiedUrl ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Select Strategy */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">2</div>
            <div>
              <CardTitle>Select Strategy</CardTitle>
              <CardDescription>Choose a strategy to generate the correct JSON templates</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
            <SelectTrigger className="w-full max-w-md">
              <SelectValue placeholder="Select a strategy..." />
            </SelectTrigger>
            <SelectContent>
              {strategies?.map((s) => (
                <SelectItem key={s.id} value={s.symbol}>{s.name} ({s.symbol})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Step 3: Message Templates */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">3</div>
            <div>
              <CardTitle>Message Templates</CardTitle>
              <CardDescription>Copy these JSON templates into your TradingView alert message field</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Unified Template */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                Unified Signal Template
              </Label>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => copyToClipboard(getUnifiedTemplate(), 'template')}
              >
                {copiedTemplate ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              This single template handles both entry and exit signals. TradingView automatically populates the action, direction, and P&L fields.
            </p>
            <Textarea 
              value={getUnifiedTemplate()} 
              readOnly 
              className="font-mono text-xs h-64"
            />
          </div>

          {/* TradingView Variables Reference */}
          <div className="rounded-lg border border-border/50 bg-background/50 p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              TradingView Placeholder Variables
            </h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <code className="text-xs bg-muted px-2 py-1 rounded">{'{{timenow}}'}</code>
                  <span className="text-muted-foreground">Current timestamp</span>
                </div>
                <div className="flex justify-between">
                  <code className="text-xs bg-muted px-2 py-1 rounded">{'{{close}}'}</code>
                  <span className="text-muted-foreground">Current price</span>
                </div>
                <div className="flex justify-between">
                  <code className="text-xs bg-muted px-2 py-1 rounded">{'{{strategy.order.action}}'}</code>
                  <span className="text-muted-foreground">buy/sell/exit</span>
                </div>
                <div className="flex justify-between">
                  <code className="text-xs bg-muted px-2 py-1 rounded">{'{{strategy.order.contracts}}'}</code>
                  <span className="text-muted-foreground">Quantity</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <code className="text-xs bg-muted px-2 py-1 rounded">{'{{strategy.market_position}}'}</code>
                  <span className="text-muted-foreground">long/short/flat</span>
                </div>
                <div className="flex justify-between">
                  <code className="text-xs bg-muted px-2 py-1 rounded">{'{{strategy.position_avg_price}}'}</code>
                  <span className="text-muted-foreground">Entry price</span>
                </div>
                <div className="flex justify-between">
                  <code className="text-xs bg-muted px-2 py-1 rounded">{'{{strategy.order.profit}}'}</code>
                  <span className="text-muted-foreground">P&L in dollars</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payload Validator */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Payload Validator
          </CardTitle>
          <CardDescription>Test your webhook payload before using it in TradingView</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste your JSON payload here..."
            value={testPayload}
            onChange={(e) => setTestPayload(e.target.value)}
            className="font-mono text-xs h-32"
          />
          <div className="flex gap-2">
            <Button 
              onClick={() => validateMutation.mutate({ payload: testPayload })}
              disabled={!testPayload || validateMutation.isPending}
            >
              <Eye className="h-4 w-4 mr-2" />
              Validate Payload
            </Button>
          </div>
          
          {validationResult && (
            <div className={`p-4 rounded-lg ${validationResult.valid ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
              {validationResult.valid ? (
                <div className="space-y-2">
                  <p className="text-green-400 font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Payload is valid!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Strategy: {validationResult.strategyName || validationResult.mappedSymbol}
                  </p>
                </div>
              ) : (
                <p className="text-red-400 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  {validationResult.error}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ============================================================================
// BROKERS TAB
// ============================================================================

function BrokersTab() {
  return (
    <>
      {/* Broker Connections */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Broker Connections
          </CardTitle>
          <CardDescription>
            Connect your trading accounts to enable automated order execution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tradovate */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-background/50">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <span className="font-bold text-blue-400">TV</span>
              </div>
              <div>
                <h3 className="font-medium">Tradovate</h3>
                <p className="text-sm text-muted-foreground">Futures trading platform</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-gray-500/20 text-gray-400">Not Connected</Badge>
              <Button variant="outline" size="sm">
                <Link2 className="h-4 w-4 mr-2" />
                Connect
              </Button>
            </div>
          </div>

          {/* Interactive Brokers */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-background/50">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                <span className="font-bold text-red-400">IB</span>
              </div>
              <div>
                <h3 className="font-medium">Interactive Brokers</h3>
                <p className="text-sm text-muted-foreground">Multi-asset broker</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-gray-500/20 text-gray-400">Not Connected</Badge>
              <Button variant="outline" size="sm">
                <Link2 className="h-4 w-4 mr-2" />
                Connect
              </Button>
            </div>
          </div>

          {/* Fidelity */}
          <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-background/50 opacity-60">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                <span className="font-bold text-green-400">FD</span>
              </div>
              <div>
                <h3 className="font-medium">Fidelity</h3>
                <p className="text-sm text-muted-foreground">Stocks & options broker</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-yellow-500/20 text-yellow-400">Coming Soon</Badge>
              <Button variant="outline" size="sm" disabled>
                <Link2 className="h-4 w-4 mr-2" />
                Connect
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Routing Rules */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Routing Rules
          </CardTitle>
          <CardDescription>
            Configure how webhook signals are routed to connected brokers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Server className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Connect a broker to configure routing rules</p>
            <p className="text-sm mt-1">Signals will be logged but not executed until a broker is connected</p>
          </div>
        </CardContent>
      </Card>

      {/* Execution Mode */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Execution Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border/50">
            <div>
              <h3 className="font-medium">Signal Logging Only</h3>
              <p className="text-sm text-muted-foreground">Webhooks are logged but not executed</p>
            </div>
            <Badge className="bg-blue-500/20 text-blue-400">Current Mode</Badge>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 opacity-60">
            <div>
              <h3 className="font-medium">Paper Trading</h3>
              <p className="text-sm text-muted-foreground">Simulated execution without real orders</p>
            </div>
            <Badge className="bg-gray-500/20 text-gray-400">Requires Broker</Badge>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 opacity-60">
            <div>
              <h3 className="font-medium">Live Execution</h3>
              <p className="text-sm text-muted-foreground">Real orders sent to connected brokers</p>
            </div>
            <Badge className="bg-gray-500/20 text-gray-400">Requires Broker</Badge>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// ============================================================================
// SETTINGS TAB
// ============================================================================

function SettingsTab() {
  const { data: status, refetch } = trpc.webhook.getStatus.useQuery();
  
  const clearLogsMutation = trpc.webhook.clearLogs.useMutation({
    onSuccess: (data) => {
      toast.success(`Cleared ${data.deleted} logs`);
      refetch();
    },
  });

  return (
    <>
      {/* Security Settings */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Token Authentication</h3>
              <p className="text-sm text-muted-foreground">Require valid token in webhook payload</p>
            </div>
            <Badge className="bg-green-500/20 text-green-400">Enabled</Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Rate Limiting</h3>
              <p className="text-sm text-muted-foreground">60 requests per minute per IP</p>
            </div>
            <Badge className="bg-green-500/20 text-green-400">Enabled</Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">IP Allowlist</h3>
              <p className="text-sm text-muted-foreground">Only accept webhooks from TradingView IPs</p>
            </div>
            <Badge className="bg-gray-500/20 text-gray-400">Disabled</Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Replay Protection</h3>
              <p className="text-sm text-muted-foreground">Reject requests with timestamps older than 5 minutes</p>
            </div>
            <Badge className="bg-green-500/20 text-green-400">Enabled</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Processing Settings */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Processing Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Duplicate Detection</h3>
              <p className="text-sm text-muted-foreground">Prevent duplicate trades within 24 hours</p>
            </div>
            <Badge className="bg-green-500/20 text-green-400">Enabled</Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">Circuit Breaker</h3>
              <p className="text-sm text-muted-foreground">Auto-pause on repeated failures</p>
            </div>
            <Badge className="bg-green-500/20 text-green-400">Enabled</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border/50">
            <div>
              <h3 className="font-medium">Webhook Logs</h3>
              <p className="text-sm text-muted-foreground">{status?.stats?.total || 0} total entries</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="text-red-400 border-red-500/30 hover:bg-red-500/10"
              onClick={() => {
                if (confirm("Clear all webhook logs? This cannot be undone.")) {
                  clearLogsMutation.mutate();
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
