import { useMemo } from "react";

import type { StrategySummary } from "@shared/types/portfolio";

import { Button } from "./ui/button";

export interface TradeFiltersValue {
  startDate?: string;
  endDate?: string;
  symbols?: string[];
  strategyIds?: number[];
  side?: "all" | "long" | "short";
  outcome?: "all" | "win" | "loss";
}

interface TradeFiltersProps {
  strategies?: StrategySummary[];
  value: TradeFiltersValue;
  onChange: (value: TradeFiltersValue) => void;
  onReset?: () => void;
}

function parseSymbolInput(input?: string): string[] | undefined {
  if (!input) return undefined;
  const parts = input
    .split(",")
    .map(token => token.trim().toUpperCase())
    .filter(Boolean);
  return parts.length ? Array.from(new Set(parts)) : undefined;
}

export function TradeFilters({ strategies = [], value, onChange, onReset }: TradeFiltersProps) {
  const symbolInput = useMemo(() => (value.symbols ?? []).join(","), [value.symbols]);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
      <div className="flex flex-col gap-1 text-sm">
        <label className="text-xs uppercase tracking-wide text-slate-500">Symbols</label>
        <input
          className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          placeholder="e.g. ES, NQ"
          value={symbolInput}
          onChange={event =>
            onChange({
              ...value,
              symbols: parseSymbolInput(event.target.value),
            })
          }
        />
      </div>
      <div className="flex flex-col gap-1 text-sm">
        <label className="text-xs uppercase tracking-wide text-slate-500">Strategies</label>
        <select
          multiple
          className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          value={(value.strategyIds ?? []).map(String)}
          onChange={event => {
            const selected = Array.from(event.target.selectedOptions).map(option => Number(option.value));
            onChange({ ...value, strategyIds: selected.length ? selected : undefined });
          }}
        >
          {strategies.map(strategy => (
            <option key={strategy.id} value={strategy.id}>
              {strategy.name}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-slate-500">Hold Ctrl/Cmd to select multiple.</p>
      </div>
      <div className="flex flex-col gap-1 text-sm">
        <label className="text-xs uppercase tracking-wide text-slate-500">Side</label>
        <select
          className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          value={value.side ?? "all"}
          onChange={event =>
            onChange({
              ...value,
              side: event.target.value as TradeFiltersValue["side"],
            })
          }
        >
          <option value="all">All</option>
          <option value="long">Long</option>
          <option value="short">Short</option>
        </select>
      </div>
      <div className="flex flex-col gap-1 text-sm">
        <label className="text-xs uppercase tracking-wide text-slate-500">Outcome</label>
        <select
          className="rounded-md border border-slate-200 px-3 py-2 text-sm"
          value={value.outcome ?? "all"}
          onChange={event =>
            onChange({
              ...value,
              outcome: event.target.value as TradeFiltersValue["outcome"],
            })
          }
        >
          <option value="all">All</option>
          <option value="win">Winning</option>
          <option value="loss">Losing</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-1">
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide text-slate-500">Start date</label>
          <input
            type="date"
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={value.startDate ?? ""}
            onChange={event => onChange({ ...value, startDate: event.target.value || undefined })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-wide text-slate-500">End date</label>
          <input
            type="date"
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={value.endDate ?? ""}
            onChange={event => onChange({ ...value, endDate: event.target.value || undefined })}
          />
        </div>
        <div className="flex items-end justify-end gap-2 md:col-span-1 md:flex-col md:items-start">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onChange({});
              onReset?.();
            }}
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}

export default TradeFilters;
