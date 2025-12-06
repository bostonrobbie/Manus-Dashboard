import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { Loader2 } from "lucide-react";

interface Trade {
  entryDate: Date;
  exitDate: Date;
  pnl: number;
}

interface MonteCarloSimulationProps {
  trades: Trade[];
  startingCapital: number;
}

interface SimulationResult {
  paths: number[][];
  percentiles: {
    p5: number[];
    p25: number[];
    p50: number[];
    p75: number[];
    p95: number[];
  };
  finalValues: number[];
  stats: {
    meanFinal: number;
    medianFinal: number;
    stdDevFinal: number;
    probProfit: number;
    probRuin: number;
    worstCase: number;
    bestCase: number;
  };
}

function runMonteCarloSimulation(
  trades: Trade[],
  startingCapital: number,
  numSimulations: number = 1000
): SimulationResult {
  const returns = trades.map(t => t.pnl / startingCapital);
  const numTrades = trades.length;
  
  const paths: number[][] = [];
  const finalValues: number[] = [];
  
  // Run simulations
  for (let sim = 0; sim < numSimulations; sim++) {
    const path: number[] = [startingCapital];
    let equity = startingCapital;
    
    // Randomly sample returns with replacement
    for (let i = 0; i < numTrades; i++) {
      const randomIndex = Math.floor(Math.random() * returns.length);
      const randomReturn = returns[randomIndex]!;
      equity += randomReturn * startingCapital;
      path.push(equity);
    }
    
    paths.push(path);
    finalValues.push(equity);
  }
  
  // Calculate percentiles at each step
  const percentiles = {
    p5: [] as number[],
    p25: [] as number[],
    p50: [] as number[],
    p75: [] as number[],
    p95: [] as number[],
  };
  
  for (let step = 0; step <= numTrades; step++) {
    const values = paths.map(p => p[step]!).sort((a, b) => a - b);
    percentiles.p5.push(values[Math.floor(numSimulations * 0.05)]!);
    percentiles.p25.push(values[Math.floor(numSimulations * 0.25)]!);
    percentiles.p50.push(values[Math.floor(numSimulations * 0.50)]!);
    percentiles.p75.push(values[Math.floor(numSimulations * 0.75)]!);
    percentiles.p95.push(values[Math.floor(numSimulations * 0.95)]!);
  }
  
  // Calculate statistics
  const sortedFinals = [...finalValues].sort((a, b) => a - b);
  const meanFinal = finalValues.reduce((sum, v) => sum + v, 0) / numSimulations;
  const medianFinal = sortedFinals[Math.floor(numSimulations / 2)]!;
  const variance = finalValues.reduce((sum, v) => sum + Math.pow(v - meanFinal, 2), 0) / numSimulations;
  const stdDevFinal = Math.sqrt(variance);
  const probProfit = finalValues.filter(v => v > startingCapital).length / numSimulations;
  const probRuin = finalValues.filter(v => v < startingCapital * 0.5).length / numSimulations;
  const worstCase = sortedFinals[0]!;
  const bestCase = sortedFinals[numSimulations - 1]!;
  
  return {
    paths,
    percentiles,
    finalValues,
    stats: {
      meanFinal,
      medianFinal,
      stdDevFinal,
      probProfit,
      probRuin,
      worstCase,
      bestCase,
    },
  };
}

export default function MonteCarloSimulation({ trades, startingCapital }: MonteCarloSimulationProps) {
  const [numSimulations, setNumSimulations] = useState(1000);
  const [isRunning, setIsRunning] = useState(false);
  
  const simulationResult = useMemo(() => {
    if (trades.length === 0) return null;
    setIsRunning(true);
    const result = runMonteCarloSimulation(trades, startingCapital, numSimulations);
    setIsRunning(false);
    return result;
  }, [trades, startingCapital, numSimulations]);
  
  if (trades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monte Carlo Simulation</CardTitle>
          <CardDescription>Insufficient trade data for simulation</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  const chartData = simulationResult?.percentiles.p50.map((_, index) => ({
    trade: index,
    p5: simulationResult.percentiles.p5[index],
    p25: simulationResult.percentiles.p25[index],
    p50: simulationResult.percentiles.p50[index],
    p75: simulationResult.percentiles.p75[index],
    p95: simulationResult.percentiles.p95[index],
  })) || [];
  
  // Sample data for performance (show every Nth point)
  const sampleInterval = Math.max(1, Math.floor(chartData.length / 200));
  const sampledData = chartData.filter((_, i) => i % sampleInterval === 0);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monte Carlo Simulation</CardTitle>
        <CardDescription>
          Probabilistic analysis of portfolio outcomes based on historical trade distribution
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <Label htmlFor="numSims">Number of Simulations</Label>
            <Input
              id="numSims"
              type="number"
              min={100}
              max={10000}
              step={100}
              value={numSimulations}
              onChange={(e) => setNumSimulations(Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <Button 
            onClick={() => setNumSimulations(prev => prev)} 
            disabled={isRunning}
          >
            {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Run Simulation
          </Button>
        </div>
        
        {/* Statistics Grid */}
        {simulationResult && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/30 rounded-lg p-4 border">
              <div className="text-xs text-muted-foreground mb-1">Mean Final Value</div>
              <div className="text-lg font-bold">
                ${simulationResult.stats.meanFinal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 border">
              <div className="text-xs text-muted-foreground mb-1">Median Final Value</div>
              <div className="text-lg font-bold">
                ${simulationResult.stats.medianFinal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
              <div className="text-xs text-muted-foreground mb-1">Probability of Profit</div>
              <div className="text-lg font-bold text-green-600">
                {(simulationResult.stats.probProfit * 100).toFixed(1)}%
              </div>
            </div>
            <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
              <div className="text-xs text-muted-foreground mb-1">Risk of Ruin (50% loss)</div>
              <div className="text-lg font-bold text-red-600">
                {(simulationResult.stats.probRuin * 100).toFixed(1)}%
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 border">
              <div className="text-xs text-muted-foreground mb-1">Best Case (95th %ile)</div>
              <div className="text-lg font-bold text-green-600">
                ${simulationResult.stats.bestCase.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 border">
              <div className="text-xs text-muted-foreground mb-1">Worst Case (5th %ile)</div>
              <div className="text-lg font-bold text-red-600">
                ${simulationResult.stats.worstCase.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 border">
              <div className="text-xs text-muted-foreground mb-1">Std Deviation</div>
              <div className="text-lg font-bold">
                ${simulationResult.stats.stdDevFinal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 border">
              <div className="text-xs text-muted-foreground mb-1">Simulations Run</div>
              <div className="text-lg font-bold">
                {numSimulations.toLocaleString()}
              </div>
            </div>
          </div>
        )}
        
        {/* Chart */}
        {simulationResult && (
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sampledData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.1} />
                <XAxis
                  dataKey="trade"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Trade Number', position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  label={{ value: 'Portfolio Value', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="p95"
                  stackId="1"
                  stroke="hsl(var(--chart-1))"
                  fill="hsl(var(--chart-1))"
                  fillOpacity={0.1}
                  name="95th Percentile"
                />
                <Area
                  type="monotone"
                  dataKey="p75"
                  stackId="2"
                  stroke="hsl(var(--chart-2))"
                  fill="hsl(var(--chart-2))"
                  fillOpacity={0.2}
                  name="75th Percentile"
                />
                <Line
                  type="monotone"
                  dataKey="p50"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  dot={false}
                  name="Median (50th)"
                />
                <Area
                  type="monotone"
                  dataKey="p25"
                  stackId="3"
                  stroke="hsl(var(--chart-3))"
                  fill="hsl(var(--chart-3))"
                  fillOpacity={0.2}
                  name="25th Percentile"
                />
                <Area
                  type="monotone"
                  dataKey="p5"
                  stackId="4"
                  stroke="hsl(var(--chart-4))"
                  fill="hsl(var(--chart-4))"
                  fillOpacity={0.1}
                  name="5th Percentile"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        
        <div className="text-sm text-muted-foreground">
          <p className="font-semibold mb-2">How to interpret:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>The median line (50th percentile) shows the most likely outcome</li>
            <li>The shaded areas represent the range of possible outcomes</li>
            <li>Wider bands indicate higher uncertainty in future performance</li>
            <li>This simulation assumes trade outcomes are independent and identically distributed</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
