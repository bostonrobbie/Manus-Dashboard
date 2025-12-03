# Feature Manifest

## Ready for Transfer to Manus

### Backend Features

1. **Portfolio Engine Enhancements**
   - File: `server/portfolio-engine.ts`
   - Functions: buildCustomPortfolio, buildPortfolioOverview, buildDrawdownCurves, calculateRollingMetrics
   - Status: ✅ Ready
   - Dependencies: None

2. **Trade Ingestion Service**
   - File: `server/services/tradeIngestion.ts`
   - Functions: importTradesFromCsv, validateTradeData, deduplicateTrades
   - Status: ✅ Ready
   - Dependencies: uploadLogs table

3. **Benchmark Ingestion Service**
   - File: `server/services/benchmarkIngestion.ts`
   - Functions: importBenchmarksFromCsv, validateBenchmarkData
   - Status: ✅ Ready
   - Dependencies: uploadLogs table

4. **Upload Logs Service**
   - File: `server/services/uploadLogs.ts`
   - Functions: createUploadLog, updateUploadLog, getUploadLogs
   - Status: ✅ Ready
   - Dependencies: uploadLogs table

5. **Audit Service**
   - File: `server/services/audit.ts`
   - Functions: logAction, getAuditLogs
   - Status: ✅ Ready
   - Dependencies: auditLogs table

### Frontend Features

1. **Export Trades Button**
   - File: `client/src/components/ExportTradesButton.tsx`
   - Status: ✅ Ready
   - Dependencies: portfolio.exportTrades endpoint

2. **Monte Carlo Panel**
   - File: `client/src/components/MonteCarloPanel.tsx`
   - Status: ✅ Ready
   - Dependencies: portfolio.monteCarlo endpoint

3. **Rolling Metrics Component**
   - File: `client/src/components/RollingMetrics.tsx`
   - Status: ✅ Ready
   - Dependencies: analytics table

4. **Today Playbook Component**
   - File: `client/src/components/TodayPlaybook.tsx`
   - Status: ✅ Ready
   - Dependencies: trades table

### Documentation

All 23 documentation files are ready for transfer.
