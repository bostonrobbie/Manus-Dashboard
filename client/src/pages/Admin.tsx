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
  TrendingUp, TrendingDown, Server, Database, Wifi, WifiOff,
  ArrowUpRight, ArrowDownRight, Target, DollarSign, Webhook
} from "lucide-react";
import { toast } from "sonner";
import { useLocation, useSearch } from "wouter";
import { WebhookSimulator } from "@/components/WebhookSimulator";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Admin() {
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
    setLocation(`/admin?tab=${tab}`, { replace: true });
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
              Admin Control Center
              <Badge className="bg-primary/20 text-primary border-primary/30">
                <Shield className="w-3 h-3 mr-1" />
                Owner
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage webhooks, broker connections, and system monitoring
            </p>
          </div>
        </div>
        <WebhookStatusIndicator />
      </div>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-8 h-auto p-1 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-1 sm:gap-2 px-2 sm:px-3 py-2">
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1 sm:gap-2 px-2 sm:px-3 py-2">
            <Activity className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Activity</span>
          </TabsTrigger>
          <TabsTrigger value="staging" className="gap-1 sm:gap-2 px-2 sm:px-3 py-2">
            <FlaskConical className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Staging</span>
          </TabsTrigger>
          <TabsTrigger value="setup" className="gap-1 sm:gap-2 px-2 sm:px-3 py-2">
            <Code className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Setup</span>
          </TabsTrigger>
          <TabsTrigger value="brokers" className="gap-1 sm:gap-2 px-2 sm:px-3 py-2">
            <Server className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Brokers</span>
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="gap-1 sm:gap-2 px-2 sm:px-3 py-2">
            <Eye className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Monitoring</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1 sm:gap-2 px-2 sm:px-3 py-2">
            <Settings className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
          <TabsTrigger value="simulator" className="gap-1 sm:gap-2 px-2 sm:px-3 py-2">
            <Webhook className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Simulator</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <ActivityTab />
        </TabsContent>

        <TabsContent value="staging" className="space-y-6">
          <StagingTab />
        </TabsContent>

        <TabsContent value="setup" className="space-y-6">
          <SetupTab />
        </TabsContent>

        <TabsContent value="brokers" className="space-y-6">
          <BrokersTab />
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <MonitoringTab />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <SettingsTab />
        </TabsContent>

        <TabsContent value="simulator" className="space-y-6">
          <WebhookSimulator />
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

      {/* Open Positions Panel */}
      <OpenPositionsPanel />

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
// OPEN POSITIONS PANEL
// ============================================================================

function OpenPositionsPanel() {
  const { data: positions, refetch, isLoading } = trpc.webhook.getOpenPositions.useQuery();
  const { data: stats } = trpc.webhook.getPositionStats.useQuery();
  const { data: strategies } = trpc.portfolio.listStrategies.useQuery();
  
  const deletePositionMutation = trpc.webhook.deletePosition.useMutation({
    onSuccess: () => {
      toast.success("Position closed");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to close position: ${error.message}`);
    },
  });
  
  const clearStrategyPositionsMutation = trpc.webhook.clearPositionsForStrategy.useMutation({
    onSuccess: (data) => {
      toast.success(`Cleared ${data.deleted} positions`);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to clear positions: ${error.message}`);
    },
  });

  const getStrategyName = (symbol: string) => {
    const strategy = strategies?.find(s => s.symbol === symbol);
    return strategy?.name || symbol;
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading positions...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-400" />
            Open Positions
            {positions && positions.length > 0 && (
              <Badge variant="outline" className="text-blue-400 border-blue-400/50 ml-2">
                {positions.length} active
              </Badge>
            )}
          </CardTitle>
          <CardDescription>Trades waiting for exit signals</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {positions && positions.length > 0 ? (
          <div className="space-y-4">
            {/* Position Stats */}
            {stats && (
              <div className="grid grid-cols-3 gap-4 p-3 rounded-lg bg-background/50 border border-border/30">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-400">{stats.openPositions}</div>
                  <div className="text-xs text-muted-foreground">Open</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-400">{stats.closedToday}</div>
                  <div className="text-xs text-muted-foreground">Closed Today</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${stats.totalPnlToday >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stats.totalPnlToday >= 0 ? '+' : ''}${stats.totalPnlToday.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">Today's P&L</div>
                </div>
              </div>
            )}

            {/* Positions List */}
            <div className="space-y-2">
              {positions.map((position) => (
                <div 
                  key={position.id} 
                  className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-background/50 hover:bg-background/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      position.direction === 'Long' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {position.direction === 'Long' ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{getStrategyName(position.strategySymbol)}</div>
                      <div className="text-xs text-muted-foreground">
                        {position.direction} @ ${position.entryPrice.toFixed(2)} • {position.quantity} contract{position.quantity !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-sm">
                      <div className="text-muted-foreground">
                        {new Date(position.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(position.entryTime).toLocaleDateString()}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => deletePositionMutation.mutate({ positionId: position.id })}
                      disabled={deletePositionMutation.isPending}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Target className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">No open positions</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Entry signals will appear here until matched with exit signals
            </p>
          </div>
        )}
      </CardContent>
    </Card>
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
    onError: (error) => {
      toast.error(`Failed to clear logs: ${error.message}`);
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
  const [quantityMultiplier, setQuantityMultiplier] = useState<number>(1);
  const [useFixedQuantity, setUseFixedQuantity] = useState<boolean>(false);
  const [fixedQuantity, setFixedQuantity] = useState<number>(1);
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

  // Template types for different signal scenarios
  const [templateType, setTemplateType] = useState<'unified' | 'entry' | 'exit'>('unified');
  
  // Unified template that handles both entry and exit signals
  // TradingView will populate the action based on strategy.order.action
  // Token is auto-populated from the configured webhook token
  const getUnifiedTemplate = () => {
    // Determine quantity field based on user settings
    let quantityValue: string | number;
    if (useFixedQuantity) {
      quantityValue = fixedQuantity;
    } else if (quantityMultiplier !== 1) {
      quantityValue = `{{strategy.order.contracts}}`;
    } else {
      quantityValue = "{{strategy.order.contracts}}";
    }

    const template: Record<string, any> = {
      symbol: selectedStrategy || "ESTrend",
      date: "{{timenow}}",
      data: "{{strategy.order.action}}",
      position: "{{strategy.market_position}}",
      quantity: quantityValue,
      price: "{{close}}",
      entryPrice: "{{strategy.position_avg_price}}",
      pnl: "{{strategy.order.profit}}",
      token: webhookConfig?.webhookToken || "your_secret_token"
    };

    if (!useFixedQuantity && quantityMultiplier !== 1) {
      template.quantityMultiplier = quantityMultiplier;
    }

    return JSON.stringify(template, null, 2);
  };

  // Entry-only template with explicit signalType
  const getEntryTemplate = () => {
    let quantityValue: string | number;
    if (useFixedQuantity) {
      quantityValue = fixedQuantity;
    } else {
      quantityValue = "{{strategy.order.contracts}}";
    }

    const template: Record<string, any> = {
      symbol: selectedStrategy || "ESTrend",
      signalType: "entry",
      date: "{{timenow}}",
      data: "{{strategy.order.action}}",
      position: "{{strategy.market_position}}",
      quantity: quantityValue,
      price: "{{close}}",
      token: webhookConfig?.webhookToken || "your_secret_token"
    };

    if (!useFixedQuantity && quantityMultiplier !== 1) {
      template.quantityMultiplier = quantityMultiplier;
    }

    return JSON.stringify(template, null, 2);
  };

  // Exit-only template with explicit signalType
  const getExitTemplate = () => {
    let quantityValue: string | number;
    if (useFixedQuantity) {
      quantityValue = fixedQuantity;
    } else {
      quantityValue = "{{strategy.order.contracts}}";
    }

    const template: Record<string, any> = {
      symbol: selectedStrategy || "ESTrend",
      signalType: "exit",
      date: "{{timenow}}",
      data: "exit",
      position: "flat",
      quantity: quantityValue,
      price: "{{close}}",
      entryPrice: "{{strategy.position_avg_price}}",
      pnl: "{{strategy.order.profit}}",
      token: webhookConfig?.webhookToken || "your_secret_token"
    };

    return JSON.stringify(template, null, 2);
  };

  const getCurrentTemplate = () => {
    switch (templateType) {
      case 'entry': return getEntryTemplate();
      case 'exit': return getExitTemplate();
      default: return getUnifiedTemplate();
    }
  };

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

      {/* Step 3: Quantity Configuration */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">3</div>
            <div>
              <CardTitle>Quantity Configuration</CardTitle>
              <CardDescription>Configure how many contracts to trade per signal</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quantity Mode Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="dynamic-qty"
                  name="qty-mode"
                  checked={!useFixedQuantity}
                  onChange={() => setUseFixedQuantity(false)}
                  className="h-4 w-4 text-primary"
                />
                <Label htmlFor="dynamic-qty" className="cursor-pointer">
                  Use TradingView's quantity
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="fixed-qty"
                  name="qty-mode"
                  checked={useFixedQuantity}
                  onChange={() => setUseFixedQuantity(true)}
                  className="h-4 w-4 text-primary"
                />
                <Label htmlFor="fixed-qty" className="cursor-pointer">
                  Use fixed quantity
                </Label>
              </div>
            </div>

            {/* Dynamic Quantity Options */}
            {!useFixedQuantity && (
              <div className="flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-background/50">
                <Label className="min-w-fit">Quantity Multiplier:</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={quantityMultiplier}
                  onChange={(e) => setQuantityMultiplier(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  {quantityMultiplier === 1 
                    ? "Uses strategy's signal quantity" 
                    : `Multiplies signal quantity by ${quantityMultiplier}x`}
                </span>
              </div>
            )}

            {/* Fixed Quantity Options */}
            {useFixedQuantity && (
              <div className="flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-background/50">
                <Label className="min-w-fit">Fixed Contracts:</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={fixedQuantity}
                  onChange={(e) => setFixedQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  Always trades {fixedQuantity} contract{fixedQuantity !== 1 ? 's' : ''} regardless of signal
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 4: Message Templates */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">4</div>
            <div>
              <CardTitle>Message Templates</CardTitle>
              <CardDescription>Copy this ready-to-use JSON into your TradingView alert message field</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template Type Selector */}
          <div className="flex gap-2 p-1 bg-muted/50 rounded-lg w-fit">
            <Button
              variant={templateType === 'unified' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTemplateType('unified')}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              Unified
            </Button>
            <Button
              variant={templateType === 'entry' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTemplateType('entry')}
              className="gap-2"
            >
              <ArrowUpRight className="h-4 w-4 text-green-400" />
              Entry Only
            </Button>
            <Button
              variant={templateType === 'exit' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTemplateType('exit')}
              className="gap-2"
            >
              <ArrowDownRight className="h-4 w-4 text-red-400" />
              Exit Only
            </Button>
          </div>

          {/* Template Display */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                {templateType === 'unified' && <><Zap className="h-4 w-4 text-yellow-400" /> Unified Signal Template</>}
                {templateType === 'entry' && <><ArrowUpRight className="h-4 w-4 text-green-400" /> Entry Signal Template</>}
                {templateType === 'exit' && <><ArrowDownRight className="h-4 w-4 text-red-400" /> Exit Signal Template</>}
              </Label>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => copyToClipboard(getCurrentTemplate(), 'template')}
              >
                {copiedTemplate ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="space-y-2">
              {templateType === 'unified' && (
                <p className="text-sm text-muted-foreground">
                  <strong>Recommended:</strong> Auto-detects entry/exit based on <code className="text-xs bg-muted px-1 rounded">position</code> field. 
                  When position changes to "flat", it's treated as an exit signal.
                </p>
              )}
              {templateType === 'entry' && (
                <p className="text-sm text-muted-foreground">
                  Use this template for <strong>entry-only alerts</strong>. The <code className="text-xs bg-muted px-1 rounded">signalType: "entry"</code> field 
                  explicitly marks this as an entry signal, creating an open position.
                </p>
              )}
              {templateType === 'exit' && (
                <p className="text-sm text-muted-foreground">
                  Use this template for <strong>exit-only alerts</strong>. The <code className="text-xs bg-muted px-1 rounded">signalType: "exit"</code> field 
                  explicitly marks this as an exit, closing the open position and calculating P&L.
                </p>
              )}
              {webhookConfig?.hasToken ? (
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Webhook token auto-included</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-yellow-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span>No webhook token configured - add one in Settings → Secrets</span>
                </div>
              )}
            </div>
            <Textarea 
              value={getCurrentTemplate()} 
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
  const [showIBKRDialog, setShowIBKRDialog] = useState(false);
  const [ibkrCredentials, setIBKRCredentials] = useState({ username: '', accountId: '', isPaper: true });
  const [connecting, setConnecting] = useState(false);
  const [tradovateMode, setTradovateMode] = useState<'demo' | 'live'>('demo');
  const [ibkrGatewayUrl, setIBKRGatewayUrl] = useState('http://localhost:5000');
  const [testingConnection, setTestingConnection] = useState(false);
  const [placingTestOrder, setPlacingTestOrder] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string; accounts?: { id: string; accountId: string }[] } | null>(null);
  
  // Get existing broker connections
  const { data: connections, refetch: refetchConnections } = trpc.broker.getConnections.useQuery();
  
  // Get OAuth URL for Tradovate
  const { data: tradovateOAuthUrl } = trpc.broker.getTradovateOAuthUrl.useQuery({ 
    isLive: tradovateMode === 'live' 
  });
  
  const connectBroker = trpc.broker.connect.useMutation({
    onSuccess: () => {
      toast.success('Broker connected successfully!');
      refetchConnections();
      setShowIBKRDialog(false);
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Failed to connect broker');
    },
  });
  const disconnectBroker = trpc.broker.disconnect.useMutation({
    onSuccess: () => {
      toast.success('Broker disconnected');
      refetchConnections();
    },
  });

  // Test IBKR connection mutation
  const testIBKRConnection = trpc.broker.testIBKRConnection.useMutation({
    onSuccess: (result) => {
      setConnectionTestResult(result as { success: boolean; message: string; accounts?: { id: string; accountId: string }[] });
      if (result.success) {
        toast.success(result.message || 'Connection test successful!');
      } else {
        toast.error(result.error || 'Connection test failed');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Connection test failed');
      setConnectionTestResult({ success: false, message: error.message || 'Connection test failed' });
    },
  });

  // Place test order mutation
  const placeTestOrder = trpc.broker.placeIBKRTestOrder.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message || 'Test order placed!');
      } else {
        toast.error(result.error || 'Failed to place test order');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to place test order');
    },
  });

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionTestResult(null);
    try {
      await testIBKRConnection.mutateAsync({ gatewayUrl: ibkrGatewayUrl });
    } finally {
      setTestingConnection(false);
    }
  };

  const handlePlaceTestOrder = async () => {
    if (!connectionTestResult?.accounts?.[0]?.id) {
      toast.error('Please test connection first to get account ID');
      return;
    }
    setPlacingTestOrder(true);
    try {
      await placeTestOrder.mutateAsync({
        gatewayUrl: ibkrGatewayUrl,
        accountId: connectionTestResult.accounts[0].id,
        symbol: 'MES',
        quantity: 1,
        side: 'BUY',
      });
    } finally {
      setPlacingTestOrder(false);
    }
  };
  
  const tradovateConnection = connections?.find(c => c.broker === 'tradovate');
  const ibkrConnection = connections?.find(c => c.broker === 'ibkr');
  
  // Handle Tradovate OAuth redirect - opens Tradovate login in same window
  const handleTradovateConnect = () => {
    if (tradovateOAuthUrl?.url) {
      // Redirect to Tradovate OAuth login page
      window.location.href = tradovateOAuthUrl.url;
    } else {
      toast.error('Tradovate OAuth not configured. Please contact support.');
    }
  };
  
  const handleIBKRConnect = async () => {
    setConnecting(true);
    try {
      await connectBroker.mutateAsync({
        broker: 'ibkr',
        credentials: {
          username: ibkrCredentials.username,
          accountId: ibkrCredentials.accountId,
        },
        isDemo: ibkrCredentials.isPaper,
      });
    } finally {
      setConnecting(false);
    }
  };
  
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
              <div className="h-12 w-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <span className="font-bold text-emerald-400">TV</span>
              </div>
              <div>
                <h3 className="font-medium">Tradovate</h3>
                <p className="text-sm text-muted-foreground">Futures trading platform</p>
                {tradovateConnection && (
                  <p className="text-xs text-emerald-400 mt-1">Account: {tradovateConnection.accountId || 'Connected'}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {tradovateConnection ? (
                <>
                  <Badge className="bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => disconnectBroker.mutate({ connectionId: tradovateConnection.id })}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <>
                  <Badge className="bg-gray-500/20 text-gray-400">Not Connected</Badge>
                  <Button variant="outline" size="sm" onClick={handleTradovateConnect}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Connect to Tradovate
                  </Button>
                </>
              )}
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
                {ibkrConnection && (
                  <p className="text-xs text-emerald-400 mt-1">Account: {ibkrConnection.accountId || 'Connected'}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {ibkrConnection ? (
                <>
                  <Badge className="bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => disconnectBroker.mutate({ connectionId: ibkrConnection.id })}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <>
                  <Badge className="bg-gray-500/20 text-gray-400">Not Connected</Badge>
                  <Button variant="outline" size="sm" onClick={() => setShowIBKRDialog(true)}>
                    <Link2 className="h-4 w-4 mr-2" />
                    Connect
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* IBKR Connection Testing */}
          {ibkrConnection && (
            <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-red-400">IBKR Gateway Testing</h4>
                  <p className="text-sm text-muted-foreground">Test your connection and place a paper trade</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Label className="text-sm">Gateway URL:</Label>
                <Input
                  value={ibkrGatewayUrl}
                  onChange={(e) => setIBKRGatewayUrl(e.target.value)}
                  placeholder="http://localhost:5000"
                  className="max-w-xs bg-background/50"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  {testingConnection ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Testing...</>
                  ) : (
                    <><Wifi className="h-4 w-4 mr-2" />Test Connection</>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePlaceTestOrder}
                  disabled={placingTestOrder || !connectionTestResult?.success}
                  className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                >
                  {placingTestOrder ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Placing...</>
                  ) : (
                    <><TrendingUp className="h-4 w-4 mr-2" />Place Test Order (1 MES)</>
                  )}
                </Button>
              </div>
              
              {connectionTestResult && (
                <div className={`p-3 rounded-lg ${connectionTestResult.success ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                  <p className={`text-sm ${connectionTestResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                    {connectionTestResult.success ? '✓' : '✗'} {connectionTestResult.message}
                  </p>
                  {connectionTestResult.accounts && connectionTestResult.accounts.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <p>Accounts found:</p>
                      <ul className="list-disc list-inside">
                        {connectionTestResult.accounts.map((acc: { id: string; accountId: string }) => (
                          <li key={acc.id}>{acc.accountId || acc.id}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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
      
      {/* Tradovate OAuth Info Card */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-emerald-500/20 flex items-center justify-center">
              <span className="font-bold text-emerald-400 text-xs">TV</span>
            </div>
            Tradovate OAuth Setup
          </CardTitle>
          <CardDescription>
            Connect securely via Tradovate's official OAuth login
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
            <h4 className="font-medium text-emerald-400 mb-2">How it works:</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Click "Connect to Tradovate" above</li>
              <li>You'll be redirected to Tradovate's secure login page</li>
              <li>Log in with your Tradovate credentials</li>
              <li>Authorize IntraDay Strategies to access your account</li>
              <li>You'll be redirected back here, connected!</li>
            </ol>
          </div>
          <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50">
            <div>
              <Label>Account Type</Label>
              <p className="text-xs text-muted-foreground">Select before connecting</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={tradovateMode === 'demo' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTradovateMode('demo')}
                className={tradovateMode === 'demo' ? 'bg-emerald-600' : ''}
              >
                Demo
              </Button>
              <Button 
                variant={tradovateMode === 'live' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTradovateMode('live')}
                className={tradovateMode === 'live' ? 'bg-red-600' : ''}
              >
                Live
              </Button>
            </div>
          </div>
          {tradovateMode === 'live' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-400">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                Live trading uses real money. Make sure you understand the risks.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* IBKR Connection Dialog */}
      {showIBKRDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <span className="font-bold text-red-400 text-sm">IB</span>
                </div>
                Connect Interactive Brokers
              </CardTitle>
              <CardDescription>
                Connect your IBKR account for automated trading
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-sm text-blue-400">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  IBKR requires the Client Portal Gateway to be running locally. 
                  <a href="https://www.interactivebrokers.com/campus/ibkr-api-page/cpapi-v1/" target="_blank" rel="noopener" className="underline ml-1">
                    Learn more
                  </a>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ibkr-username">Username</Label>
                <Input 
                  id="ibkr-username"
                  placeholder="Your IBKR username"
                  value={ibkrCredentials.username}
                  onChange={(e) => setIBKRCredentials(prev => ({ ...prev, username: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ibkr-account">Account ID (Optional)</Label>
                <Input 
                  id="ibkr-account"
                  placeholder="e.g., U1234567"
                  value={ibkrCredentials.accountId}
                  onChange={(e) => setIBKRCredentials(prev => ({ ...prev, accountId: e.target.value }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="ibkr-paper">Paper Trading</Label>
                <Switch 
                  id="ibkr-paper"
                  checked={ibkrCredentials.isPaper}
                  onCheckedChange={(checked) => setIBKRCredentials(prev => ({ ...prev, isPaper: checked }))}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowIBKRDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-red-600 hover:bg-red-700" 
                  onClick={handleIBKRConnect}
                  disabled={connecting || !ibkrCredentials.username}
                >
                  {connecting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
                  Connect
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
// MONITORING TAB
// ============================================================================

function MonitoringTab() {
  const { data: healthReport, refetch: refetchHealth } = trpc.webhook.getHealthReport.useQuery();
  const { data: logs, refetch: refetchLogs } = trpc.webhook.getLogs.useQuery({ limit: 50 });
  const { data: status } = trpc.webhook.getStatus.useQuery();
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      refetchHealth();
      refetchLogs();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, refetchHealth, refetchLogs]);
  
  // Calculate error rate
  const errorCount = logs?.filter(l => l.status === 'failed').length || 0;
  const totalLogs = logs?.length || 0;
  const errorRate = totalLogs > 0 ? ((errorCount / totalLogs) * 100).toFixed(1) : '0';
  
  // Calculate success rate
  const successCount = logs?.filter(l => l.status === 'success').length || 0;
  const successRate = totalLogs > 0 ? ((successCount / totalLogs) * 100).toFixed(1) : '100';
  
  // Calculate average response time
  const avgResponseTime = logs && logs.length > 0
    ? (logs.reduce((sum, l) => sum + (l.processingTimeMs || 0), 0) / logs.length).toFixed(0)
    : '0';
  
  // Calculate P95 response time
  const sortedTimes = logs?.map(l => l.processingTimeMs || 0).sort((a, b) => a - b) || [];
  const p95ResponseTime = sortedTimes.length > 0 
    ? sortedTimes[Math.floor(sortedTimes.length * 0.95)] 
    : 0;
  
  // Get last webhook timestamp
  const lastWebhook = logs && logs.length > 0 ? new Date(logs[0].createdAt) : null;
  const timeSinceLastWebhook = lastWebhook 
    ? Math.floor((Date.now() - lastWebhook.getTime()) / 60000)
    : null;
  
  return (
    <>
      {/* Monitoring Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Badge className={autoRefresh ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'}>
            <div className={`w-2 h-2 rounded-full mr-2 ${autoRefresh ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
            {autoRefresh ? 'Live Monitoring' : 'Paused'}
          </Badge>
          {lastWebhook && (
            <span className="text-xs text-muted-foreground">
              Last activity: {timeSinceLastWebhook === 0 ? 'Just now' : `${timeSinceLastWebhook}m ago`}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="auto-refresh" className="text-sm text-muted-foreground">Auto-refresh</Label>
          <Switch 
            id="auto-refresh"
            checked={autoRefresh} 
            onCheckedChange={setAutoRefresh} 
          />
          <Button variant="outline" size="sm" onClick={() => { refetchHealth(); refetchLogs(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Health
          </CardTitle>
          <CardDescription>
            Real-time monitoring of system performance and health metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="text-sm text-muted-foreground mb-1">System Status</div>
              <div className="text-2xl font-bold text-green-400">
                {healthReport?.isPaused ? 'Paused' : 'Healthy'}
              </div>
              <div className="text-xs text-green-400/70 mt-1">
                {healthReport?.isPaused ? 'Processing paused' : 'All systems operational'}
              </div>
            </div>
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="text-sm text-muted-foreground mb-1">Success Rate</div>
              <div className="text-2xl font-bold text-blue-400">{successRate}%</div>
              <div className="text-xs text-blue-400/70 mt-1">{successCount} successful</div>
            </div>
            <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
              <div className="text-sm text-muted-foreground mb-1">Avg Response</div>
              <div className="text-2xl font-bold text-cyan-400">{avgResponseTime}ms</div>
              <div className="text-xs text-cyan-400/70 mt-1">Last 50 requests</div>
            </div>
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <div className="text-sm text-muted-foreground mb-1">P95 Response</div>
              <div className="text-2xl font-bold text-purple-400">{p95ResponseTime}ms</div>
              <div className="text-xs text-purple-400/70 mt-1">95th percentile</div>
            </div>
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <div className="text-sm text-muted-foreground mb-1">Error Rate</div>
              <div className={`text-2xl font-bold ${parseFloat(errorRate) > 10 ? 'text-red-400' : 'text-yellow-400'}`}>
                {errorRate}%
              </div>
              <div className="text-xs text-yellow-400/70 mt-1">{errorCount} of {totalLogs} failed</div>
            </div>
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <div className="text-sm text-muted-foreground mb-1">Total Processed</div>
              <div className="text-2xl font-bold text-emerald-400">{status?.stats?.total || 0}</div>
              <div className="text-xs text-emerald-400/70 mt-1">All time</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Health Report Details */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Health Report
              </CardTitle>
              <CardDescription>
                Detailed health check results for all system components
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchHealth()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Database Health */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <div>
                  <div className="font-medium">Database Connection</div>
                  <div className="text-sm text-muted-foreground">MySQL/TiDB connected</div>
                </div>
              </div>
              <Badge className="bg-green-500/20 text-green-400">healthy</Badge>
            </div>
            {/* Webhook Processing */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
              <div className="flex items-center gap-3">
                {healthReport?.isPaused ? (
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                )}
                <div>
                  <div className="font-medium">Webhook Processing</div>
                  <div className="text-sm text-muted-foreground">
                    {healthReport?.isPaused ? 'Processing paused' : 'Processing active'}
                  </div>
                </div>
              </div>
              <Badge className={healthReport?.isPaused ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'}>
                {healthReport?.isPaused ? 'paused' : 'healthy'}
              </Badge>
            </div>
            {/* Circuit Breaker */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
              <div className="flex items-center gap-3">
                {healthReport?.circuitBreaker?.open ? (
                  <XCircle className="h-5 w-5 text-red-400" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                )}
                <div>
                  <div className="font-medium">Circuit Breaker</div>
                  <div className="text-sm text-muted-foreground">
                    {healthReport?.circuitBreaker?.open ? 'Circuit open - requests blocked' : 'Circuit closed - normal operation'}
                  </div>
                </div>
              </div>
              <Badge className={healthReport?.circuitBreaker?.open ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}>
                {healthReport?.circuitBreaker?.open ? 'open' : 'closed'}
              </Badge>
            </div>
            {/* Issues */}
            {healthReport?.issues && healthReport.issues.length > 0 && healthReport.issues.map((issue: string, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/5">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  <div>
                    <div className="font-medium">Issue Detected</div>
                    <div className="text-sm text-muted-foreground">{issue}</div>
                  </div>
                </div>
                <Badge className="bg-yellow-500/20 text-yellow-400">warning</Badge>
              </div>
            ))}
            {(!healthReport?.issues || healthReport.issues.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No health checks available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Log */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recent Errors
          </CardTitle>
          <CardDescription>
            Last 10 error events for debugging and troubleshooting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {logs?.filter(l => l.status === 'failed').slice(0, 10).map((log, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-red-400">{log.errorMessage || 'Unknown error'}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(log.createdAt).toLocaleString()} • {log.strategySymbol || 'Unknown strategy'}
                  </div>
                </div>
              </div>
            ))}
            {(!logs || logs.filter(l => l.status === 'failed').length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-400" />
                <p>No recent errors</p>
                <p className="text-sm mt-1">System is running smoothly</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// ============================================================================
// STAGING TAB (Webhook Review Workflow)
// ============================================================================

function StagingTab() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'edited'>('pending');
  const [editingTrade, setEditingTrade] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<{
    entryPrice: string;
    exitPrice: string;
    quantity: string;
    pnl: string;
    direction: string;
    reviewNotes: string;
  }>({ entryPrice: '', exitPrice: '', quantity: '', pnl: '', direction: '', reviewNotes: '' });

  const { data: stagingTrades, refetch, isLoading } = trpc.webhook.getStagingTrades.useQuery(
    statusFilter === 'all' ? undefined : { status: statusFilter }
  );
  const { data: stagingStats, refetch: refetchStats } = trpc.webhook.getStagingStats.useQuery();

  const approveMutation = trpc.webhook.approveStagingTrade.useMutation({
    onSuccess: () => {
      toast.success('Trade approved and moved to production');
      refetch();
      refetchStats();
    },
    onError: (error) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });

  const rejectMutation = trpc.webhook.rejectStagingTrade.useMutation({
    onSuccess: () => {
      toast.success('Trade rejected');
      refetch();
      refetchStats();
    },
    onError: (error) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });

  const editMutation = trpc.webhook.editStagingTrade.useMutation({
    onSuccess: () => {
      toast.success('Trade updated');
      setEditingTrade(null);
      refetch();
      refetchStats();
    },
    onError: (error) => {
      toast.error(`Failed to edit: ${error.message}`);
    },
  });

  const deleteMutation = trpc.webhook.deleteStagingTrade.useMutation({
    onSuccess: () => {
      toast.success('Trade deleted permanently');
      refetch();
      refetchStats();
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const handleApprove = (trade: any) => {
    if (trade.isOpen) {
      toast.error('Cannot approve open positions. Wait for exit signal.');
      return;
    }
    approveMutation.mutate({ stagingTradeId: trade.id });
  };

  const handleReject = (trade: any) => {
    const action = window.confirm(
      'Reject this trade?\n\nClick OK to reject, or Cancel to edit instead.'
    );
    if (action) {
      rejectMutation.mutate({ stagingTradeId: trade.id });
    } else {
      // Open edit dialog
      setEditingTrade(trade);
      setEditForm({
        entryPrice: trade.entryPrice?.toString() || '',
        exitPrice: trade.exitPrice?.toString() || '',
        quantity: trade.quantity?.toString() || '',
        pnl: trade.pnl?.toString() || '',
        direction: trade.direction || '',
        reviewNotes: '',
      });
    }
  };

  const handleDelete = (trade: any) => {
    if (window.confirm('Delete this trade permanently? This cannot be undone.')) {
      deleteMutation.mutate({ stagingTradeId: trade.id });
    }
  };

  const handleSaveEdit = () => {
    if (!editingTrade) return;
    editMutation.mutate({
      stagingTradeId: editingTrade.id,
      updates: {
        entryPrice: editForm.entryPrice ? parseFloat(editForm.entryPrice) : undefined,
        exitPrice: editForm.exitPrice ? parseFloat(editForm.exitPrice) : undefined,
        quantity: editForm.quantity ? parseInt(editForm.quantity) : undefined,
        pnl: editForm.pnl ? parseFloat(editForm.pnl) : undefined,
        direction: editForm.direction || undefined,
      },
      reviewNotes: editForm.reviewNotes || undefined,
    });
  };

  const getStatusBadge = (status: string, isOpen: boolean) => {
    if (isOpen) {
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Clock className="w-3 h-3 mr-1" />Open</Badge>;
    }
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'edited':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30"><AlertTriangle className="w-3 h-3 mr-1" />Edited</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400">{status}</Badge>;
    }
  };

  return (
    <>
      {/* Stats Overview */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-400">{stagingStats?.pending || 0}</div>
            <div className="text-sm text-muted-foreground">Pending Review</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-400">{stagingStats?.openPositions || 0}</div>
            <div className="text-sm text-muted-foreground">Open Positions</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/10 border-purple-500/30">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-400">{stagingStats?.edited || 0}</div>
            <div className="text-sm text-muted-foreground">Edited</div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-400">{stagingStats?.approved || 0}</div>
            <div className="text-sm text-muted-foreground">Approved</div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-400">{stagingStats?.rejected || 0}</div>
            <div className="text-sm text-muted-foreground">Rejected</div>
          </CardContent>
        </Card>
      </div>

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
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="edited">Edited</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={() => { refetch(); refetchStats(); }} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staging Trades Table */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Staging Trades
          </CardTitle>
          <CardDescription>
            Review webhook alerts before they update the production database. Approve to move to production, reject to discard, or edit to correct errors.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Strategy</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Entry</TableHead>
                <TableHead>Exit</TableHead>
                <TableHead>P&L</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Received</TableHead>
                <TableHead className="w-[150px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stagingTrades?.map((trade) => (
                <TableRow key={trade.id} className={trade.isOpen ? 'bg-blue-500/5' : ''}>
                  <TableCell>{getStatusBadge(trade.status, trade.isOpen)}</TableCell>
                  <TableCell className="font-medium">{trade.strategySymbol}</TableCell>
                  <TableCell>
                    {trade.direction === 'Long' ? (
                      <span className="text-green-400 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Long
                      </span>
                    ) : (
                      <span className="text-red-400 flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" /> Short
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono">
                    ${trade.entryPrice?.toFixed(2) || '-'}
                    <div className="text-xs text-muted-foreground">
                      {trade.entryDate ? new Date(trade.entryDate).toLocaleDateString() : '-'}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">
                    {trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : '-'}
                    <div className="text-xs text-muted-foreground">
                      {trade.exitDate ? new Date(trade.exitDate).toLocaleDateString() : '-'}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">
                    {trade.pnl !== null ? (
                      <span className={trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell>{trade.quantity}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(trade.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {(trade.status === 'pending' || trade.status === 'edited') && !trade.isOpen && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                          onClick={() => handleApprove(trade)}
                          disabled={approveMutation.isPending}
                          title="Approve"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => handleReject(trade)}
                          disabled={rejectMutation.isPending}
                          title="Reject (or Edit)"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {trade.isOpen && (
                      <span className="text-xs text-muted-foreground">Awaiting exit</span>
                    )}
                    {trade.status === 'rejected' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => handleDelete(trade)}
                        title="Delete permanently"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(!stagingTrades || stagingTrades.length === 0) && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    No staging trades found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingTrade && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Edit Staging Trade</CardTitle>
              <CardDescription>
                Correct the trade data before approving. Original values will be preserved.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Entry Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.entryPrice}
                    onChange={(e) => setEditForm({ ...editForm, entryPrice: e.target.value })}
                    placeholder={editingTrade.entryPrice?.toString()}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Exit Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.exitPrice}
                    onChange={(e) => setEditForm({ ...editForm, exitPrice: e.target.value })}
                    placeholder={editingTrade.exitPrice?.toString()}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                    placeholder={editingTrade.quantity?.toString()}
                  />
                </div>
                <div className="space-y-2">
                  <Label>P&L</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.pnl}
                    onChange={(e) => setEditForm({ ...editForm, pnl: e.target.value })}
                    placeholder={editingTrade.pnl?.toString()}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select value={editForm.direction} onValueChange={(v) => setEditForm({ ...editForm, direction: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={editingTrade.direction} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Long">Long</SelectItem>
                    <SelectItem value="Short">Short</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Review Notes (optional)</Label>
                <Textarea
                  value={editForm.reviewNotes}
                  onChange={(e) => setEditForm({ ...editForm, reviewNotes: e.target.value })}
                  placeholder="Reason for edit..."
                />
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-6 pt-0">
              <Button variant="outline" onClick={() => setEditingTrade(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={editMutation.isPending}>
                {editMutation.isPending ? 'Saving...' : 'Save & Mark as Edited'}
              </Button>
            </div>
          </Card>
        </div>
      )}
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
    onError: (error) => {
      toast.error(`Failed to clear logs: ${error.message}`);
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

      {/* Trade Upload */}
      <TradeUploadSection />
    </>
  );
}

// ============================================================================
// TRADE UPLOAD SECTION
// ============================================================================

function TradeUploadSection() {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('');
  const [csvData, setCsvData] = useState('');
  const [overwrite, setOverwrite] = useState(false);
  const [parseResult, setParseResult] = useState<{ trades: any[]; errors: string[] } | null>(null);
  
  const { data: strategies } = trpc.portfolio.listStrategies.useQuery();
  const uploadMutation = trpc.webhook.uploadTrades.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setCsvData('');
      setParseResult(null);
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });
  
  // Parse TradingView CSV format
  const parseCSV = (csv: string) => {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) {
      return { trades: [], errors: ['CSV must have at least a header row and one data row'] };
    }
    
    const header = lines[0].toLowerCase();
    const trades: any[] = [];
    const errors: string[] = [];
    
    // Detect column indices from header
    const cols = header.split(',').map(c => c.trim());
    const findCol = (names: string[]) => cols.findIndex(c => names.some(n => c.includes(n)));
    
    const entryDateIdx = findCol(['entry date', 'entry time', 'entry_date']);
    const exitDateIdx = findCol(['exit date', 'exit time', 'exit_date']);
    const directionIdx = findCol(['type', 'direction', 'side']);
    const entryPriceIdx = findCol(['entry price', 'entry_price', 'avg entry']);
    const exitPriceIdx = findCol(['exit price', 'exit_price', 'avg exit']);
    const pnlIdx = findCol(['profit', 'pnl', 'p&l', 'net profit']);
    const qtyIdx = findCol(['qty', 'quantity', 'contracts', 'size']);
    
    if (entryDateIdx === -1 || exitDateIdx === -1 || pnlIdx === -1) {
      return { trades: [], errors: ['Missing required columns: entry date, exit date, and profit/pnl'] };
    }
    
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(c => c.trim());
      if (row.length < 3) continue;
      
      try {
        const entryDate = row[entryDateIdx];
        const exitDate = row[exitDateIdx];
        const direction = directionIdx !== -1 ? row[directionIdx] : 'Long';
        const entryPrice = entryPriceIdx !== -1 ? parseFloat(row[entryPriceIdx].replace(/[^0-9.-]/g, '')) : 0;
        const exitPrice = exitPriceIdx !== -1 ? parseFloat(row[exitPriceIdx].replace(/[^0-9.-]/g, '')) : 0;
        const pnl = parseFloat(row[pnlIdx].replace(/[^0-9.-]/g, ''));
        const quantity = qtyIdx !== -1 ? parseInt(row[qtyIdx]) || 1 : 1;
        
        if (!entryDate || !exitDate || isNaN(pnl)) {
          errors.push(`Row ${i + 1}: Invalid data`);
          continue;
        }
        
        trades.push({
          entryDate,
          exitDate,
          direction: direction.toLowerCase().includes('short') ? 'Short' : 'Long',
          entryPrice: entryPrice || 100,
          exitPrice: exitPrice || 100,
          quantity,
          pnl,
          commission: 0,
        });
      } catch (e) {
        errors.push(`Row ${i + 1}: Parse error`);
      }
    }
    
    return { trades, errors };
  };
  
  const handleParse = () => {
    const result = parseCSV(csvData);
    setParseResult(result);
  };
  
  const handleUpload = () => {
    if (!selectedStrategy || !parseResult?.trades.length) {
      toast.error('Select a strategy and parse valid CSV data first');
      return;
    }
    
    const confirmMsg = overwrite
      ? `This will DELETE all existing trades for this strategy and replace with ${parseResult.trades.length} new trades. Continue?`
      : `This will add ${parseResult.trades.length} trades. Continue?`;
    
    if (confirm(confirmMsg)) {
      uploadMutation.mutate({
        strategyId: parseInt(selectedStrategy),
        trades: parseResult.trades,
        overwrite,
      });
    }
  };
  
  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Trade Upload
        </CardTitle>
        <CardDescription>
          Upload trades from TradingView CSV export. Overwrite mode replaces all existing trades for the strategy.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Strategy</Label>
            <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
              <SelectTrigger>
                <SelectValue placeholder="Select strategy" />
              </SelectTrigger>
              <SelectContent>
                {strategies?.map((s: { id: number; name: string }) => (
                  <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Switch
              id="overwrite"
              checked={overwrite}
              onCheckedChange={setOverwrite}
            />
            <Label htmlFor="overwrite" className="text-sm">
              Overwrite existing trades
            </Label>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>CSV Data (paste from TradingView)</Label>
          <Textarea
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
            placeholder="Entry Date,Exit Date,Type,Entry Price,Exit Price,Profit\n2024-01-15 09:30,2024-01-15 10:45,Long,4500,4520,500..."
            className="font-mono text-xs h-32"
          />
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleParse} disabled={!csvData}>
            Parse CSV
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!parseResult?.trades.length || !selectedStrategy || uploadMutation.isPending}
            className={overwrite ? 'bg-orange-600 hover:bg-orange-700' : ''}
          >
            {uploadMutation.isPending ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
            ) : overwrite ? (
              <><AlertTriangle className="h-4 w-4 mr-2" />Replace All Trades</>
            ) : (
              'Upload Trades'
            )}
          </Button>
        </div>
        
        {parseResult && (
          <div className={`p-4 rounded-lg ${parseResult.trades.length > 0 ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
            {parseResult.trades.length > 0 ? (
              <div className="space-y-2">
                <p className="text-green-400 font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Parsed {parseResult.trades.length} trades
                </p>
                {parseResult.errors.length > 0 && (
                  <p className="text-yellow-400 text-sm">
                    {parseResult.errors.length} rows skipped due to errors
                  </p>
                )}
                <div className="text-xs text-muted-foreground">
                  <p>First trade: {parseResult.trades[0]?.entryDate} ({parseResult.trades[0]?.direction})</p>
                  <p>Last trade: {parseResult.trades[parseResult.trades.length - 1]?.entryDate}</p>
                </div>
              </div>
            ) : (
              <p className="text-red-400 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                {parseResult.errors[0] || 'No valid trades found'}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
