import { useState } from "react";
import type { PaperOrderResult } from "../../../server/paperTradingService";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  RefreshCw,
  Play,
  AlertTriangle,
  Clock,
  Target,
} from "lucide-react";

export default function PaperTrading() {
  const [symbol, setSymbol] = useState("ES");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [quantity, setQuantity] = useState(1);
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP">(
    "MARKET"
  );
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");

  const {
    data: account,
    isLoading: accountLoading,
    refetch: refetchAccount,
  } = trpc.paperTrading.getAccount.useQuery();
  const {
    data: positions,
    isLoading: positionsLoading,
    refetch: refetchPositions,
  } = trpc.paperTrading.getPositions.useQuery();
  const {
    data: tradeHistory,
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = trpc.paperTrading.getTradeHistory.useQuery({ limit: 20 });

  const executeTrade = trpc.paperTrading.executeTrade.useMutation({
    onSuccess: (result: PaperOrderResult) => {
      if (result.success) {
        toast.success(result.message || "Trade executed successfully");
        refetchAccount();
        refetchPositions();
        refetchHistory();
      } else {
        toast.error(result.error || "Trade failed");
      }
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  const resetAccount = trpc.paperTrading.resetAccount.useMutation({
    onSuccess: () => {
      toast.success("Paper trading account reset to $100,000");
      refetchAccount();
      refetchPositions();
      refetchHistory();
    },
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeTrade.mutate({
      symbol,
      side,
      quantity,
      orderType,
      limitPrice: limitPrice ? parseFloat(limitPrice) * 100 : undefined,
      stopPrice: stopPrice ? parseFloat(stopPrice) * 100 : undefined,
    });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Paper Trading</h1>
            <p className="text-muted-foreground mt-1">
              Practice trading with $100,000 virtual capital - no risk, real
              learning
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                refetchAccount();
                refetchPositions();
                refetchHistory();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (
                  confirm(
                    "Are you sure you want to reset your paper trading account? This will close all positions and reset your balance to $100,000."
                  )
                ) {
                  resetAccount.mutate();
                }
              }}
            >
              Reset Account
            </Button>
          </div>
        </div>

        {/* Account Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Account Balance
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {accountLoading ? "..." : formatCurrency(account?.balance || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Starting: {formatCurrency(10000000)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
              {(account?.realizedPnl || 0) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${(account?.realizedPnl || 0) >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                {accountLoading
                  ? "..."
                  : formatCurrency(account?.realizedPnl || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatPercent(((account?.realizedPnl || 0) / 10000000) * 100)}{" "}
                return
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {accountLoading
                  ? "..."
                  : `${(account?.winRate || 0).toFixed(1)}%`}
              </div>
              <p className="text-xs text-muted-foreground">
                {account?.totalTrades || 0} total trades
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Open Positions
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {positionsLoading ? "..." : positions?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Unrealized P&L: {formatCurrency(account?.unrealizedPnl || 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Entry */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Place Order
              </CardTitle>
              <CardDescription>
                Execute paper trades to test your strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="symbol">Symbol</Label>
                  <Select value={symbol} onValueChange={setSymbol}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select symbol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ES">ES (E-mini S&P 500)</SelectItem>
                      <SelectItem value="NQ">NQ (E-mini Nasdaq)</SelectItem>
                      <SelectItem value="CL">CL (Crude Oil)</SelectItem>
                      <SelectItem value="GC">GC (Gold)</SelectItem>
                      <SelectItem value="YM">YM (E-mini Dow)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Side</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={side === "BUY" ? "default" : "outline"}
                      className={
                        side === "BUY"
                          ? "bg-green-600 hover:bg-green-700 flex-1"
                          : "flex-1"
                      }
                      onClick={() => setSide("BUY")}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Buy
                    </Button>
                    <Button
                      type="button"
                      variant={side === "SELL" ? "default" : "outline"}
                      className={
                        side === "SELL"
                          ? "bg-red-600 hover:bg-red-700 flex-1"
                          : "flex-1"
                      }
                      onClick={() => setSide("SELL")}
                    >
                      <TrendingDown className="h-4 w-4 mr-2" />
                      Sell
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orderType">Order Type</Label>
                  <Select
                    value={orderType}
                    onValueChange={v =>
                      setOrderType(v as "MARKET" | "LIMIT" | "STOP")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select order type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MARKET">Market</SelectItem>
                      <SelectItem value="LIMIT">Limit</SelectItem>
                      <SelectItem value="STOP">Stop</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {orderType === "LIMIT" && (
                  <div className="space-y-2">
                    <Label htmlFor="limitPrice">Limit Price ($)</Label>
                    <Input
                      id="limitPrice"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 5000.00"
                      value={limitPrice}
                      onChange={e => setLimitPrice(e.target.value)}
                    />
                  </div>
                )}

                {orderType === "STOP" && (
                  <div className="space-y-2">
                    <Label htmlFor="stopPrice">Stop Price ($)</Label>
                    <Input
                      id="stopPrice"
                      type="number"
                      step="0.01"
                      placeholder="e.g., 4950.00"
                      value={stopPrice}
                      onChange={e => setStopPrice(e.target.value)}
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  className={`w-full ${side === "BUY" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
                  disabled={executeTrade.isPending}
                >
                  {executeTrade.isPending
                    ? "Executing..."
                    : `${side} ${quantity} ${symbol}`}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Positions & History */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Positions & History</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="positions">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="positions">
                    Open Positions ({positions?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="history">Trade History</TabsTrigger>
                </TabsList>

                <TabsContent value="positions" className="mt-4">
                  {positionsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading...
                    </div>
                  ) : positions?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No open positions</p>
                      <p className="text-sm">Place a trade to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {positions?.map((position: any) => (
                        <div
                          key={position.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center gap-4">
                            <Badge
                              variant={
                                position.side === "LONG"
                                  ? "default"
                                  : "destructive"
                              }
                            >
                              {position.side}
                            </Badge>
                            <div>
                              <p className="font-medium">{position.symbol}</p>
                              <p className="text-sm text-muted-foreground">
                                {position.quantity} contracts @{" "}
                                {formatCurrency(position.entryPrice)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={`font-medium ${(position.unrealizedPnl || 0) >= 0 ? "text-green-500" : "text-red-500"}`}
                            >
                              {formatCurrency(position.unrealizedPnl || 0)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(
                                position.entryDate
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  {historyLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading...
                    </div>
                  ) : tradeHistory?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No trade history</p>
                      <p className="text-sm">
                        Your executed trades will appear here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tradeHistory?.map((trade: any) => (
                        <div
                          key={trade.id}
                          className="flex items-center justify-between p-3 border rounded-lg text-sm"
                        >
                          <div className="flex items-center gap-3">
                            {trade.side === "BUY" ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                            <div>
                              <p className="font-medium">
                                {trade.side} {trade.quantity} {trade.symbol}
                              </p>
                              <p className="text-muted-foreground">
                                @ {formatCurrency(trade.price)} •{" "}
                                {trade.orderType}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {(trade.pnl ?? 0) !== 0 && (
                              <p
                                className={`font-medium ${(trade.pnl ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`}
                              >
                                {formatCurrency(trade.pnl ?? 0)}
                              </p>
                            )}
                            <p className="text-muted-foreground">
                              {new Date(trade.executedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Info Banner */}
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="flex items-start gap-4 pt-6">
            <AlertTriangle className="h-6 w-6 text-blue-500 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-500">
                Paper Trading Mode
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                This is a simulated trading environment. No real money is at
                risk. Use this to test your strategies before connecting a live
                broker. Market prices are simulated and may not reflect actual
                market conditions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
