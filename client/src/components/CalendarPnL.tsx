import { useMemo } from "react";
import { Card } from "@/components/ui/card";

type PeriodType = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

interface BreakdownPeriod {
  period: string;
  returnPercent: number;
  totalPnL: number;
  trades: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
}

interface CalendarPnLProps {
  data: BreakdownPeriod[];
  periodType: PeriodType;
  onPeriodTypeChange: (type: PeriodType) => void;
}

export function CalendarPnL({ data, periodType, onPeriodTypeChange }: CalendarPnLProps) {
  // Get color based on P&L value
  const getColor = (pnl: number, returnPct: number) => {
    if (pnl === 0) return "bg-muted/50 text-muted-foreground";
    
    const intensity = Math.min(Math.abs(returnPct) / 20, 1); // Cap at 20% for max intensity
    
    if (pnl > 0) {
      // Green shades
      if (intensity > 0.66) return "bg-green-600 text-white";
      if (intensity > 0.33) return "bg-green-500 text-white";
      return "bg-green-400 text-white";
    } else {
      // Red shades
      if (intensity > 0.66) return "bg-red-600 text-white";
      if (intensity > 0.33) return "bg-red-500 text-white";
      return "bg-red-400 text-white";
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    const abs = Math.abs(value);
    if (abs >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    return `$${value.toFixed(0)}`;
  };

  // Render monthly calendar (for daily view)
  const renderMonthlyCalendar = () => {
    // Group data by month
    const monthGroups = data.reduce((acc, item) => {
      const month = item.period.substring(0, 7); // YYYY-MM
      if (!acc[month]) acc[month] = [];
      acc[month].push(item);
      return acc;
    }, {} as Record<string, BreakdownPeriod[]>);

    return (
      <div className="space-y-6">
        {Object.entries(monthGroups).map(([month, days]) => {
          const [year, monthNum] = month.split("-");
          const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleString("default", { month: "long", year: "numeric" });
          
          // Get first day of month and total days
          const firstDay = new Date(parseInt(year), parseInt(monthNum) - 1, 1).getDay();
          const daysInMonth = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
          
          // Create calendar grid
          const weeks: (BreakdownPeriod | null)[][] = [];
          let currentWeek: (BreakdownPeriod | null)[] = Array(firstDay).fill(null);
          
          days.forEach((day) => {
            const dayNum = parseInt(day.period.split("-")[2]);
            currentWeek[dayNum - 1 + firstDay - (weeks.length * 7)] = day;
            
            if (currentWeek.filter(Boolean).length === 7 - firstDay || dayNum === daysInMonth) {
              weeks.push([...currentWeek]);
              currentWeek = Array(7).fill(null);
            }
          });

          return (
            <div key={month} className="space-y-2">
              <h3 className="text-lg font-semibold">{monthName}</h3>
              <div className="grid grid-cols-7 gap-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                    {day}
                  </div>
                ))}
                {weeks.flat().map((day, idx) => (
                  <div
                    key={idx}
                    className={`min-h-[80px] p-2 rounded-md ${
                      day ? getColor(day.totalPnL, day.returnPercent) : "bg-transparent"
                    }`}
                  >
                    {day && (
                      <div className="flex flex-col h-full">
                        <div className="text-xs font-medium">{day.period.split("-")[2]}</div>
                        <div className="text-sm font-bold mt-auto">{formatCurrency(day.totalPnL)}</div>
                        <div className="text-xs">{day.returnPercent.toFixed(1)}%</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render year grid (for monthly/quarterly/yearly view)
  const renderYearGrid = () => {
    if (periodType === "monthly") {
      // Group by year
      const yearGroups = data.reduce((acc, item) => {
        const year = item.period.substring(0, 4);
        if (!acc[year]) acc[year] = [];
        acc[year].push(item);
        return acc;
      }, {} as Record<string, BreakdownPeriod[]>);

      return (
        <div className="space-y-6">
          {Object.entries(yearGroups).map(([year, months]) => (
            <div key={year} className="space-y-2">
              <h3 className="text-lg font-semibold">{year}</h3>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {months.map((month) => {
                  const monthName = new Date(month.period).toLocaleString("default", { month: "short" });
                  return (
                    <div
                      key={month.period}
                      className={`p-4 rounded-md ${getColor(month.totalPnL, month.returnPercent)}`}
                    >
                      <div className="text-sm font-medium">{monthName}</div>
                      <div className="text-lg font-bold mt-2">{formatCurrency(month.totalPnL)}</div>
                      <div className="text-sm">{month.returnPercent.toFixed(1)}%</div>
                      <div className="text-xs mt-1 opacity-80">{month.trades} trades</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // For quarterly and yearly
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {data.map((item) => (
          <div
            key={item.period}
            className={`p-4 rounded-md ${getColor(item.totalPnL, item.returnPercent)}`}
          >
            <div className="text-sm font-medium">{item.period}</div>
            <div className="text-xl font-bold mt-2">{formatCurrency(item.totalPnL)}</div>
            <div className="text-sm">{item.returnPercent.toFixed(1)}%</div>
            <div className="text-xs mt-1 opacity-80">{item.trades} trades</div>
            <div className="text-xs opacity-80">WR: {item.winRate.toFixed(0)}%</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header with tabs */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Calendar P&L</h2>
            <p className="text-sm text-muted-foreground">Performance visualization by time period</p>
          </div>
        </div>

        {/* Period type tabs */}
        <div className="flex gap-2 border-b">
          {(["daily", "weekly", "monthly", "quarterly", "yearly"] as PeriodType[]).map((type) => (
            <button
              key={type}
              onClick={() => onPeriodTypeChange(type)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                periodType === type
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Calendar view */}
        <div className="mt-6">
          {periodType === "daily" ? renderMonthlyCalendar() : renderYearGrid()}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-6 pt-4 border-t">
          <span>Color intensity indicates magnitude:</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-400 rounded"></div>
            <span>Small gain</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-600 rounded"></div>
            <span>Large gain</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-400 rounded"></div>
            <span>Small loss</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-600 rounded"></div>
            <span>Large loss</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
