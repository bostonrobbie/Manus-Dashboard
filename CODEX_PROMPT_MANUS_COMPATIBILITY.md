# Codex Task: Achieve 100% Manus Compatibility

**Repository**: bostonrobbie/Manus-Dashboard  
**Target Environment**: Manus Platform (trading-dashboard-frontend)  
**Strategy**: Incremental Feature Merge (Option A)  
**Date**: December 3, 2025

---

## Mission

Restructure the GitHub repository code to be **100% compatible** with the Manus platform template structure. Manus AI has validated your work and confirmed that the code quality is excellent, but the file structure and schema need to be adapted to match the Manus web-db-user template.

**Goal**: Make the GitHub repository code ready for direct copy-paste into the Manus deployment without any structural changes.

---

## What Manus AI Found

Manus AI validated your work and reported:

✅ **Code Quality: Excellent**
- All static checks pass (lint, typecheck, test)
- PostgreSQL → MySQL conversion successful
- Workspace logic completely removed
- Roles simplified to admin/user
- No @ts-nocheck directives

❌ **Deployment: Blocked by 3 Issues**
1. File structure incompatibility (server/src/ vs server/)
2. Schema incompatibility (missing tables on both sides)
3. Deployment strategy undefined

**Manus AI's Recommendation**: Incremental Feature Merge (Option A) - Restructure code to match Manus template.

---

## Your Task: 3-Phase Restructuring

### Phase 1: Match Manus File Structure (CRITICAL)
### Phase 2: Merge Database Schemas (CRITICAL)
### Phase 3: Prepare for Feature Transfer (IMPORTANT)

---

## Phase 1: Match Manus File Structure

### Current GitHub Structure (WRONG for Manus)

```
server/
  src/                          ← ❌ Manus doesn't use src/ subdirectory
    auth/
      context.ts
      manusAdapter.ts
      roles.ts
      types.ts
      userRecords.ts
      workspaceAccess.ts
    db/
      index.ts
    engine/
      portfolio-engine.ts
    routers/
      portfolio.ts
      strategies.ts
      adminData.ts
      analytics.ts
      uploads.ts
      system.ts
      workspaces.ts
    services/
      tradeIngestion.ts
      benchmarkIngestion.ts
      tradePipeline.ts
      uploadLogs.ts
      audit.ts
    trpc/
      context.ts
      index.ts
    app.ts
    health.ts
    index.ts
    version.ts
```

### Target Manus Structure (CORRECT)

```
server/
  _core/                        ← ✅ Manus core files (DO NOT MODIFY)
    context.ts
    cookies.ts
    oauth.ts
    trpc.ts
  routers/                      ← ✅ Move your routers here (FLAT, not nested)
    portfolio.ts
    strategies.ts
    trades.ts
    webhooks.ts
  services/                     ← ✅ Create this directory, move services here
    tradeIngestion.ts
    benchmarkIngestion.ts
    tradePipeline.ts
    uploadLogs.ts
    audit.ts
  tests/                        ← ✅ Move tests here (not server/src/tests/)
    portfolio.test.ts
    ingestion.test.ts
    metrics.test.ts
  portfolio-engine.ts           ← ✅ Move from server/src/engine/ to server/
  db.ts                         ← ✅ Move from server/src/db/index.ts to server/db.ts
  routers.ts                    ← ✅ Main router file (imports all routers)
  storage.ts                    ← ✅ Manus storage helpers (already exists)
```

### Action Items for Phase 1

**1.1: Flatten server/src/ to server/**

```bash
# Move files from server/src/ to server/
mv server/src/engine/portfolio-engine.ts server/portfolio-engine.ts
mv server/src/db/index.ts server/db.ts
mv server/src/health.ts server/health.ts
mv server/src/version.ts server/version.ts

# Move routers directory (keep as subdirectory)
mv server/src/routers server/routers

# Move services directory (keep as subdirectory)
mv server/src/services server/services

# Move tests to server/tests/
mv server/src/tests server/tests

# Delete now-empty server/src/ directory
rm -rf server/src/
```

**1.2: Update ALL Import Paths**

After moving files, you MUST update all import statements:

**Example 1: In server/portfolio-engine.ts**
```typescript
// ❌ OLD (WRONG)
import { getDb } from "./db/index";
import { trades, strategies } from "../../drizzle/schema";

// ✅ NEW (CORRECT)
import { getDb } from "./db";
import { trades, strategies } from "../drizzle/schema";
```

**Example 2: In server/routers/portfolio.ts**
```typescript
// ❌ OLD (WRONG)
import { buildEquityCurve } from "../engine/portfolio-engine";
import { getDb } from "../db/index";
import { protectedProcedure, router } from "../trpc";

// ✅ NEW (CORRECT)
import { buildEquityCurve } from "../portfolio-engine";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
```

**Example 3: In server/services/tradeIngestion.ts**
```typescript
// ❌ OLD (WRONG)
import { getDb } from "../db/index";
import { trades } from "../../drizzle/schema";

// ✅ NEW (CORRECT)
import { getDb } from "../db";
import { trades } from "../../drizzle/schema";
```

**1.3: Update server/routers.ts**

Create or update `server/routers.ts` to import all routers:

```typescript
import { router } from "./_core/trpc";
import { portfolioRouter } from "./routers/portfolio";
import { strategiesRouter } from "./routers/strategies";
import { tradesRouter } from "./routers/trades";
import { webhooksRouter } from "./routers/webhooks";

export const appRouter = router({
  portfolio: portfolioRouter,
  strategies: strategiesRouter,
  trades: tradesRouter,
  webhooks: webhooksRouter,
});

export type AppRouter = typeof appRouter;
```

**1.4: DO NOT MODIFY Manus Core Files**

These files are managed by Manus and should NOT be modified:
- `server/_core/context.ts` - tRPC context with Manus OAuth
- `server/_core/cookies.ts` - Session cookie management
- `server/_core/oauth.ts` - Manus OAuth callback handling
- `server/_core/trpc.ts` - tRPC configuration with protectedProcedure

**If you need auth functionality**, use the existing `protectedProcedure` from `server/_core/trpc.ts`.

**1.5: Remove Duplicate Auth Code**

Since Manus provides OAuth in `server/_core/`, you should:
- ❌ DELETE `server/src/auth/` directory (Manus handles this)
- ❌ DELETE `server/src/trpc/` directory (Manus provides this)
- ✅ USE `import { protectedProcedure, router } from "../_core/trpc"`

**1.6: Verify File Structure**

After restructuring, run:
```bash
# Check that server/src/ no longer exists
ls server/src/  # Should error: "No such file or directory"

# Check that files are in correct locations
ls server/portfolio-engine.ts  # Should exist
ls server/db.ts                # Should exist
ls server/routers/             # Should exist
ls server/services/            # Should exist
ls server/tests/               # Should exist
```

---

## Phase 2: Merge Database Schemas

### Current GitHub Schema (6 tables)

```typescript
// drizzle/schema.ts
export const users = mysqlTable("users", { ... });
export const strategies = mysqlTable("strategies", { ... });
export const trades = mysqlTable("trades", { ... });
export const benchmarks = mysqlTable("benchmarks", { ... });
export const uploadLogs = mysqlTable("uploadLogs", { ... });
export const auditLogs = mysqlTable("auditLogs", { ... });
```

### Current Manus Schema (8 tables)

```typescript
// Manus has these tables that GitHub is missing:
export const positions = mysqlTable("positions", { ... });
export const equityCurve = mysqlTable("equityCurve", { ... });
export const analytics = mysqlTable("analytics", { ... });
export const webhookLogs = mysqlTable("webhookLogs", { ... });
```

### Target Merged Schema (10 tables)

You need to **ADD 4 TABLES** to your GitHub schema to match Manus:

**2.1: Add positions Table**

```typescript
export const positions = mysqlTable("positions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  strategyId: int("strategyId"),
  
  symbol: varchar("symbol", { length: 50 }).notNull(),
  side: mysqlEnum("side", ["long", "short"]).notNull(),
  quantity: varchar("quantity", { length: 30 }).notNull(),
  entryPrice: varchar("entryPrice", { length: 30 }).notNull(),
  entryTime: timestamp("entryTime").notNull(),
  
  currentPrice: varchar("currentPrice", { length: 30 }),
  unrealizedPnL: varchar("unrealizedPnL", { length: 30 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Position = typeof positions.$inferSelect;
export type InsertPosition = typeof positions.$inferInsert;
```

**2.2: Add equityCurve Table**

```typescript
export const equityCurve = mysqlTable("equityCurve", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  strategyId: int("strategyId"),
  
  date: varchar("date", { length: 16 }).notNull(),
  equity: varchar("equity", { length: 30 }).notNull(),
  dailyReturn: varchar("dailyReturn", { length: 20 }),
  cumulativeReturn: varchar("cumulativeReturn", { length: 20 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EquityCurve = typeof equityCurve.$inferSelect;
export type InsertEquityCurve = typeof equityCurve.$inferInsert;
```

**2.3: Add analytics Table**

```typescript
export const analytics = mysqlTable("analytics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  strategyId: int("strategyId"),
  
  date: varchar("date", { length: 16 }).notNull(),
  
  // Rolling metrics
  rollingReturn: varchar("rollingReturn", { length: 20 }),
  rollingSharpe: varchar("rollingSharpe", { length: 20 }),
  rollingVolatility: varchar("rollingVolatility", { length: 20 }),
  rollingMaxDrawdown: varchar("rollingMaxDrawdown", { length: 20 }),
  
  // Trade metrics
  tradesCount: int("tradesCount").default(0),
  winRate: varchar("winRate", { length: 20 }),
  avgWin: varchar("avgWin", { length: 20 }),
  avgLoss: varchar("avgLoss", { length: 20 }),
  profitFactor: varchar("profitFactor", { length: 20 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Analytics = typeof analytics.$inferSelect;
export type InsertAnalytics = typeof analytics.$inferInsert;
```

**2.4: Add webhookLogs Table**

```typescript
export const webhookLogs = mysqlTable("webhookLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  source: varchar("source", { length: 50 }).notNull().default("tradingview"),
  event: varchar("event", { length: 50 }).notNull(),
  
  payload: text("payload"),
  status: mysqlEnum("status", ["success", "error", "pending"]).notNull().default("pending"),
  errorMessage: text("errorMessage"),
  
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = typeof webhookLogs.$inferInsert;
```

**2.5: Update benchmarks Table**

The Manus benchmarks table has different columns than GitHub. You need to **merge** them:

```typescript
export const benchmarks = mysqlTable("benchmarks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  symbol: varchar("symbol", { length: 64 }).notNull().default("SPY"),
  date: varchar("date", { length: 16 }).notNull(),
  
  // GitHub columns (keep these)
  close: decimal("close", { precision: 18, scale: 4 }).notNull(),
  
  // Manus columns (add these)
  open: varchar("open", { length: 30 }),
  high: varchar("high", { length: 30 }),
  low: varchar("low", { length: 30 }),
  volume: varchar("volume", { length: 30 }),
  dailyReturn: varchar("dailyReturn", { length: 20 }),
  
  uploadId: int("uploadId"),
  deletedAt: timestamp("deletedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

**2.6: Keep Your GitHub Tables**

These tables are good and should be kept as-is:
- ✅ `users` - Already compatible
- ✅ `strategies` - Already compatible
- ✅ `trades` - Already compatible (but see note below about decimal vs varchar)
- ✅ `uploadLogs` - New table, keep it
- ✅ `auditLogs` - New table, keep it

**2.7: Note on Decimal vs Varchar**

Your GitHub schema uses `decimal` for prices:
```typescript
entryPrice: decimal("entryPrice", { precision: 18, scale: 4 })
```

Manus currently uses `varchar` for prices:
```typescript
entryPrice: varchar("entryPrice", { length: 30 })
```

**Decision**: Keep your `decimal` types - they are better. Manus will adapt the code to work with decimal types. This is the correct approach for financial data.

**2.8: Verify Schema**

After adding tables, your schema should have **10 tables total**:
1. users ✅
2. strategies ✅
3. trades ✅
4. positions ✅ (ADDED)
5. equityCurve ✅ (ADDED)
6. analytics ✅ (ADDED)
7. benchmarks ✅ (MERGED)
8. webhookLogs ✅ (ADDED)
9. uploadLogs ✅
10. auditLogs ✅

---

## Phase 3: Prepare for Feature Transfer

### 3.1: Create Feature Manifest

Create a file `FEATURE_MANIFEST.md` that lists all features ready for transfer to Manus:

```markdown
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
```

### 3.2: Test Everything

Before marking as "ready for Manus", run all checks:

```bash
# Install dependencies
pnpm install

# Run all checks
pnpm lint          # Should pass
pnpm typecheck     # Should pass
pnpm test:all      # Should pass

# Verify file structure
ls server/portfolio-engine.ts  # Should exist
ls server/db.ts                # Should exist
ls server/routers/             # Should exist
ls server/services/            # Should exist
ls server/src/                 # Should NOT exist (deleted)

# Verify schema has 10 tables
grep "export const.*mysqlTable" drizzle/schema.ts | wc -l  # Should output: 10
```

### 3.3: Update COORDINATION_LOG.md

After completing all 3 phases, update `COORDINATION_LOG.md`:

```markdown
## COMPLETED BY CODEX

### ✅ Session 5: Manus Compatibility Restructuring (Dec 3, 2025)

**Completed Tasks:**
- ✅ Phase 1: Restructured file paths to match Manus template
  - Flattened server/src/ to server/
  - Moved portfolio-engine.ts to server root
  - Moved db/index.ts to server/db.ts
  - Updated all import paths
  - Removed duplicate auth/trpc code (using Manus _core/)
- ✅ Phase 2: Merged database schemas
  - Added positions table (Manus requirement)
  - Added equityCurve table (Manus requirement)
  - Added analytics table (Manus requirement)
  - Added webhookLogs table (Manus requirement)
  - Merged benchmarks table (GitHub + Manus columns)
  - Kept uploadLogs and auditLogs tables (GitHub additions)
  - Total: 10 tables in merged schema
- ✅ Phase 3: Prepared for feature transfer
  - Created FEATURE_MANIFEST.md
  - Verified all static checks pass
  - Documented all features ready for transfer

**Files Changed:**
- Moved: server/src/engine/portfolio-engine.ts → server/portfolio-engine.ts
- Moved: server/src/db/index.ts → server/db.ts
- Moved: server/src/routers/* → server/routers/*
- Moved: server/src/services/* → server/services/*
- Updated: All import paths in server files
- Updated: drizzle/schema.ts (added 4 tables, merged benchmarks)
- Created: FEATURE_MANIFEST.md
- Deleted: server/src/ directory (no longer needed)
- Deleted: server/src/auth/ (using Manus _core/)
- Deleted: server/src/trpc/ (using Manus _core/)

**Commands Run:**
```bash
pnpm lint       # ✅ PASS
pnpm typecheck  # ✅ PASS
pnpm test:all   # ✅ PASS
```

**Status:**
- ✅ File structure matches Manus template
- ✅ Schema merged (10 tables total)
- ✅ All import paths updated
- ✅ All static checks pass
- ✅ Ready for Manus to copy features

**Next Steps:**
- Waiting for Manus AI to review and approve
- Manus AI will copy features one at a time to production
- Manus AI will test each feature before moving to next
```

---

## Critical Rules for 100% Manus Compatibility

### ✅ DO

1. **File Structure**
   - ✅ Use flat `server/` directory (no `server/src/`)
   - ✅ Put routers in `server/routers/`
   - ✅ Put services in `server/services/`
   - ✅ Put tests in `server/tests/`
   - ✅ Put portfolio-engine.ts at `server/portfolio-engine.ts`
   - ✅ Put db.ts at `server/db.ts`

2. **Imports**
   - ✅ Use `import { protectedProcedure, router } from "../_core/trpc"`
   - ✅ Use `import { getDb } from "../db"` (not "./db/index")
   - ✅ Use relative paths from current file location

3. **Schema**
   - ✅ Use MySQL syntax (mysqlTable, mysqlEnum, int, decimal, timestamp)
   - ✅ Use camelCase column names
   - ✅ Include all 10 tables (6 GitHub + 4 Manus)
   - ✅ Use decimal for financial data (better than varchar)

4. **Auth**
   - ✅ Use Manus OAuth from `server/_core/`
   - ✅ Use `protectedProcedure` for authenticated endpoints
   - ✅ Use 2 roles: "admin" and "user"
   - ✅ Access user via `ctx.user` in procedures

5. **Testing**
   - ✅ Ensure `pnpm lint` passes
   - ✅ Ensure `pnpm typecheck` passes
   - ✅ Ensure `pnpm test:all` passes

### ❌ DON'T

1. **File Structure**
   - ❌ DON'T use `server/src/` subdirectory
   - ❌ DON'T create nested auth/ or trpc/ directories
   - ❌ DON'T modify files in `server/_core/` (Manus managed)

2. **Imports**
   - ❌ DON'T import from `server/src/*` (doesn't exist)
   - ❌ DON'T import from `../db/index` (use `../db`)
   - ❌ DON'T import from custom auth code (use Manus _core/)

3. **Schema**
   - ❌ DON'T use PostgreSQL syntax (pgTable, serial, numeric)
   - ❌ DON'T use snake_case column names
   - ❌ DON'T include workspace tables or columns
   - ❌ DON'T use 4-level roles (OWNER/ADMIN/USER/VIEWER)

4. **Auth**
   - ❌ DON'T implement custom OAuth
   - ❌ DON'T create custom JWT handling
   - ❌ DON'T add workspace scoping
   - ❌ DON'T use more than 2 roles

---

## Verification Checklist

Before marking as complete, verify:

### File Structure ✅
- [ ] `server/src/` directory deleted
- [ ] `server/portfolio-engine.ts` exists
- [ ] `server/db.ts` exists
- [ ] `server/routers/` exists with all routers
- [ ] `server/services/` exists with all services
- [ ] `server/tests/` exists with all tests
- [ ] `server/_core/` NOT modified (Manus managed)

### Import Paths ✅
- [ ] All imports updated after file moves
- [ ] No imports from `server/src/*`
- [ ] All imports use correct relative paths
- [ ] Auth imports from `../_core/trpc`

### Schema ✅
- [ ] 10 tables total in drizzle/schema.ts
- [ ] positions table added
- [ ] equityCurve table added
- [ ] analytics table added
- [ ] webhookLogs table added
- [ ] benchmarks table merged
- [ ] All tables use MySQL syntax
- [ ] All columns use camelCase

### Static Checks ✅
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test:all` passes

### Documentation ✅
- [ ] FEATURE_MANIFEST.md created
- [ ] COORDINATION_LOG.md updated
- [ ] All changes documented

---

## Expected Timeline

- **Phase 1 (File Structure)**: 2-3 hours
- **Phase 2 (Schema Merge)**: 1-2 hours
- **Phase 3 (Feature Manifest)**: 1 hour
- **Total**: 4-6 hours

---

## Questions?

If you encounter any issues or have questions:

1. Check `MANUS_REQUIREMENTS.md` for detailed rules
2. Check `MANUS_GITHUB_COMPATIBILITY_ASSESSMENT.md` for analysis
3. Update `COORDINATION_LOG.md` under "QUESTIONS FOR MANUS"
4. Commit and push to GitHub

---

## Success Criteria

You'll know you're done when:

1. ✅ `server/src/` directory no longer exists
2. ✅ All files are in Manus-compatible locations
3. ✅ All imports are updated and working
4. ✅ Schema has 10 tables (6 GitHub + 4 Manus)
5. ✅ `pnpm lint` passes
6. ✅ `pnpm typecheck` passes
7. ✅ `pnpm test:all` passes
8. ✅ FEATURE_MANIFEST.md exists
9. ✅ COORDINATION_LOG.md updated
10. ✅ Committed to GitHub with message: `[CODEX] Restructured for 100% Manus compatibility - Ready for feature transfer`

---

**Good luck! Manus AI is waiting to test your restructured code. 🚀**
