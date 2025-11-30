import { cn } from "../lib/utils";
import type { TimeRange } from "../lib/timeRange";
import { Button } from "./ui/button";

const PRESETS: { label: string; value: TimeRange["preset"] }[] = [
  { label: "1M", value: "1M" },
  { label: "3M", value: "3M" },
  { label: "6M", value: "6M" },
  { label: "YTD", value: "YTD" },
  { label: "1Y", value: "1Y" },
  { label: "All", value: "ALL" },
];

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  className?: string;
}

function TimeRangeSelector({ value, onChange, className }: TimeRangeSelectorProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Time range</span>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(preset => (
          <Button
            key={preset.value}
            type="button"
            size="sm"
            variant={value.preset === preset.value ? "default" : "outline"}
            onClick={() => onChange({ preset: preset.value })}
            className="text-xs"
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default TimeRangeSelector;

