/**
 * Performance Breakdown Analytics
 * 
 * Calculates performance metrics broken down by time periods with contract size support
 */

export interface TimePeriodPerformance {
  period: string;
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
  startingCapital: number,
  contractSize: 'mini' | 'micro' = 'mini',
  conversionRatio: number = 10
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

  const sortedTrades = [...trades].sort((a, b) => 
    a.exitDate.getTime() - b.exitDate.getTime()
  );

  return {
    daily: calculateDailyBreakdown(sortedTrades, startingCapital, contractSize, conversionRatio),
    weekly: calculateWeeklyBreakdown(sortedTrades, startingCapital, contractSize, conversionRatio),
    monthly: calculateMonthlyBreakdown(sortedTrades, startingCapital, contractSize, conversionRatio),
    quarterly: calculateQuarterlyBreakdown(sortedTrades, startingCapital, contractSize, conversionRatio),
    yearly: calculateYearlyBreakdown(sortedTrades, startingCapital, contractSize, conversionRatio),
  };
}

// Helper function to apply contract conversion
function convertPnL(pnl: number, contractSize: 'mini' | 'micro', ratio: number): number {
  const dollars = pnl / 100;
  return contractSize === 'micro' ? dollars / ratio : dollars;
}

function calculateDailyBreakdown(
  trades: Trade[],
  startingCapital: number,
  contractSize: 'mini' | 'micro',
  conversionRatio: number
): TimePeriodPerformance[] {
  const periods = new Map<string, Trade[]>();

  for (const trade of trades) {
    const key = trade.exitDate.toISOString().split('T')[0]!;
    if (!periods.has(key)) {
      periods.set(key, []);
    }
    periods.get(key)!.push(trade);
  }

  return Array.from(periods.entries())
    .map(([period, periodTrades]) => calculatePeriodMetrics(
      period,
      'daily',
      periodTrades,
      startingCapital,
      contractSize,
      conversionRatio
    ))
    .sort((a, b) => b.period.localeCompare(a.period))
    .slice(0, 20);
}

function calculateWeeklyBreakdown(
  trades: Trade[],
  startingCapital: number,
  contractSize: 'mini' | 'micro',
  conversionRatio: number
): TimePeriodPerformance[] {
  const periods = new Map<string, Trade[]>();

  for (const trade of trades) {
    const date = trade.exitDate;
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const key = `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`;
    
    if (!periods.has(key)) {
      periods.set(key, []);
    }
    periods.get(key)!.push(trade);
  }

  return Array.from(periods.entries())
    .map(([period, periodTrades]) => calculatePeriodMetrics(
      period,
      'weekly',
      periodTrades,
      startingCapital,
      contractSize,
      conversionRatio
    ))
    .sort((a, b) => b.period.localeCompare(a.period))
    .slice(0, 20);
}

function calculateMonthlyBreakdown(
  trades: Trade[],
  startingCapital: number,
  contractSize: 'mini' | 'micro',
  conversionRatio: number
): TimePeriodPerformance[] {
  const periods = new Map<string, Trade[]>();

  for (const trade of trades) {
    const date = trade.exitDate;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!periods.has(key)) {
      periods.set(key, []);
    }
    periods.get(key)!.push(trade);
  }

  return Array.from(periods.entries())
    .map(([period, periodTrades]) => calculatePeriodMetrics(
      period,
      'monthly',
      periodTrades,
      startingCapital,
      contractSize,
      conversionRatio
    ))
    .sort((a, b) => b.period.localeCompare(a.period))
    .slice(0, 20);
}

function calculateQuarterlyBreakdown(
  trades: Trade[],
  startingCapital: number,
  contractSize: 'mini' | 'micro',
  conversionRatio: number
): TimePeriodPerformance[] {
  const periods = new Map<string, Trade[]>();

  for (const trade of trades) {
    const date = trade.exitDate;
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    const key = `${date.getFullYear()}-Q${quarter}`;
    
    if (!periods.has(key)) {
      periods.set(key, []);
    }
    periods.get(key)!.push(trade);
  }

  return Array.from(periods.entries())
    .map(([period, periodTrades]) => calculatePeriodMetrics(
      period,
      'quarterly',
      periodTrades,
      startingCapital,
      contractSize,
      conversionRatio
    ))
    .sort((a, b) => b.period.localeCompare(a.period))
    .slice(0, 20);
}

function calculateYearlyBreakdown(
  trades: Trade[],
  startingCapital: number,
  contractSize: 'mini' | 'micro',
  conversionRatio: number
): TimePeriodPerformance[] {
  const periods = new Map<string, Trade[]>();

  for (const trade of trades) {
    const key = trade.exitDate.getFullYear().toString();
    
    if (!periods.has(key)) {
      periods.set(key, []);
    }
    periods.get(key)!.push(trade);
  }

  return Array.from(periods.entries())
    .map(([period, periodTrades]) => calculatePeriodMetrics(
      period,
      'yearly',
      periodTrades,
      startingCapital,
      contractSize,
      conversionRatio
    ))
    .sort((a, b) => b.period.localeCompare(a.period))
    .slice(0, 20);
}

function calculatePeriodMetrics(
  period: string,
  periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
  periodTrades: Trade[],
  startingCapital: number,
  contractSize: 'mini' | 'micro',
  conversionRatio: number
): TimePeriodPerformance {
  const totalPnL = periodTrades.reduce((sum, t) => sum + convertPnL(t.pnl, contractSize, conversionRatio), 0);
  const returnPercent = (totalPnL / startingCapital) * 100;

  const winningTrades = periodTrades.filter(t => t.pnl > 0);
  const losingTrades = periodTrades.filter(t => t.pnl < 0);

  const totalWins = winningTrades.reduce((sum, t) => sum + convertPnL(t.pnl, contractSize, conversionRatio), 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + convertPnL(t.pnl, contractSize, conversionRatio), 0));

  const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : (totalWins > 0 ? Infinity : 0);

  // Determine period dates
  let startDate: Date;
  let endDate: Date;

  const firstTrade = periodTrades[0]!.exitDate;
  const lastTrade = periodTrades[periodTrades.length - 1]!.exitDate;

  switch (periodType) {
    case 'daily':
      startDate = new Date(firstTrade.getFullYear(), firstTrade.getMonth(), firstTrade.getDate());
      endDate = new Date(firstTrade.getFullYear(), firstTrade.getMonth(), firstTrade.getDate(), 23, 59, 59);
      break;
    case 'weekly':
      startDate = new Date(firstTrade);
      startDate.setDate(firstTrade.getDate() - firstTrade.getDay());
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      break;
    case 'monthly':
      startDate = new Date(firstTrade.getFullYear(), firstTrade.getMonth(), 1);
      endDate = new Date(firstTrade.getFullYear(), firstTrade.getMonth() + 1, 0, 23, 59, 59);
      break;
    case 'quarterly':
      const quarter = Math.floor(firstTrade.getMonth() / 3);
      startDate = new Date(firstTrade.getFullYear(), quarter * 3, 1);
      endDate = new Date(firstTrade.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59);
      break;
    case 'yearly':
      startDate = new Date(firstTrade.getFullYear(), 0, 1);
      endDate = new Date(firstTrade.getFullYear(), 11, 31, 23, 59, 59);
      break;
  }

  return {
    period,
    periodType,
    startDate,
    endDate,
    trades: periodTrades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    totalPnL,
    returnPercent,
    winRate: (winningTrades.length / periodTrades.length) * 100,
    avgWin,
    avgLoss,
    profitFactor: profitFactor === Infinity ? 0 : profitFactor,
  };
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
