import { cn } from "../lib/utils";

interface MetricCardProps {
  label: string;
  value?: string;
  helper?: string;
  isLoading?: boolean;
  align?: "start" | "end" | "center";
  variant?: "default" | "success" | "danger" | "warning";
  size?: "sm" | "md" | "lg";
}

function MetricCard({ 
  label, 
  value, 
  helper, 
  isLoading, 
  align = "start",
  variant = "default",
  size = "md"
}: MetricCardProps) {
  // Determine value color based on variant or value content
  const getValueColor = () => {
    if (variant === "success") return "text-emerald-400";
    if (variant === "danger") return "text-red-400";
    if (variant === "warning") return "text-amber-400";
    
    // Auto-detect based on value content
    if (value) {
      if (value.startsWith("-") || value.includes("loss")) return "text-red-400";
      if (value.startsWith("+") || (value.includes("%") && !value.startsWith("-"))) {
        const numMatch = value.match(/-?\d+\.?\d*/);
        if (numMatch && parseFloat(numMatch[0]) > 0) return "text-emerald-400";
      }
    }
    return "text-white";
  };
  
  const sizeClasses = {
    sm: "p-2",
    md: "p-3",
    lg: "p-4"
  };
  
  const valueSizeClasses = {
    sm: "text-lg",
    md: "text-xl sm:text-2xl",
    lg: "text-2xl sm:text-3xl"
  };

  return (
    <div 
      className={cn(
        "metric-card rounded-xl border border-[#2a2a2a] bg-gradient-to-br from-[#1e1e1e] to-[#252525]",
        "transition-all duration-200 hover:border-[#3a3a3a] hover:shadow-lg",
        sizeClasses[size],
        align === "end" && "text-right",
        align === "center" && "text-center"
      )}
    >
      <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      
      {isLoading ? (
        <div className="mt-1.5 h-7 w-20 skeleton-shimmer rounded" />
      ) : (
        <p className={cn(
          "mt-1 font-bold tracking-tight",
          valueSizeClasses[size],
          getValueColor()
        )}>
          {value ?? "—"}
        </p>
      )}
      
      {helper && !isLoading && (
        <p className="mt-1 text-[10px] sm:text-xs text-gray-500 truncate">
          {helper}
        </p>
      )}
    </div>
  );
}

export default MetricCard;
