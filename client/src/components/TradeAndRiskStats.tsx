import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface TradeStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  medianTradePnL: number;
  bestTradePnL: number;
  worstTradePnL: number;
  expectancyPnL: number;
  expectancyPct: number | null;
  averageHoldingTimeMinutes: number | null;
  medianHoldingTimeMinutes: number | null;
  longestWinStreak: number | null;
  longestLossStreak: number | null;
}

interface TradeAndRiskStatsProps {
  tradeStats: TradeStats;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatHoldingTime(minutes: number | null): string {
  if (minutes === null) return 'N/A';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function TradeAndRiskStats({ tradeStats }: TradeAndRiskStatsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade & Risk Statistics</CardTitle>
        <CardDescription>Comprehensive trading performance metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Totals & Core Metrics */}
          <div className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Total Trades</div>
              <div className="text-2xl font-bold">{tradeStats.totalTrades}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {tradeStats.winningTrades}W / {tradeStats.losingTrades}L
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Win Rate</div>
              <div className="text-2xl font-bold">{tradeStats.winRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground mt-1">
                Percentage of winning trades
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Profit Factor</div>
              <div className="text-2xl font-bold">{tradeStats.profitFactor.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Gross profit / Gross loss
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">Expectancy ($/trade)</div>
              <div className={`text-2xl font-bold ${tradeStats.expectancyPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(tradeStats.expectancyPnL)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Average P&L per trade
              </div>
            </div>
          </div>

          {/* Right Column: Distribution Highlights */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Average Trade</div>
                <div className={`text-lg font-semibold ${((tradeStats.avgWin * tradeStats.winningTrades - tradeStats.avgLoss * tradeStats.losingTrades) / tradeStats.totalTrades) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency((tradeStats.avgWin * tradeStats.winningTrades - tradeStats.avgLoss * tradeStats.losingTrades) / tradeStats.totalTrades)}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Median Trade</div>
                <div className={`text-lg font-semibold ${tradeStats.medianTradePnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(tradeStats.medianTradePnL)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Best Trade</div>
                <div className="text-lg font-semibold text-green-600">
                  {formatCurrency(tradeStats.bestTradePnL)}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Worst Trade</div>
                <div className="text-lg font-semibold text-red-600">
                  {formatCurrency(tradeStats.worstTradePnL)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Longest Win Streak</div>
                <div className="text-lg font-semibold text-green-600">
                  {tradeStats.longestWinStreak ?? 'N/A'}
                </div>
              </div>

              <div>
                <div className="text-sm text-muted-foreground">Longest Loss Streak</div>
                <div className="text-lg font-semibold text-red-600">
                  {tradeStats.longestLossStreak ?? 'N/A'}
                </div>
              </div>
            </div>

            {(tradeStats.averageHoldingTimeMinutes !== null || tradeStats.medianHoldingTimeMinutes !== null) && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <div className="text-sm text-muted-foreground">Avg Hold Time</div>
                  <div className="text-lg font-semibold">
                    {formatHoldingTime(tradeStats.averageHoldingTimeMinutes)}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground">Median Hold Time</div>
                  <div className="text-lg font-semibold">
                    {formatHoldingTime(tradeStats.medianHoldingTimeMinutes)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
