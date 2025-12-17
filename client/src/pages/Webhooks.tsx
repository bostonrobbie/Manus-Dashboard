import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Copy, Check, RefreshCw, AlertCircle, CheckCircle2, Clock, XCircle, 
  AlertTriangle, Pause, Play, Trash2, Activity, Zap, Settings,
  Code, BookOpen, Shield
} from "lucide-react";
import { toast } from "sonner";

export default function Webhooks() {
  const [selectedStrategy, setSelectedStrategy] = useState<string>("");
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const { data: strategies } = trpc.portfolio.listStrategies.useQuery();
  const { data: webhookConfig } = trpc.webhook.getConfig.useQuery();
  const { data: logs, refetch: refetchLogs, isLoading: logsLoading } = trpc.webhook.getLogs.useQuery({ limit: 50 });
  const { data: status, refetch: refetchStatus } = trpc.webhook.getStatus.useQuery();
  
  const utils = trpc.useUtils();

  // Mutations for admin controls
  const pauseMutation = trpc.webhook.pause.useMutation({
    onSuccess: () => {
      toast.success("Webhook processing paused");
      refetchStatus();
    },
    onError: () => toast.error("Failed to pause processing"),
  });

  const resumeMutation = trpc.webhook.resume.useMutation({
    onSuccess: () => {
      toast.success("Webhook processing resumed");
      refetchStatus();
    },
    onError: () => toast.error("Failed to resume processing"),
  });

  const clearLogsMutation = trpc.webhook.clearLogs.useMutation({
    onSuccess: (data) => {
      toast.success(`Cleared ${data.deleted} webhook logs`);
      refetchLogs();
      refetchStatus();
    },
    onError: () => toast.error("Failed to clear logs"),
  });

  const deleteLogMutation = trpc.webhook.deleteLog.useMutation({
    onSuccess: () => {
      toast.success("Log entry deleted");
      refetchLogs();
      refetchStatus();
    },
    onError: () => toast.error("Failed to delete log"),
  });

  const deleteTradeMutation = trpc.webhook.deleteTrade.useMutation({
    onSuccess: () => {
      toast.success("Trade deleted");
      // Invalidate portfolio data to refresh charts
      utils.portfolio.overview.invalidate();
      utils.portfolio.listStrategies.invalidate();
    },
    onError: () => toast.error("Failed to delete trade"),
  });

  const copyToClipboard = async (text: string, type: "webhook" | "message") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "webhook") {
        setCopiedWebhook(true);
        setTimeout(() => setCopiedWebhook(false), 2000);
      } else {
        setCopiedMessage(true);
        setTimeout(() => setCopiedMessage(false), 2000);
      }
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const getStatusBadge = (logStatus: string) => {
    switch (logStatus) {
      case "success":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Success</Badge>;
      case "failed":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case "duplicate":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><AlertTriangle className="w-3 h-3 mr-1" />Duplicate</Badge>;
      case "processing":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Clock className="w-3 h-3 mr-1" />Processing</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatPnL = (pnl: number | null) => {
    if (pnl === null) return "-";
    const dollars = pnl / 100;
    return dollars >= 0 ? `+$${dollars.toFixed(2)}` : `-$${Math.abs(dollars).toFixed(2)}`;
  };

  // Generate the alert message template for the selected strategy (TradingView format)
  const getAlertMessage = () => {
    if (!selectedStrategy) return "";
    return JSON.stringify({
      symbol: selectedStrategy,
      date: "{{timenow}}",
      data: "{{strategy.order.action}}",
      quantity: 1,
      price: "{{close}}",
      token: "your_secret_token"
    }, null, 2);
  };

  // Generate entry/exit specific templates
  const getEntryTemplate = () => {
    if (!selectedStrategy) return "";
    return JSON.stringify({
      symbol: selectedStrategy,
      date: "{{timenow}}",
      data: "buy",
      quantity: 1,
      price: "{{close}}",
      direction: "Long",
      token: "your_secret_token"
    }, null, 2);
  };

  const getExitTemplate = () => {
    if (!selectedStrategy) return "";
    return JSON.stringify({
      symbol: selectedStrategy,
      date: "{{timenow}}",
      data: "exit",
      quantity: 1,
      price: "{{close}}",
      entryPrice: "{{strategy.order.price}}",
      entryTime: "{{strategy.order.time}}",
      pnl: "{{strategy.order.profit}}",
      token: "your_secret_token"
    }, null, 2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">TradingView Webhooks</h1>
          <p className="text-muted-foreground mt-1">
            Configure and monitor TradingView alert webhooks for automated trade ingestion
          </p>
        </div>
        
        {/* Status Badge */}
        <div className="flex items-center gap-4">
          {status?.isPaused ? (
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 px-3 py-1">
              <Pause className="w-4 h-4 mr-2" />
              Processing Paused
            </Badge>
          ) : (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-3 py-1">
              <Activity className="w-4 h-4 mr-2" />
              Active
            </Badge>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      {status && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{status.stats.total}</div>
              <div className="text-xs text-muted-foreground">Total Webhooks</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-400">{status.stats.success}</div>
              <div className="text-xs text-muted-foreground">Successful</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-400">{status.stats.failed}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-400">{status.stats.duplicate}</div>
              <div className="text-xs text-muted-foreground">Duplicates</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-border/50">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{status.avgProcessingTimeMs}ms</div>
              <div className="text-xs text-muted-foreground">Avg Processing</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Admin Controls */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="w-5 h-5" />
            Admin Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {status?.isPaused ? (
              <Button 
                variant="outline" 
                onClick={() => resumeMutation.mutate()}
                disabled={resumeMutation.isPending}
                className="border-green-500/30 text-green-400 hover:bg-green-500/10"
              >
                <Play className="w-4 h-4 mr-2" />
                Resume Processing
              </Button>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => pauseMutation.mutate()}
                disabled={pauseMutation.isPending}
                className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause Processing
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={() => {
                if (confirm("Are you sure you want to clear all webhook logs? This cannot be undone.")) {
                  clearLogsMutation.mutate();
                }
              }}
              disabled={clearLogsMutation.isPending}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Logs
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => {
                refetchLogs();
                refetchStatus();
              }}
              disabled={logsLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${logsLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions Tabs */}
      <Tabs defaultValue="setup" className="space-y-4">
        <TabsList>
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Quick Setup
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Code className="w-4 h-4" />
            Message Templates
          </TabsTrigger>
          <TabsTrigger value="guide" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Setup Guide
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Webhook URL Card */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-400" />
                  Webhook URL
                </CardTitle>
                <CardDescription>
                  Copy this URL into your TradingView alert's webhook URL field
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <code className="flex-1 bg-background/50 border border-border rounded-md p-3 text-sm font-mono break-all">
                    {webhookConfig?.webhookUrl || "Loading..."}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(webhookConfig?.webhookUrl || "", "webhook")}
                    disabled={!webhookConfig?.webhookUrl}
                  >
                    {copiedWebhook ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Strategy Selector */}
            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="w-5 h-5 text-blue-400" />
                  Alert Message
                </CardTitle>
                <CardDescription>
                  Select a strategy to generate the JSON message template
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    {strategies?.map((s: { id: number; symbol: string; name: string }) => (
                      <SelectItem key={s.id} value={s.symbol}>
                        {s.name} ({s.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedStrategy && (
                  <div className="flex gap-2">
                    <pre className="flex-1 bg-background/50 border border-border rounded-md p-3 text-xs font-mono overflow-x-auto max-h-48">
                      {getAlertMessage()}
                    </pre>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(getAlertMessage(), "message")}
                    >
                      {copiedMessage ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>TradingView Message Templates</CardTitle>
              <CardDescription>
                Use these JSON templates in your TradingView alert message field. Replace placeholders with TradingView variables.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="mb-4">
                <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    {strategies?.map((s: { id: number; symbol: string; name: string }) => (
                      <SelectItem key={s.id} value={s.symbol}>
                        {s.name} ({s.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedStrategy && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Entry Template */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-green-400">Entry Signal Template</h4>
                    <p className="text-xs text-muted-foreground">Use this when opening a new position</p>
                    <pre className="bg-background/50 border border-border rounded-md p-3 text-xs font-mono overflow-x-auto">
                      {getEntryTemplate()}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(getEntryTemplate(), "message")}
                    >
                      <Copy className="w-3 h-3 mr-2" />
                      Copy Entry Template
                    </Button>
                  </div>

                  {/* Exit Template */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-red-400">Exit Signal Template</h4>
                    <p className="text-xs text-muted-foreground">Use this when closing a position</p>
                    <pre className="bg-background/50 border border-border rounded-md p-3 text-xs font-mono overflow-x-auto">
                      {getExitTemplate()}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(getExitTemplate(), "message")}
                    >
                      <Copy className="w-3 h-3 mr-2" />
                      Copy Exit Template
                    </Button>
                  </div>
                </div>
              )}

              {/* TradingView Variables Reference */}
              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-3">TradingView Placeholder Variables</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div><code className="text-blue-400">{"{{timenow}}"}</code> - Current timestamp</div>
                  <div><code className="text-blue-400">{"{{close}}"}</code> - Current close price</div>
                  <div><code className="text-blue-400">{"{{strategy.order.action}}"}</code> - buy/sell/exit</div>
                  <div><code className="text-blue-400">{"{{strategy.order.price}}"}</code> - Order price</div>
                  <div><code className="text-blue-400">{"{{strategy.order.profit}}"}</code> - Trade P&L</div>
                  <div><code className="text-blue-400">{"{{strategy.order.comment}}"}</code> - Order comment</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guide">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Setup Guide</CardTitle>
              <CardDescription>Follow these steps to configure TradingView alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-4 text-sm text-muted-foreground">
                <li className="pl-2">
                  <span className="font-medium text-foreground">Open your TradingView chart</span>
                  <p className="mt-1 ml-6">Navigate to the chart with the strategy you want to track</p>
                </li>
                <li className="pl-2">
                  <span className="font-medium text-foreground">Create a new alert</span>
                  <p className="mt-1 ml-6">Click the "Alerts" icon in the right sidebar and click "Create Alert"</p>
                </li>
                <li className="pl-2">
                  <span className="font-medium text-foreground">Configure the condition</span>
                  <p className="mt-1 ml-6">Set the condition to trigger on your strategy's order fill events</p>
                </li>
                <li className="pl-2">
                  <span className="font-medium text-foreground">Add the webhook URL</span>
                  <p className="mt-1 ml-6">In the "Notifications" tab, enable "Webhook URL" and paste the URL from above</p>
                </li>
                <li className="pl-2">
                  <span className="font-medium text-foreground">Add the message template</span>
                  <p className="mt-1 ml-6">In the "Message" field, paste the JSON template for your strategy</p>
                </li>
                <li className="pl-2">
                  <span className="font-medium text-foreground">Create separate alerts for entry and exit</span>
                  <p className="mt-1 ml-6">For best results, create one alert for entries and another for exits</p>
                </li>
                <li className="pl-2">
                  <span className="font-medium text-foreground">Save and test</span>
                  <p className="mt-1 ml-6">Save the alert and monitor the activity log below to verify it's working</p>
                </li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Best Practices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <h4 className="font-medium mb-1">Authentication Token</h4>
                  <p className="text-muted-foreground">
                    Add a secret token to your webhook messages. Set the <code className="text-blue-400">TRADINGVIEW_WEBHOOK_TOKEN</code> environment variable to enable token validation.
                  </p>
                </div>
                
                <div className="p-3 bg-muted/30 rounded-lg">
                  <h4 className="font-medium mb-1">TradingView IP Allowlist</h4>
                  <p className="text-muted-foreground mb-2">
                    TradingView sends webhooks from these IP addresses:
                  </p>
                  <code className="text-xs">52.89.214.238, 34.212.75.30, 54.218.53.128, 52.32.178.7</code>
                </div>
                
                <div className="p-3 bg-muted/30 rounded-lg">
                  <h4 className="font-medium mb-1">Duplicate Detection</h4>
                  <p className="text-muted-foreground">
                    The system automatically detects and rejects duplicate trades based on strategy, entry/exit times, and direction.
                  </p>
                </div>
                
                <div className="p-3 bg-muted/30 rounded-lg">
                  <h4 className="font-medium mb-1">Pause Processing</h4>
                  <p className="text-muted-foreground">
                    Use the "Pause Processing" button above to temporarily stop accepting new webhooks during maintenance or testing.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Webhook Logs */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Webhook Activity Log</CardTitle>
            <CardDescription>Recent webhook notifications and their processing status</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchLogs()} disabled={logsLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${logsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {!logs || logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No webhook activity yet</p>
              <p className="text-sm mt-1">Webhooks will appear here once TradingView sends notifications</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Time</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Strategy</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Direction</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">P&L</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Processing</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Error</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: { 
                    id: number; 
                    createdAt: Date; 
                    status: string; 
                    strategySymbol: string | null; 
                    direction: string | null; 
                    pnl: number | null; 
                    processingTimeMs: number | null; 
                    errorMessage: string | null;
                    tradeId: number | null;
                  }) => (
                    <tr key={log.id} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="py-3 px-2 text-muted-foreground">{formatDate(log.createdAt)}</td>
                      <td className="py-3 px-2">{getStatusBadge(log.status)}</td>
                      <td className="py-3 px-2 font-medium">{log.strategySymbol || "-"}</td>
                      <td className="py-3 px-2">
                        {log.direction ? (
                          <Badge variant="outline" className={log.direction === "Long" ? "text-green-400 border-green-500/30" : "text-red-400 border-red-500/30"}>
                            {log.direction}
                          </Badge>
                        ) : "-"}
                      </td>
                      <td className={`py-3 px-2 text-right font-mono ${log.pnl && log.pnl >= 0 ? "text-green-400" : log.pnl ? "text-red-400" : ""}`}>
                        {formatPnL(log.pnl)}
                      </td>
                      <td className="py-3 px-2 text-right text-muted-foreground">
                        {log.processingTimeMs ? `${log.processingTimeMs}ms` : "-"}
                      </td>
                      <td className="py-3 px-2 text-red-400 text-xs max-w-[200px] truncate" title={log.errorMessage || ""}>
                        {log.errorMessage || "-"}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-red-400"
                            onClick={() => {
                              if (confirm("Delete this log entry?")) {
                                deleteLogMutation.mutate({ logId: log.id });
                              }
                            }}
                            title="Delete log"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                          {log.tradeId && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-red-400"
                              onClick={() => {
                                if (confirm("Delete the associated trade? This will affect your portfolio statistics.")) {
                                  deleteTradeMutation.mutate({ tradeId: log.tradeId! });
                                }
                              }}
                              title="Delete associated trade"
                            >
                              <XCircle className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
