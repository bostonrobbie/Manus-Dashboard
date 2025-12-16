import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Check, RefreshCw, AlertCircle, CheckCircle2, Clock, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function Webhooks() {
  const [selectedStrategy, setSelectedStrategy] = useState<string>("");
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const { data: strategies } = trpc.portfolio.listStrategies.useQuery();
  const { data: webhookConfig } = trpc.webhook.getConfig.useQuery();
  const { data: logs, refetch: refetchLogs, isLoading: logsLoading } = trpc.webhook.getLogs.useQuery({ limit: 50 });

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

  const getStatusBadge = (status: string) => {
    switch (status) {
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

  // Generate the alert message template for the selected strategy
  const getAlertMessage = () => {
    if (!selectedStrategy) return "";
    return JSON.stringify({
      strategy: selectedStrategy,
      action: "{{strategy.order.action}}",
      direction: "{{strategy.order.comment}}",
      entryPrice: "{{strategy.order.price}}",
      exitPrice: "{{close}}",
      entryTime: "{{timenow}}",
      exitTime: "{{timenow}}",
      quantity: 1,
      pnl: "{{strategy.order.profit}}"
    }, null, 2);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">TradingView Webhooks</h1>
        <p className="text-muted-foreground mt-1">
          Configure and monitor TradingView alert webhooks for automated trade ingestion
        </p>
      </div>

      {/* Setup Instructions */}
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

        {/* Alert Message Template Card */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-400" />
              Alert Message Template
            </CardTitle>
            <CardDescription>
              Select a strategy and copy this JSON into your TradingView alert's message field
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

      {/* Setup Guide */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Setup Guide</CardTitle>
          <CardDescription>Follow these steps to configure TradingView alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
            <li>Open your TradingView chart with the strategy you want to track</li>
            <li>Click on the "Alerts" icon in the right sidebar and create a new alert</li>
            <li>Set the condition to trigger on your strategy's order fill events</li>
            <li>In the "Webhook URL" field, paste the webhook URL from above</li>
            <li>In the "Message" field, paste the JSON template for your strategy (select strategy above)</li>
            <li>Make sure to use the correct strategy symbol that matches your dashboard</li>
            <li>Save the alert and it will automatically send trade data to your dashboard</li>
          </ol>
        </CardContent>
      </Card>

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
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: { id: number; createdAt: Date; status: string; strategySymbol: string | null; direction: string | null; pnl: number | null; processingTimeMs: number | null; errorMessage: string | null }) => (
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
