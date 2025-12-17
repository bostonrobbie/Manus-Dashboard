import type { ReactNode } from "react";

import { cn } from "../../lib/utils";

interface StatsPanelProps {
  title?: string;
  sharpe?: number;
  maxDrawdown?: number;
  winRate?: number;
  tradeCount?: number;
  children?: ReactNode;
  className?: string;
}

export function StatsPanel({
  title,
  sharpe,
  maxDrawdown,
  winRate,
  tradeCount,
  children,
  className,
}: StatsPanelProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[#3a3a3a] bg-[#1e1e1e]/95 p-3 shadow-lg backdrop-blur-sm",
        className,
      )}
    >
      {title && (
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
          {title}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {sharpe != null && (
          <div className="space-y-0.5">
            <div className="text-[10px] text-gray-500">Sharpe</div>
            <div className={cn(
              "font-bold",
              sharpe >= 1 ? "text-emerald-400" : sharpe >= 0.5 ? "text-amber-400" : "text-gray-300"
            )}>
              {sharpe.toFixed(2)}
            </div>
          </div>
        )}
        {maxDrawdown != null && (
          <div className="space-y-0.5">
            <div className="text-[10px] text-gray-500">Max DD</div>
            <div className="font-bold text-red-400">{`${maxDrawdown.toFixed(2)}%`}</div>
          </div>
        )}
        {winRate != null && (
          <div className="space-y-0.5">
            <div className="text-[10px] text-gray-500">Win Rate</div>
            <div className={cn(
              "font-bold",
              winRate >= 50 ? "text-emerald-400" : "text-amber-400"
            )}>
              {`${winRate.toFixed(1)}%`}
            </div>
          </div>
        )}
        {tradeCount != null && (
          <div className="space-y-0.5">
            <div className="text-[10px] text-gray-500">Trades</div>
            <div className="font-bold text-white">{tradeCount.toLocaleString()}</div>
          </div>
        )}
      </div>
      {children && (
        <div className="mt-2 pt-2 border-t border-[#3a3a3a] text-xs text-gray-400">
          {children}
        </div>
      )}
    </div>
  );
}
