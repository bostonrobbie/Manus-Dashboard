/**
 * Performance Breakdown Analytics
 * 
 * Calculates performance metrics broken down by time periods:
 * - Daily, Weekly, Monthly, Quarterly, Yearly
 * 
 * This module provides institutional-grade time period analysis
 * for trading strategy performance.
 */

export interface TimePeriodPerformance {
  period: string; // e.g., "2024-12-01" for monthly, "2024-W48" for weekly
  periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: Date;
  endDate: Date;
  trades: number;
  winningTrades: number;
  losingTrades: number;
  totalPnL: number;
  returnPercent: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
}

export interface PerformanceBreakdown {
  daily: TimePeriodPerformance[];
  weekly: TimePeriodPerformance[];
  monthly: TimePeriodPerformance[];
  quarterly: TimePeriodPerformance[];
  yearly: TimePeriodPerformance[];
}

interface Trade {
  exitDate: Date;
  pnl: number;
}

/**
 * Calculate performance breakdown by time periods
 */
export function calculatePerformanceBreakdown(
  trades: Trade[],
  startingCapital: number
): PerformanceBreakdown {
  if (trades.length === 0) {
    return {
      daily: [],
      weekly: [],
      monthly: [],
      quarterly: [],
      yearly: [],
    };
  }

  // Sort trades by exit date
  const sortedTrades = [...trades].sort((a, b) => 
    a.exitDate.getTime() - b.exitDate.getTime()
  );

  return {
    daily: calculateDailyBreakdown(sortedTrades, startingCapital),
    weekly: calculateWeeklyBreakdown(sortedTrades, startingCapital),
    monthly: calculateMonthlyBreakdown(sortedTrades, startingCapital),
    quarterly: calculateQuarterlyBreakdown(sortedTrades, startingCapital),
    yearly: calculateYearlyBreakdown(sortedTrades, startingCapital),
  };
}

/**
 * Calculate daily performance breakdown
 */
function calculateDailyBreakdown(
  trades: Trade[],
  startingCapital: number
): TimePeriodPerformance[] {
  const dailyMap = new Map<string, Trade[]>();

  // Group trades by day
  for (const trade of trades) {
    const dateKey = formatDateKey(trade.exitDate, 'daily');
    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, []);
    }
    dailyMap.get(dateKey)!.push(trade);
  }

  // Calculate metrics for each day
  const results: TimePeriodPerformance[] = [];
  for (const [dateKey, dayTrades] of Array.from(dailyMap.entries())) {
    const date = parseDateKey(dateKey, 'daily');
    results.push(calculatePeriodMetrics(
      dateKey,
      'daily',
      date,
      date,
      dayTrades,
      startingCapital
    ));
  }

  return results.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

/**
 * Calculate weekly performance breakdown
 */
function calculateWeeklyBreakdown(
  trades: Trade[],
  startingCapital: number
): TimePeriodPerformance[] {
  const weeklyMap = new Map<string, Trade[]>();

  // Group trades by week
  for (const trade of trades) {
    const weekKey = formatDateKey(trade.exitDate, 'weekly');
    if (!weeklyMap.has(weekKey)) {
      weeklyMap.set(weekKey, []);
    }
    weeklyMap.get(weekKey)!.push(trade);
  }

  // Calculate metrics for each week
  const results: TimePeriodPerformance[] = [];
  for (const [weekKey, weekTrades] of Array.from(weeklyMap.entries())) {
    const { startDate, endDate } = getWeekBounds(weekKey);
    results.push(calculatePeriodMetrics(
      weekKey,
      'weekly',
      startDate,
      endDate,
      weekTrades,
      startingCapital
    ));
  }

  return results.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

/**
 * Calculate monthly performance breakdown
 */
function calculateMonthlyBreakdown(
  trades: Trade[],
  startingCapital: number
): TimePeriodPerformance[] {
  const monthlyMap = new Map<string, Trade[]>();

  // Group trades by month
  for (const trade of trades) {
    const monthKey = formatDateKey(trade.exitDate, 'monthly');
    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, []);
    }
    monthlyMap.get(monthKey)!.push(trade);
  }

  // Calculate metrics for each month
  const results: TimePeriodPerformance[] = [];
  for (const [monthKey, monthTrades] of Array.from(monthlyMap.entries())) {
    const { startDate, endDate } = getMonthBounds(monthKey);
    results.push(calculatePeriodMetrics(
      monthKey,
      'monthly',
      startDate,
      endDate,
      monthTrades,
      startingCapital
    ));
  }

  return results.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

/**
 * Calculate quarterly performance breakdown
 */
function calculateQuarterlyBreakdown(
  trades: Trade[],
  startingCapital: number
): TimePeriodPerformance[] {
  const quarterlyMap = new Map<string, Trade[]>();

  // Group trades by quarter
  for (const trade of trades) {
    const quarterKey = formatDateKey(trade.exitDate, 'quarterly');
    if (!quarterlyMap.has(quarterKey)) {
      quarterlyMap.set(quarterKey, []);
    }
    quarterlyMap.get(quarterKey)!.push(trade);
  }

  // Calculate metrics for each quarter
  const results: TimePeriodPerformance[] = [];
  for (const [quarterKey, quarterTrades] of Array.from(quarterlyMap.entries())) {
    const { startDate, endDate } = getQuarterBounds(quarterKey);
    results.push(calculatePeriodMetrics(
      quarterKey,
      'quarterly',
      startDate,
      endDate,
      quarterTrades,
      startingCapital
    ));
  }

  return results.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

/**
 * Calculate yearly performance breakdown
 */
function calculateYearlyBreakdown(
  trades: Trade[],
  startingCapital: number
): TimePeriodPerformance[] {
  const yearlyMap = new Map<string, Trade[]>();

  // Group trades by year
  for (const trade of trades) {
    const yearKey = formatDateKey(trade.exitDate, 'yearly');
    if (!yearlyMap.has(yearKey)) {
      yearlyMap.set(yearKey, []);
    }
    yearlyMap.get(yearKey)!.push(trade);
  }

  // Calculate metrics for each year
  const results: TimePeriodPerformance[] = [];
  for (const [yearKey, yearTrades] of Array.from(yearlyMap.entries())) {
    const { startDate, endDate } = getYearBounds(yearKey);
    results.push(calculatePeriodMetrics(
      yearKey,
      'yearly',
      startDate,
      endDate,
      yearTrades,
      startingCapital
    ));
  }

  return results.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

/**
 * Calculate metrics for a specific time period
 */
function calculatePeriodMetrics(
  period: string,
  periodType: TimePeriodPerformance['periodType'],
  startDate: Date,
  endDate: Date,
  trades: Trade[],
  startingCapital: number
): TimePeriodPerformance {
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => t.pnl > 0).length;
  const losingTrades = trades.filter(t => t.pnl < 0).length;
  
  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const returnPercent = (totalPnL / startingCapital) * 100;
  
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  
  const avgWin = wins.length > 0
    ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length
    : 0;
  
  const avgLoss = losses.length > 0
    ? Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length)
    : 0;
  
  const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
  
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

  return {
    period,
    periodType,
    startDate,
    endDate,
    trades: totalTrades,
    winningTrades,
    losingTrades,
    totalPnL,
    returnPercent,
    winRate,
    avgWin,
    avgLoss,
    profitFactor,
  };
}

/**
 * Format date as a key for grouping
 */
function formatDateKey(
  date: Date,
  periodType: TimePeriodPerformance['periodType']
): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  switch (periodType) {
    case 'daily':
      return `${year}-${month}-${day}`;
    case 'weekly':
      return getWeekKey(date);
    case 'monthly':
      return `${year}-${month}`;
    case 'quarterly':
      return `${year}-Q${getQuarter(date)}`;
    case 'yearly':
      return `${year}`;
  }
}

/**
 * Parse date key back to Date
 */
function parseDateKey(
  key: string,
  periodType: TimePeriodPerformance['periodType']
): Date {
  switch (periodType) {
    case 'daily':
      return new Date(key);
    case 'weekly':
      return getWeekBounds(key).startDate;
    case 'monthly':
      return getMonthBounds(key).startDate;
    case 'quarterly':
      return getQuarterBounds(key).startDate;
    case 'yearly':
      return getYearBounds(key).startDate;
  }
}

/**
 * Get ISO week number and year
 */
function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Get week bounds from week key
 */
function getWeekBounds(weekKey: string): { startDate: Date; endDate: Date } {
  const [yearStr, weekStr] = weekKey.split('-W');
  const year = parseInt(yearStr);
  const week = parseInt(weekStr);

  // Get first day of year
  const jan1 = new Date(year, 0, 1);
  const dayOfWeek = jan1.getDay() || 7;
  
  // Calculate start of week
  const daysToMonday = dayOfWeek === 1 ? 0 : (8 - dayOfWeek);
  const startDate = new Date(year, 0, 1 + daysToMonday + (week - 1) * 7);
  
  // End date is 6 days later
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  return { startDate, endDate };
}

/**
 * Get month bounds from month key
 */
function getMonthBounds(monthKey: string): { startDate: Date; endDate: Date } {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr) - 1;

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  return { startDate, endDate };
}

/**
 * Get quarter number from date
 */
function getQuarter(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1;
}

/**
 * Get quarter bounds from quarter key
 */
function getQuarterBounds(quarterKey: string): { startDate: Date; endDate: Date } {
  const [yearStr, quarterStr] = quarterKey.split('-Q');
  const year = parseInt(yearStr);
  const quarter = parseInt(quarterStr);

  const startMonth = (quarter - 1) * 3;
  const startDate = new Date(year, startMonth, 1);
  const endDate = new Date(year, startMonth + 3, 0);

  return { startDate, endDate };
}

/**
 * Get year bounds from year key
 */
function getYearBounds(yearKey: string): { startDate: Date; endDate: Date } {
  const year = parseInt(yearKey);
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  return { startDate, endDate };
}
