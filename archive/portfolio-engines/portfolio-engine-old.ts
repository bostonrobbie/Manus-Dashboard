
  if (strategyList.length === 0) {
    console.warn(`[Portfolio Engine] Strategy ${strategyId} not found for user ${userId}`);
    return [];
  }

  const strategy = strategyList[0] as unknown as Strategy;
  
  // Determine initial capital
  const initialCapital: number = options.initialCapitalOverride 
    || strategy.initialCapital 
    || defaultInitialCapitalForSymbol(strategy.symbol);

  // 2. Load Relevant Trades
  const conditions = [
    eq(trades.userId, userId),
    eq(trades.strategyId, strategyId),
    isNotNull(trades.exitTime),
    isNotNull(trades.exitPrice),
  ];

  if (options.startDate) {
    conditions.push(gte(trades.exitTime, options.startDate));
  }
  if (options.endDate) {
    conditions.push(lte(trades.exitTime, options.endDate));
  }

  const tradesList = await db.select()
    .from(trades)
    .where(and(...conditions))
    .orderBy(trades.exitTime);

  if (tradesList.length === 0) {
    return [{
      date: new Date(),
      equity: initialCapital,
      dailyPnL: 0,
      dailyReturn: 0,
    }];
  }

  // 3. Group PnL by Date
  const pnlByDate = new Map<string, number>();
  
  for (const trade of tradesList) {
    const pnl = computeTradePnl(trade as any);
    const dateKey = normalizeToDateKey(trade.exitTime!);
    pnlByDate.set(dateKey, (pnlByDate.get(dateKey) || 0) + pnl);
  }

  // 4. Determine Date Range
  const dateKeys = Array.from(pnlByDate.keys()).sort();
  if (dateKeys.length === 0) {
    return [{
      date: new Date(),
      equity: initialCapital,
      dailyPnL: 0,
      dailyReturn: 0,
    }];
  }

  const firstDate = new Date(dateKeys[0] + 'T00:00:00Z');
  const lastDate = new Date(dateKeys[dateKeys.length - 1] + 'T00:00:00Z');

  // 5. Iterate Day-by-Day and Build Equity
  const points: EquityPoint[] = [];
  let equity: number = initialCapital;
  let previousEquity: number = equity;

  for (let d = new Date(firstDate); d <= lastDate; d = addOneDay(d)) {
    const key = normalizeToDateKey(d);
    const dayPnl = pnlByDate.get(key) || 0;

    equity += dayPnl;

    let dailyReturn = 0;
    if (points.length > 0 && previousEquity > 0) {
      dailyReturn = equity / previousEquity - 1;
    }

    points.push({
      date: new Date(d),
      equity,
      dailyPnL: dayPnl,
      dailyReturn,
    });

    previousEquity = equity;
  }

  // 6. Clean the Series
  return cleanEquitySeries(points);
}

// ============================================================================
// AGGREGATED EQUITY CURVE (MULTIPLE STRATEGIES)
// ============================================================================

/**
 * Build aggregated equity curve across multiple strategies
 * 
 * Algorithm:
 * 1. Determine strategy set (by IDs or type)
 * 2. Build individual curves for each strategy
 * 3. Construct global date index (union of all dates)
 * 4. Iteratively sum equities (sticky equity between trading days)
 * 5. Clean combined series
 */
export async function buildAggregatedEquityCurve(
  userId: number,
  filter: {
    strategyIds?: number[];
    strategyType?: 'swing' | 'intraday' | 'all';
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<EquityPoint[]> {
  const db = await getDb();
  if (!db) return [];

  // 1. Determine Strategy Set
  let targetStrategyIds: number[] = [];

  if (filter.strategyIds && filter.strategyIds.length > 0) {
    targetStrategyIds = filter.strategyIds;
  } else {
    const conditions = [eq(strategies.userId, userId)];
    
    if (filter.strategyType && filter.strategyType !== 'all') {
      conditions.push(eq(strategies.type, filter.strategyType));
      console.log(`[buildAggregatedEquityCurve] Filtering for type: ${filter.strategyType}`);
    }

    const stratList = await db.select({ id: strategies.id, name: strategies.name, type: strategies.type })
      .from(strategies)
      .where(and(...conditions));
    
    console.log(`[buildAggregatedEquityCurve] Found ${stratList.length} strategies:`, stratList.map(s => `${s.name}(${s.type})`));
    
    targetStrategyIds = stratList.map(s => s.id);
  }

  if (targetStrategyIds.length === 0) {
    return [{
      date: new Date(),
      equity: 0,
      dailyPnL: 0,
      dailyReturn: 0,
    }];