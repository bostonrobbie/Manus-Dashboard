import { useEffect, useState } from "react";

import { cn } from "../lib/utils";

interface StartingCapitalInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  label?: string;
}

function StartingCapitalInput({ 
  value, 
  onChange, 
  className,
  label = "Starting Capital"
}: StartingCapitalInputProps) {
  const [internal, setInternal] = useState<string>(value.toString());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInternal(value.toString());
  }, [value]);

  const handleChange = (next: string) => {
    setInternal(next);
    const numeric = Number(next);
    if (Number.isNaN(numeric) || numeric <= 0) {
      setError("Enter a positive number");
      return;
    }
    setError(null);
    onChange(numeric);
  };

  // Format display value
  const formatValue = (val: number) => {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </span>
      )}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={internal}
          onChange={event => handleChange(event.target.value)}
          className={cn(
            "w-full max-w-[140px] pl-7 pr-3 py-2 rounded-lg text-sm font-medium",
            "bg-[#1a1a1a] border border-[#2a2a2a] text-white",
            "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500",
            "transition-all duration-200",
            "placeholder:text-gray-600",
            error ? "border-red-500 focus:ring-red-500/50" : ""
          )}
          aria-label="Starting capital"
          placeholder="100000"
        />
      </div>
      {error && (
        <span className="text-[10px] text-red-400">{error}</span>
      )}
    </div>
  );
}

export default StartingCapitalInput;
