import { useEffect, useState } from "react";

import { cn } from "../lib/utils";
import { Input } from "./ui/input";

interface StartingCapitalInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

function StartingCapitalInput({ value, onChange, className }: StartingCapitalInputProps) {
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

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Starting capital</span>
      <Input
        inputMode="numeric"
        pattern="[0-9]*"
        value={internal}
        onChange={event => handleChange(event.target.value)}
        className={cn(error ? "border-red-300" : "", "max-w-xs")}
        aria-label="Starting capital"
      />
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}

export default StartingCapitalInput;
