import { Button } from "./ui/button";
import type { TimeRange } from "../lib/timeRange";

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
}

function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
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

