import { cn } from "../lib/utils";
import type { TimeRangePreset } from "../lib/timeRange";

export type TimeRangeSelectorPreset = Extract<TimeRangePreset, "1M" | "3M" | "6M" | "YTD" | "1Y" | "3Y" | "5Y" | "10Y" | "ALL">;

const DEFAULT_PRESETS: { label: string; value: TimeRangeSelectorPreset }[] = [
  { label: "1M", value: "1M" },
  { label: "3M", value: "3M" },
  { label: "6M", value: "6M" },
  { label: "YTD", value: "YTD" },
  { label: "1Y", value: "1Y" },
  { label: "3Y", value: "3Y" },
  { label: "5Y", value: "5Y" },
  { label: "10Y", value: "10Y" },
  { label: "All", value: "ALL" },
];

interface TimeRangeSelectorProps {
  value: TimeRangeSelectorPreset;
  onChange: (preset: TimeRangeSelectorPreset) => void;
  className?: string;
  presets?: TimeRangeSelectorPreset[];
  condensed?: boolean;
  label?: string;
}

function TimeRangeSelector({ 
  value, 
  onChange, 
  className, 
  presets = DEFAULT_PRESETS, 
  condensed,
  label = "Time Range"
}: TimeRangeSelectorProps) {
  const options = presets
    .map(preset => DEFAULT_PRESETS.find(p => p.value === preset))
    .filter((preset): preset is (typeof DEFAULT_PRESETS)[number] => Boolean(preset));

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </span>
      )}
      <div className={cn(
        "inline-flex flex-wrap gap-1 p-1 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]",
        condensed ? "text-[10px]" : "text-xs"
      )}> 
        {options.map(preset => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value)}
            className={cn(
              "px-2 sm:px-3 py-1.5 rounded-md font-medium transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
              "touch-manipulation",
              value === preset.value
                ? "bg-blue-600 text-white shadow-md"
                : "text-gray-400 hover:text-white hover:bg-[#252525]"
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default TimeRangeSelector;
