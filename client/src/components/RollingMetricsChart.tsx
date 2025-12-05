import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useState } from "react";

interface RollingMetricsData {
  window: number;
  data: Array<{
    date: Date;
    sharpe: number | null;
    sortino: number | null;
    maxDrawdown: number | null;
  }>;
}

interface RollingMetricsChartProps {
  rollingMetrics: RollingMetricsData[];
}

export function RollingMetricsChart({ rollingMetrics }: RollingMetricsChartProps) {
  const [selectedWindow, setSelectedWindow] = useState<number>(90);

  const selectedData = rollingMetrics.find(rm => rm.window === selectedWindow);

  if (!selectedData || selectedData.data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rolling Performance Metrics</CardTitle>
          <CardDescription>Track performance stability over time</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  // Format data for charts
  const chartData = selectedData.data.map(d => ({
    date: d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
    sharpe: d.sharpe,
    sortino: d.sortino,
    maxDrawdown: d.maxDrawdown,
  }));

  // Sample data for better performance (show every Nth point)
  const sampleRate = Math.max(1, Math.floor(chartData.length / 100));
  const sampledData = chartData.filter((_, i) => i % sampleRate === 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rolling Performance Metrics</CardTitle>
        <CardDescription>
          {selectedWindow}-day rolling window showing Sharpe and Sortino ratio trends
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={String(selectedWindow)} onValueChange={(v) => setSelectedWindow(Number(v))}>
          <TabsList className="mb-4">
            <TabsTrigger value="30">30 Days</TabsTrigger>
            <TabsTrigger value="90">90 Days</TabsTrigger>
            <TabsTrigger value="365">365 Days</TabsTrigger>
          </TabsList>

          <TabsContent value={String(selectedWindow)} className="space-y-6">
            {/* Sharpe Ratio Chart */}
            <div>
              <h4 className="text-sm font-medium mb-2">Rolling Sharpe Ratio</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={sampledData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }}
                    stroke="#9CA3AF"
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    stroke="#9CA3AF"
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    formatter={(value: number) => value?.toFixed(2) ?? 'N/A'}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sharpe" 
                    stroke="#60a5fa" 
                    strokeWidth={2}
                    dot={false}
                    name="Sharpe Ratio"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Sortino Ratio Chart */}
            <div>
              <h4 className="text-sm font-medium mb-2">Rolling Sortino Ratio</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={sampledData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }}
                    stroke="#9CA3AF"
                  />
                  <YAxis 
                    tick={{ fontSize: 11 }}
                    stroke="#9CA3AF"
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                    formatter={(value: number) => value?.toFixed(2) ?? 'N/A'}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sortino" 
                    stroke="#34d399" 
                    strokeWidth={2}
                    dot={false}
                    name="Sortino Ratio"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="text-xs text-muted-foreground mt-4">
              <p><strong>Interpretation:</strong></p>
              <ul className="list-disc list-inside space-y-1 mt-2">
                <li><strong>Sharpe Ratio:</strong> Risk-adjusted return. Higher is better. &gt;1 is good, &gt;2 is excellent.</li>
                <li><strong>Sortino Ratio:</strong> Like Sharpe but only penalizes downside volatility. Higher is better.</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
