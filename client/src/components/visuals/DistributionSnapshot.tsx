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
    count: 0,
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

export function DistributionSnapshot({ returnsPct, isLoading }: DistributionSnapshotProps) {
  const histogram = useMemo(() => buildHistogram(returnsPct), [returnsPct]);

  if (isLoading) {
    return <div className="h-[260px] animate-pulse rounded-md bg-slate-100" data-testid="distribution-loading" />;
  }

  if (!returnsPct.length) {
    return (
      <div
        className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
        data-testid="distribution-empty"
      >
        Daily return distribution will render after at least one trade day.
      </div>
    );
  }

  return (
    <div className="h-[260px]" data-testid="distribution-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={histogram} margin={{ left: 4, right: 4 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
          <YAxis allowDecimals={false} width={28} />
          <Tooltip />
          <Bar dataKey="count" fill="#0f172a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
