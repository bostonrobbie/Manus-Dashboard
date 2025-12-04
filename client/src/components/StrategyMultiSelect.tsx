import { useMemo } from "react";

import { cn } from "../lib/utils";
import type { StrategySummary } from "@shared/types/portfolio";

interface StrategyMultiSelectProps {
  options: StrategySummary[];
  selected: number[];
  onChange: (next: number[]) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

function StrategyMultiSelect({ options, selected, onChange, min = 2, max = 4, disabled }: StrategyMultiSelectProps) {
  const helper = useMemo(() => {
    if (selected.length < min) return `Select at least ${min} strategies`;
    if (selected.length > max) return `Limit ${max} strategies`;
    return `Selected ${selected.length}/${max}`;
  }, [selected.length, min, max]);

  const toggle = (id: number) => {
    if (disabled) return;
    if (selected.includes(id)) {
      onChange(selected.filter(item => item !== id));
    } else if (selected.length < max) {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Strategies</span>
        <span className="text-[11px] text-slate-500">{helper}</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
        {options.map(option => {
          const isActive = selected.includes(option.id);
          const isDisabled = disabled || (!isActive && selected.length >= max);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => toggle(option.id)}
              disabled={isDisabled}
              data-testid={`strategy-option-${option.id}`}
              className={cn(
                "flex flex-col rounded border px-3 py-2 text-left transition",
                isActive
                  ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50",
                isDisabled ? "cursor-not-allowed opacity-60" : "",
              )}
            >
              <span className="font-semibold">{option.name}</span>
              <span className="text-xs uppercase text-slate-500">{option.type}</span>
              {option.description ? <span className="text-[11px] text-slate-400">{option.description}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default StrategyMultiSelect;
