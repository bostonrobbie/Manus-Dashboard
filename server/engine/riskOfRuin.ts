export interface RiskOfRuinInput {
  winRate: number; // 0-1
  avgWin: number;
  avgLoss: number;
  riskPerTradePct: number; // fraction of equity risked per trade (0-1)
  startingEquity?: number;
}

export interface RiskOfRuinResult {
  riskOfRuinFraction: number; // 0-1
  riskOfRuinPct: number; // 0-100
  breakEvenWinRate: number; // 0-1
  edgePerTrade: number;
  riskPerTradePct: number;
  startingEquity: number;
  riskUnits: number;
}

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

export function computeRiskOfRuin(input: RiskOfRuinInput): RiskOfRuinResult {
  const winRate = clamp01(Number.isFinite(input.winRate) ? input.winRate : 0);
  const lossRate = 1 - winRate;
  const avgWin = Math.max(Number.isFinite(input.avgWin) ? input.avgWin : 0, 0);
  const avgLoss = Math.max(Number.isFinite(input.avgLoss) ? Math.abs(input.avgLoss) : 0, 0);
  const riskPerTradePct = clamp01(Number.isFinite(input.riskPerTradePct) ? input.riskPerTradePct : 0);
  const startingEquity = Number.isFinite(input.startingEquity) ? Number(input.startingEquity) : 100_000;

  const breakEvenWinRate = avgWin + avgLoss > 0 ? avgLoss / (avgLoss + avgWin) : 0;
  const edgePerTrade = winRate * avgWin - lossRate * avgLoss;

  // Gambler's ruin style approximation: probability of ruin when risking a fixed % per trial
  const riskAmount = startingEquity * riskPerTradePct;
  const riskUnits = riskAmount > 0 ? Math.max(Math.floor(startingEquity / riskAmount), 0) : 0;

  let riskOfRuinFraction = 1;
  if (riskUnits > 0 && avgWin > 0 && avgLoss > 0 && winRate > 0) {
    const qOverP = lossRate / winRate;
    if (qOverP <= 0) {
      riskOfRuinFraction = 0;
    } else {
      // cap exponent to avoid infinities
      const exponent = Math.min(riskUnits, 10_000);
      riskOfRuinFraction = Math.pow(qOverP, exponent);
      riskOfRuinFraction = clamp01(Number.isFinite(riskOfRuinFraction) ? riskOfRuinFraction : 1);
    }
  }

  return {
    riskOfRuinFraction,
    riskOfRuinPct: riskOfRuinFraction * 100,
    breakEvenWinRate,
    edgePerTrade,
    riskPerTradePct,
    startingEquity,
    riskUnits,
  };
}
