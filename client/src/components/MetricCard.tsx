import { cn } from "../lib/utils";

interface MetricCardProps {
  label: string;
  value?: string;
  helper?: string;
  isLoading?: boolean;
  align?: "start" | "end";
}

function MetricCard({ label, value, helper, isLoading, align = "start" }: MetricCardProps) {
  return (
    <div className={cn("rounded-lg border border-slate-200 bg-white p-3", align === "end" && "text-right")}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      {isLoading ? (
        <div className="mt-1 h-7 w-24 animate-pulse rounded bg-slate-100" />
      ) : (
        <p className="mt-1 text-2xl font-semibold text-slate-900">{value ?? "—"}</p>
      )}
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

export default MetricCard;
