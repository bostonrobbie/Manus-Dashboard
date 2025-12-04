import { cn } from "../lib/utils";
import type { TimeRangePreset } from "../lib/timeRange";
import { Button } from "./ui/button";

export type TimeRangeSelectorPreset = Extract<TimeRangePreset, "1M" | "3M" | "6M" | "YTD" | "1Y" | "3Y" | "5Y" | "ALL">;

const DEFAULT_PRESETS: { label: string; value: TimeRangeSelectorPreset }[] = [
  { label: "1M", value: "1M" },
  { label: "3M", value: "3M" },
  { label: "6M", value: "6M" },
  { label: "YTD", value: "YTD" },
  { label: "1Y", value: "1Y" },
  { label: "3Y", value: "3Y" },
  { label: "5Y", value: "5Y" },
  { label: "All", value: "ALL" },
];

interface TimeRangeSelectorProps {
  value: TimeRangeSelectorPreset;
  onChange: (preset: TimeRangeSelectorPreset) => void;
  className?: string;
  presets?: TimeRangeSelectorPreset[];
  condensed?: boolean;
}

function TimeRangeSelector({ value, onChange, className, presets = DEFAULT_PRESETS, condensed }: TimeRangeSelectorProps) {
  const options = presets
    .map(preset => DEFAULT_PRESETS.find(p => p.value === preset))
    .filter((preset): preset is (typeof DEFAULT_PRESETS)[number] => Boolean(preset));

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Time range</span>
      <div className={cn("flex flex-wrap gap-2", condensed ? "text-xs" : "text-sm")}> 
        {options.map(preset => (
          <Button
            key={preset.value}
            type="button"
            size="sm"
            variant={value === preset.value ? "default" : "outline"}
            onClick={() => onChange(preset.value)}
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

