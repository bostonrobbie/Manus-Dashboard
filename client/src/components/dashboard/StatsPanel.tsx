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
        "rounded-lg border border-slate-200 bg-white/85 p-3 shadow-sm backdrop-blur",
        className,
      )}
    >
      {title ? <div className="text-xs font-semibold text-slate-600">{title}</div> : null}
      <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-slate-700">
        {sharpe != null ? (
          <div>
            <div className="text-[11px] text-slate-500">Sharpe</div>
            <div className="font-semibold">{sharpe.toFixed(2)}</div>
          </div>
        ) : null}
        {maxDrawdown != null ? (
          <div>
            <div className="text-[11px] text-slate-500">Max DD</div>
            <div className="font-semibold">{`${maxDrawdown.toFixed(2)}%`}</div>
          </div>
        ) : null}
        {winRate != null ? (
          <div>
            <div className="text-[11px] text-slate-500">Win rate</div>
            <div className="font-semibold">{`${winRate.toFixed(1)}%`}</div>
          </div>
        ) : null}
        {tradeCount != null ? (
          <div>
            <div className="text-[11px] text-slate-500">Trades</div>
            <div className="font-semibold">{tradeCount}</div>
          </div>
        ) : null}
      </div>
      {children ? <div className="mt-2 text-xs text-slate-600">{children}</div> : null}
    </div>
  );
}
