import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DistributionBucket {
  from: number;
  to: number;
  count: number;
  percentage: number;
}

interface DailyReturnsDistribution {
  buckets: DistributionBucket[];
  skewness: number;
  kurtosis: number;
  pctGt1pct: number;
  pctLtMinus1pct: number;
  mean: number;
  stdDev: number;
  totalDays: number;
}

interface DistributionSnapshotProps {
  distribution: DailyReturnsDistribution;
}

export function DistributionSnapshot({ distribution }: DistributionSnapshotProps) {
  if (!distribution || distribution.buckets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Daily Returns Distribution</CardTitle>
          <CardDescription>Histogram of daily percentage returns</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No distribution data available</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for chart
  const chartData = distribution.buckets.map(bucket => ({
    range: `${bucket.from.toFixed(1)}%`,
    percentage: bucket.percentage,
    count: bucket.count,
    from: bucket.from,
    to: bucket.to,
  }));

  // Color buckets based on return range
  const getBarColor = (from: number) => {
    if (from >= 1) return 'hsl(142, 76%, 36%)'; // Strong green for >1%
    if (from >= 0) return 'hsl(142, 76%, 56%)'; // Light green for positive
    if (from >= -1) return 'hsl(0, 84%, 66%)'; // Light red for small negative
    return 'hsl(0, 84%, 46%)'; // Strong red for <-1%
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Returns Distribution</CardTitle>
        <CardDescription>
          Histogram of {distribution.totalDays.toLocaleString()} trading days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="md:col-span-2">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <XAxis 
                  dataKey="range" 
                  tick={{ fontSize: 11 }}
                  interval={1}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  label={{ value: '% of Days', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]!.payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold text-sm">
                            {data.from.toFixed(1)}% to {data.to.toFixed(1)}%
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {data.count} days ({data.percentage.toFixed(1)}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.from)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Statistics */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">Distribution Stats</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mean:</span>
                  <span className="font-medium">{distribution.mean.toFixed(3)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Std Dev:</span>
                  <span className="font-medium">{distribution.stdDev.toFixed(3)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Skewness:</span>
                  <span className="font-medium">{distribution.skewness.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kurtosis:</span>
                  <span className="font-medium">{distribution.kurtosis.toFixed(3)}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">Tail Analysis</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Days &gt; +1%:</span>
                  <span className="font-medium text-green-600">{distribution.pctGt1pct.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Days &lt; -1%:</span>
                  <span className="font-medium text-red-600">{distribution.pctLtMinus1pct.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground pt-2 border-t">
              <p>
                <strong>Skewness:</strong> {distribution.skewness > 0 ? 'Positive' : distribution.skewness < 0 ? 'Negative' : 'Symmetric'} 
                {distribution.skewness > 0 && ' (more extreme gains)'}
                {distribution.skewness < 0 && ' (more extreme losses)'}
              </p>
              <p className="mt-1">
                <strong>Kurtosis:</strong> {distribution.kurtosis > 0 ? 'Fat tails' : distribution.kurtosis < 0 ? 'Thin tails' : 'Normal'}
                {distribution.kurtosis > 0 && ' (more outliers)'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
