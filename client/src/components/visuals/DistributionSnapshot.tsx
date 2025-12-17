import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface DistributionSnapshotProps {
  returnsPct: number[];
  isLoading?: boolean;
}

const BUCKETS = [-5, -3, -1, -0.5, 0, 0.5, 1, 3, 5];

function buildHistogram(values: number[]) {
  const buckets = BUCKETS.map((edge, idx) => ({
    label: idx === BUCKETS.length - 1 ? `>${edge}%` : `${edge}% to ${BUCKETS[idx + 1]}%`,
    shortLabel: idx === BUCKETS.length - 1 ? `>${edge}` : `${edge}`,
    count: 0,
    edge,
  }));

  for (const value of values) {
    const idx = BUCKETS.findIndex((edge, index) => {
      const next = BUCKETS[index + 1];
      if (next == null) return value > edge;
      return value >= edge && value < next;
    });
    if (idx >= 0) buckets[idx].count += 1;
  }

  return buckets;
}

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="bg-[#1e1e1e] border border-[#3a3a3a] rounded-lg p-3 shadow-xl">
      <p className="text-white font-semibold text-sm mb-1">{label}</p>
      <p className="text-gray-300 text-sm">
        <span className="font-medium">{payload[0].value}</span> occurrences
      </p>
    </div>
  );
};

export function DistributionSnapshot({ returnsPct, isLoading }: DistributionSnapshotProps) {
  const histogram = useMemo(() => buildHistogram(returnsPct), [returnsPct]);
  
  // Calculate statistics
  const stats = useMemo(() => {
    if (!returnsPct.length) return null;
    const sorted = [...returnsPct].sort((a, b) => a - b);
    const mean = returnsPct.reduce((a, b) => a + b, 0) / returnsPct.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const positiveCount = returnsPct.filter(r => r > 0).length;
    const negativeCount = returnsPct.filter(r => r < 0).length;
    return { mean, median, positiveCount, negativeCount, total: returnsPct.length };
  }, [returnsPct]);

  if (isLoading) {
    return <div className="h-[280px] skeleton-shimmer rounded-lg" data-testid="distribution-loading" />;
  }

  if (!returnsPct.length) {
    return (
      <div
        className="rounded-lg border border-dashed border-[#3a3a3a] bg-[#1a1a1a] px-4 py-6 text-sm text-gray-400 text-center"
        data-testid="distribution-empty"
      >
        <svg className="mx-auto h-10 w-10 text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Daily return distribution will render after at least one trade day.
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="distribution-chart">
      {/* Stats summary */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-[#1a1a1a] rounded-lg p-2 border border-[#2a2a2a]">
            <p className="text-[10px] text-gray-500 uppercase">Mean</p>
            <p className={`text-sm font-semibold ${stats.mean >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {stats.mean.toFixed(2)}%
            </p>
          </div>
          <div className="bg-[#1a1a1a] rounded-lg p-2 border border-[#2a2a2a]">
            <p className="text-[10px] text-gray-500 uppercase">Median</p>
            <p className={`text-sm font-semibold ${stats.median >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {stats.median.toFixed(2)}%
            </p>
          </div>
          <div className="bg-[#1a1a1a] rounded-lg p-2 border border-[#2a2a2a]">
            <p className="text-[10px] text-gray-500 uppercase">Win Days</p>
            <p className="text-sm font-semibold text-emerald-400">{stats.positiveCount}</p>
          </div>
          <div className="bg-[#1a1a1a] rounded-lg p-2 border border-[#2a2a2a]">
            <p className="text-[10px] text-gray-500 uppercase">Loss Days</p>
            <p className="text-sm font-semibold text-red-400">{stats.negativeCount}</p>
          </div>
        </div>
      )}
      
      {/* Histogram chart */}
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={histogram} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a2a2a" />
            
            <XAxis 
              dataKey="shortLabel" 
              tick={{ fontSize: 10, fill: "#9ca3af", fontWeight: 500 }} 
              tickLine={false}
              axisLine={{ stroke: "#2a2a2a" }}
              interval={0}
            />
            
            <YAxis 
              allowDecimals={false} 
              width={35}
              tick={{ fontSize: 10, fill: "#9ca3af", fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: "#2a2a2a" }}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-red-500" />
          <span>Strong Loss</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-amber-400" />
          <span>Mild Loss</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-green-400" />
          <span>Mild Gain</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded bg-green-500" />
          <span>Strong Gain</span>
        </div>
      </div>
    </div>
  );
}
