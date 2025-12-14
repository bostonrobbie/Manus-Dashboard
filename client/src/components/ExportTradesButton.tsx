import { useMemo, useState } from "react";

import type { StrategySummary, TradeFilter } from "@shared/types/portfolio";
import type { TimeRange } from "../lib/timeRange";
import { trpc } from "../lib/trpc";

interface ExportTradesButtonProps {
  strategies?: StrategySummary[];
  timeRange?: TimeRange;
  filters?: TradeFilter;
}

function ExportTradesButton({ strategies = [], timeRange, filters }: ExportTradesButtonProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const mutation = trpc.portfolio.exportTradesCsv.useMutation({
    onSuccess: data => {
      const blob = new Blob([data.content], { type: data.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  const strategyOptions = useMemo(
    () => [{ id: "all", name: "All strategies" }, ...strategies.map(s => ({ id: s.id.toString(), name: s.name }))],
    [strategies],
  );

  const handleDownload = () => {
    const strategyIdValue = selectedStrategy === "all" ? undefined : Number(selectedStrategy);
    const strategyIds = Number.isFinite(strategyIdValue) ? [strategyIdValue as number] : undefined;
    mutation.mutate({
      strategyIds,
      startDate: startDate || filters?.startDate || undefined,
      endDate: endDate || filters?.endDate || undefined,
      timeRange,
      symbols: filters?.symbols,
      side: filters?.side,
      outcome: filters?.outcome,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-700">
      <label className="flex items-center gap-1">
        <span className="text-slate-500">Strategy</span>
        <select
          value={selectedStrategy}
          onChange={e => setSelectedStrategy(e.target.value)}
          className="rounded border border-slate-200 px-2 py-1"
        >
          {strategyOptions.map(option => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1">
        <span className="text-slate-500">Start</span>
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="rounded border border-slate-200 px-2 py-1"
        />
      </label>
      <label className="flex items-center gap-1">
        <span className="text-slate-500">End</span>
        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="rounded border border-slate-200 px-2 py-1"
        />
      </label>
      <button
        type="button"
        onClick={handleDownload}
        disabled={mutation.isPending}
        className="rounded bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {mutation.isPending ? "Downloading..." : "Download CSV"}
      </button>
      {mutation.isError ? <span className="text-[11px] text-rose-600">Failed to export trades.</span> : null}
    </div>
  );
}

export default ExportTradesButton;
