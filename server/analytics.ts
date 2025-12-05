/**
 * Portfolio Analytics Engine
 * Comprehensive calculations for trading strategy performance metrics
 */

export interface Trade {
  id: number;
  strategyId: number;
  entryDate: Date;
  exitDate: Date;
  direction: string;
  entryPrice: number; // in cents
  exitPrice: number; // in cents
  quantity: number;
  pnl: number; // in cents
  pnlPercent: number; // in basis points (10000 = 1%)
  commission: number; // in cents
}

export interface BenchmarkData {
  date: Date;
  close: number; // in cents
}

export interface PerformanceMetrics {
  totalReturn: number; // percentage
  annualizedReturn: number; // percentage
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number; // NEW: Calmar ratio
  maxDrawdown: number; // percentage
  winRate: number; // percentage
  profitFactor: number;
  avgWin: number; // dollars
  avgLoss: number; // dollars
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

export interface EquityPoint {
  date: Date;
  equity: number; // in dollars
  drawdown: number; // percentage
}

/**
 * Calculate equity curve from trades (mini contracts only)
 * @param trades Array of trades
 * @param startingCapital Starting capital in dollars
 */
export function calculateEquityCurve(
  trades: Trade[],
  startingCapital: number = 100000
): EquityPoint[] {
  const sortedTrades = [...trades].sort((a, b) => 
    a.exitDate.getTime() - b.exitDate.getTime()
  );

  const points: EquityPoint[] = [];
  let equity = startingCapital;
  let peak = startingCapital;

  // Add starting point
  if (sortedTrades.length > 0) {
    points.push({
      date: sortedTrades[0]!.entryDate,
      equity: startingCapital,
      drawdown: 0,
    });
  }

  for (const trade of sortedTrades) {
    // Convert P&L from cents to dollars (mini contracts)
    const pnlDollars = trade.pnl / 100;
    equity += pnlDollars;
    peak = Math.max(peak, equity);
    const drawdown = peak > 0 ? ((peak - equity) / peak) * 100 : 0;

    points.push({
      date: trade.exitDate,
      equity,
      drawdown,
    });
  }

  return points;
}

/**
 * Forward-fill equity curve to create continuous daily series
 */
export function forwardFillEquityCurve(
  points: EquityPoint[],
  startDate: Date,
  endDate: Date
): EquityPoint[] {
  if (points.length === 0) return [];

  const filled: EquityPoint[] = [];
  let currentIndex = 0;
  
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const currentDate = new Date(d);
    
    // Find the most recent point before or on this date
    while (
      currentIndex < points.length - 1 &&
      points[currentIndex + 1]!.date <= currentDate
    ) {
      currentIndex++;
    }

    const point = points[currentIndex];
    if (point) {
      filled.push({
        date: new Date(currentDate),
        equity: point.equity,
        drawdown: point.drawdown,
      });
    }
  }

  return filled;
}

/**
 * Calculate comprehensive performance metrics (mini contracts only)
 * @param trades Array of trades
 * @param startingCapital Starting capital in dollars
 * @param daysInPeriod Optional period length in days
 */
export function calculatePerformanceMetrics(
  trades: Trade[],
  startingCapital: number = 100000,
  daysInPeriod?: number
): PerformanceMetrics {
  if (trades.length === 0) {
    return {
      totalReturn: 0,
      annualizedReturn: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      calmarRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
    };
  }

  const sortedTrades = [...trades].sort((a, b) => 
    a.exitDate.getTime() - b.exitDate.getTime()
  );

  // Calculate total P&L (mini contracts)
  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl / 100), 0);
  const totalReturn = (totalPnl / startingCapital) * 100;

  // Calculate period length in years
  const firstDate = sortedTrades[0]!.exitDate;
  const lastDate = sortedTrades[sortedTrades.length - 1]!.exitDate;
  const daysElapsed = daysInPeriod || 
    (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
  const yearsElapsed = daysElapsed / 365.25;

  // Annualized return
  const annualizedReturn = yearsElapsed > 0
    ? (Math.pow(1 + totalReturn / 100, 1 / yearsElapsed) - 1) * 100
    : totalReturn;

  // Win/Loss statistics
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl < 0);
  const winRate = (winningTrades.length / trades.length) * 100;

  const totalWins = winningTrades.reduce((sum, t) => sum + (t.pnl / 100), 0);
  const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.pnl / 100), 0));
  const avgWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0;
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

  // Calculate equity curve for drawdown and Sharpe
  const equityCurve = calculateEquityCurve(trades, startingCapital);
  const maxDrawdown = Math.max(...equityCurve.map(p => p.drawdown), 0);

  // Calculate daily returns for Sharpe and Sortino
  const dailyReturns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prevEquity = equityCurve[i - 1]!.equity;
    const currEquity = equityCurve[i]!.equity;
    const dailyReturn = (currEquity - prevEquity) / prevEquity;
    dailyReturns.push(dailyReturn);
  }

  const avgDailyReturn = dailyReturns.length > 0
    ? dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length
    : 0;

  const stdDev = dailyReturns.length > 1
    ? Math.sqrt(
        dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgDailyReturn, 2), 0) /
          (dailyReturns.length - 1)
      )
    : 0;

  const sharpeRatio = stdDev > 0
    ? (avgDailyReturn / stdDev) * Math.sqrt(252) // Annualized
    : 0;

  // Sortino ratio (only downside deviation)
  const downsideReturns = dailyReturns.filter(r => r < 0);
  const downsideStdDev = downsideReturns.length > 1
    ? Math.sqrt(
        downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) /
          (downsideReturns.length - 1)
      )
    : 0;

  const sortinoRatio = downsideStdDev > 0
    ? (avgDailyReturn / downsideStdDev) * Math.sqrt(252) // Annualized
    : sharpeRatio; // Fallback to Sharpe if no downside

  // Calmar ratio: annualized return / max drawdown
  const calmarRatio = maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;

  return {
    totalReturn,
    annualizedReturn,
    sharpeRatio,
    sortinoRatio,
    calmarRatio,
    maxDrawdown,
    winRate,
    profitFactor,
    avgWin,
    avgLoss,
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
  };
}

/**
 * Calculate benchmark equity curve from OHLC data
 */
export function calculateBenchmarkEquityCurve(
  benchmarkData: BenchmarkData[],
  startingCapital: number = 100000
): EquityPoint[] {
  if (benchmarkData.length === 0) return [];

  const sorted = [...benchmarkData].sort((a, b) => 
    a.date.getTime() - b.date.getTime()
  );

  const startPrice = sorted[0]!.close / 100; // Convert cents to dollars
  const shares = startingCapital / startPrice;

  return sorted.map(data => {
    const price = data.close / 100;
    const equity = shares * price;
    return {
      date: data.date,
      equity,
      drawdown: 0, // Calculate separately if needed
    };
  });
}

/**
 * Calculate correlation between two equity curves
 */
export function calculateCorrelation(
  curve1: EquityPoint[],
  curve2: EquityPoint[]
): number {
  if (curve1.length === 0 || curve2.length === 0 || curve1.length !== curve2.length) {
    return 0;
  }

  const returns1 = [];
  const returns2 = [];

  for (let i = 1; i < curve1.length; i++) {
    const r1 = (curve1[i]!.equity - curve1[i - 1]!.equity) / curve1[i - 1]!.equity;
    const r2 = (curve2[i]!.equity - curve2[i - 1]!.equity) / curve2[i - 1]!.equity;
    returns1.push(r1);
    returns2.push(r2);
  }

  if (returns1.length === 0) return 0;

  const mean1 = returns1.reduce((sum, r) => sum + r, 0) / returns1.length;
  const mean2 = returns2.reduce((sum, r) => sum + r, 0) / returns2.length;

  let numerator = 0;
  let sumSq1 = 0;
  let sumSq2 = 0;

  for (let i = 0; i < returns1.length; i++) {
    const diff1 = returns1[i]! - mean1;
    const diff2 = returns2[i]! - mean2;
    numerator += diff1 * diff2;
    sumSq1 += diff1 * diff1;
    sumSq2 += diff2 * diff2;
  }

  const denominator = Math.sqrt(sumSq1 * sumSq2);
  return denominator > 0 ? numerator / denominator : 0;
}

/**
 * Filter trades by date range
 */
export function filterTradesByDateRange(
  trades: Trade[],
  startDate?: Date,
  endDate?: Date
): Trade[] {
  let filtered = trades;

  if (startDate) {
    filtered = filtered.filter(t => t.exitDate >= startDate);
  }

  if (endDate) {
    filtered = filtered.filter(t => t.exitDate <= endDate);
  }

  return filtered;
}

/**
 * Calculate performance by time period (day, week, month, quarter, year)
 */
export interface PeriodPerformance {
  period: string;
  return: number; // percentage
  trades: number;
  winRate: number; // percentage
}

export function calculatePerformanceByPeriod(
  trades: Trade[],
  periodType: 'day' | 'week' | 'month' | 'quarter' | 'year'
): PeriodPerformance[] {
  if (trades.length === 0) return [];

  const periods = new Map<string, Trade[]>();

  for (const trade of trades) {
    const date = trade.exitDate;
    let key: string;

    switch (periodType) {
      case 'day':
        key = date.toISOString().split('T')[0]!;
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0]!;
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'quarter':
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        key = `${date.getFullYear()}-Q${quarter}`;
        break;
      case 'year':
        key = String(date.getFullYear());
        break;
    }

    if (!periods.has(key)) {
      periods.set(key, []);
    }
    periods.get(key)!.push(trade);
  }

  const results: PeriodPerformance[] = [];

  for (const [period, periodTrades] of Array.from(periods.entries())) {
    const totalPnl = periodTrades.reduce((sum: number, t: Trade) => sum + t.pnl / 100, 0);
    const winningTrades = periodTrades.filter((t: Trade) => t.pnl > 0).length;
    const winRate = (winningTrades / periodTrades.length) * 100;

    results.push({
      period,
      return: totalPnl, // This would need starting capital context for percentage
      trades: periodTrades.length,
      winRate,
    });
  }

  return results.sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Time Period Performance Interface
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

export interface PerformanceBreakdownData {
  daily: TimePeriodPerformance[];
  weekly: TimePeriodPerformance[];
  monthly: TimePeriodPerformance[];
  quarterly: TimePeriodPerformance[];
  yearly: TimePeriodPerformance[];
}

/**
 * Calculate performance breakdown by time periods
 * @param trades Array of trades
 * @param startingCapital Starting capital in dollars
 * @param contractSize Target contract size (mini or micro)
 * @param conversionRatio Micro-to-mini ratio (default 10, BTC is 50)
 */
export function calculatePerformanceBreakdown(
  trades: Trade[],
  startingCapital: number,
  contractSize: 'mini' | 'micro' = 'mini',
  conversionRatio: number = 10
): PerformanceBreakdownData {
  if (trades.length === 0) {
    return {
      daily: [],
      weekly: [],
      monthly: [],
      quarterly: [],
      yearly: [],
    };
  }

  return {
    daily: calculatePeriodBreakdown(trades, startingCapital, 'daily', contractSize, conversionRatio),
    weekly: calculatePeriodBreakdown(trades, startingCapital, 'weekly', contractSize, conversionRatio),
    monthly: calculatePeriodBreakdown(trades, startingCapital, 'monthly', contractSize, conversionRatio),
    quarterly: calculatePeriodBreakdown(trades, startingCapital, 'quarterly', contractSize, conversionRatio),
    yearly: calculatePeriodBreakdown(trades, startingCapital, 'yearly', contractSize, conversionRatio),
  };
}

/**
 * Calculate breakdown for a specific period type
 */
function calculatePeriodBreakdown(
  trades: Trade[],
  startingCapital: number,
  periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly',
  contractSize: 'mini' | 'micro' = 'mini',
  conversionRatio: number = 10
): TimePeriodPerformance[] {
  // Group trades by period
  const periods = new Map<string, Trade[]>();

  for (const trade of trades) {
    const date = trade.exitDate;
    let key: string;
    let startDate: Date;
    let endDate: Date;

    switch (periodType) {
      case 'daily':
        key = date.toISOString().split('T')[0]!;
        startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
        break;
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59);
        key = `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`;
        startDate = weekStart;
        endDate = weekEnd;
        break;
      case 'monthly':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        startDate = new Date(date.getFullYear(), date.getMonth(), 1);
        endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'quarterly':
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        key = `${date.getFullYear()}-Q${quarter}`;
        const quarterStartMonth = (quarter - 1) * 3;
        startDate = new Date(date.getFullYear(), quarterStartMonth, 1);
        endDate = new Date(date.getFullYear(), quarterStartMonth + 3, 0, 23, 59, 59);
        break;
      case 'yearly':
        key = String(date.getFullYear());
        startDate = new Date(date.getFullYear(), 0, 1);
        endDate = new Date(date.getFullYear(), 11, 31, 23, 59, 59);
        break;
    }

    if (!periods.has(key)) {
      periods.set(key, []);
    }
    periods.get(key)!.push(trade);

    // Store dates for this period (will be overwritten with same values)
    if (!periods.has(`${key}_dates`)) {
      (periods as any).set(`${key}_dates`, { startDate, endDate });
    }
  }

  // Calculate metrics for each period
  const results: TimePeriodPerformance[] = [];

  for (const [period, periodTrades] of Array.from(periods.entries())) {
    if (period.endsWith('_dates')) continue;

    const dates = (periods as any).get(`${period}_dates`);
    
    // Apply contract conversion to P&L
    const totalPnL = periodTrades.reduce((sum, t) => {
      let pnl = t.pnl / 100;
      if (contractSize === 'micro') {
        pnl = pnl / conversionRatio;
      }
      return sum + pnl;
    }, 0);
    const returnPercent = (totalPnL / startingCapital) * 100;

    const winningTradesList = periodTrades.filter(t => t.pnl > 0);
    const losingTradesList = periodTrades.filter(t => t.pnl < 0);

    const totalWins = winningTradesList.reduce((sum, t) => {
      let pnl = t.pnl / 100;
      if (contractSize === 'micro') {
        pnl = pnl / conversionRatio;
      }
      return sum + pnl;
    }, 0);
    const totalLosses = Math.abs(losingTradesList.reduce((sum, t) => {
      let pnl = t.pnl / 100;
      if (contractSize === 'micro') {
        pnl = pnl / conversionRatio;
      }
      return sum + pnl;
    }, 0));

    const avgWin = winningTradesList.length > 0 ? totalWins / winningTradesList.length : 0;
    const avgLoss = losingTradesList.length > 0 ? totalLosses / losingTradesList.length : 0;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : (totalWins > 0 ? Infinity : 0);

    results.push({
      period,
      periodType,
      startDate: dates.startDate,
      endDate: dates.endDate,
      trades: periodTrades.length,
      winningTrades: winningTradesList.length,
      losingTrades: losingTradesList.length,
      totalPnL,
      returnPercent,
      winRate: (winningTradesList.length / periodTrades.length) * 100,
      avgWin,
      avgLoss,
      profitFactor: profitFactor === Infinity ? 0 : profitFactor,
    });
  }

  // Sort by period descending (most recent first)
  return results.sort((a, b) => b.period.localeCompare(a.period));
}

/**
 * Get ISO week number for a date
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}


/**
 * Get top N performing periods by return percentage
 */
export function getTopPerformers(
  breakdowns: Array<{
    period: string;
    returnPercent: number;
    pnl: number;
    trades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    profitFactor: number;
    avgWin: number;
    avgLoss: number;
    periodType: string;
    startDate: Date;
    endDate: Date;
  }>,
  limit: number = 10
) {
  return [...breakdowns]
    .sort((a, b) => b.returnPercent - a.returnPercent)
    .slice(0, limit);
}

/**
 * Get worst N performing periods by return percentage
 */
export function getWorstPerformers(
  breakdowns: Array<{
    period: string;
    returnPercent: number;
    pnl: number;
    trades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    profitFactor: number;
    avgWin: number;
    avgLoss: number;
    periodType: string;
    startDate: Date;
    endDate: Date;
  }>,
  limit: number = 10
) {
  return [...breakdowns]
    .sort((a, b) => a.returnPercent - b.returnPercent)
    .slice(0, limit);
}

/**
 * Analyze performance by day of week (0=Sunday, 6=Saturday)
 */
export function getDayOfWeekAnalysis(trades: Trade[], startingCapital: number) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayStats: Record<number, {
    trades: Trade[];
    totalPnL: number;
    winningTrades: number;
    losingTrades: number;
  }> = {};

  // Initialize all days
  for (let i = 0; i < 7; i++) {
    dayStats[i] = {
      trades: [],
      totalPnL: 0,
      winningTrades: 0,
      losingTrades: 0,
    };
  }

  // Group trades by exit day of week
  trades.forEach(trade => {
    const dayOfWeek = trade.exitDate.getDay();
    dayStats[dayOfWeek].trades.push(trade);
    dayStats[dayOfWeek].totalPnL += trade.pnl;
    if (trade.pnl > 0) {
      dayStats[dayOfWeek].winningTrades++;
    } else if (trade.pnl < 0) {
      dayStats[dayOfWeek].losingTrades++;
    }
  });

  // Calculate metrics for each day
  return Object.entries(dayStats).map(([day, stats]) => {
    const dayNum = parseInt(day);
    const totalTrades = stats.trades.length;
    const winRate = totalTrades > 0 ? (stats.winningTrades / totalTrades) * 100 : 0;
    const returnPercent = (stats.totalPnL / startingCapital) * 100;

    const wins = stats.trades.filter(t => t.pnl > 0);
    const losses = stats.trades.filter(t => t.pnl < 0);
    const totalWins = wins.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    return {
      day: dayNames[dayNum],
      dayOfWeek: dayNum,
      trades: totalTrades,
      pnl: stats.totalPnL / 100, // Convert to dollars
      returnPercent,
      winningTrades: stats.winningTrades,
      losingTrades: stats.losingTrades,
      winRate,
      profitFactor,
      avgWin: wins.length > 0 ? totalWins / wins.length / 100 : 0,
      avgLoss: losses.length > 0 ? totalLosses / losses.length / 100 : 0,
    };
  }).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}

/**
 * Analyze performance by month of year (1=Jan, 12=Dec)
 */
export function getMonthOfYearAnalysis(trades: Trade[], startingCapital: number) {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const monthStats: Record<number, {
    trades: Trade[];
    totalPnL: number;
    winningTrades: number;
    losingTrades: number;
  }> = {};

  // Initialize all months
  for (let i = 1; i <= 12; i++) {
    monthStats[i] = {
      trades: [],
      totalPnL: 0,
      winningTrades: 0,
      losingTrades: 0,
    };
  }

  // Group trades by exit month
  trades.forEach(trade => {
    const month = trade.exitDate.getMonth() + 1; // 0-indexed to 1-indexed
    monthStats[month].trades.push(trade);
    monthStats[month].totalPnL += trade.pnl;
    if (trade.pnl > 0) {
      monthStats[month].winningTrades++;
    } else if (trade.pnl < 0) {
      monthStats[month].losingTrades++;
    }
  });

  // Calculate metrics for each month
  return Object.entries(monthStats).map(([month, stats]) => {
    const monthNum = parseInt(month);
    const totalTrades = stats.trades.length;
    const winRate = totalTrades > 0 ? (stats.winningTrades / totalTrades) * 100 : 0;
    const returnPercent = (stats.totalPnL / startingCapital) * 100;

    const wins = stats.trades.filter(t => t.pnl > 0);
    const losses = stats.trades.filter(t => t.pnl < 0);
    const totalWins = wins.reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    return {
      month: monthNames[monthNum - 1],
      monthOfYear: monthNum,
      trades: totalTrades,
      pnl: stats.totalPnL / 100, // Convert to dollars
      returnPercent,
      winningTrades: stats.winningTrades,
      losingTrades: stats.losingTrades,
      winRate,
      profitFactor,
      avgWin: wins.length > 0 ? totalWins / wins.length / 100 : 0,
      avgLoss: losses.length > 0 ? totalLosses / losses.length / 100 : 0,
    };
  }).sort((a, b) => a.monthOfYear - b.monthOfYear);
}
