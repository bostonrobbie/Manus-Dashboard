interface MetricCardProps {
  label: string;
  value: string;
  helper?: string;
  isLoading?: boolean;
}

function MetricCard({ label, value, helper, isLoading }: MetricCardProps) {
  return (
    <div className="card space-y-1">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      {isLoading ? (
        <div className="h-7 w-20 animate-pulse rounded bg-slate-200" />
      ) : (
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
      )}
      {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

export default MetricCard;
