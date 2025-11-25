  const predicates: any[] = [eq(trades.userId, userId)];

  if (strategyIds && strategyIds.length > 0) {
    // simple "IN" workaround: or / eq chain usually; adjust to your Drizzle version.
    predicates.push(trades.strategyId.in(strategyIds));
  }

  if (startDate && endDate) {
    predicates.push(
      between(