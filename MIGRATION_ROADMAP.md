# GitHub → Manus Migration Roadmap

**Document Version**: 1.0  
**Created**: December 2, 2025  
**Author**: Manus AI  
**Purpose**: Detailed step-by-step plan for transferring GitHub repository features to Manus deployment

---

## Executive Summary

This roadmap outlines a **3-phase, 10-day migration plan** to transfer all compatible features from the GitHub repository (bostonrobbie/Manus-Dashboard) into the production Manus deployment. The migration is structured to minimize risk, maximize testing, and ensure continuous operation of the production dashboard.

**Timeline**: 10 business days (2 weeks)  
**Estimated Effort**: 40-50 hours of development  
**Risk Level**: Low (incremental approach with testing at each phase)  
**Success Probability**: 95% (high confidence based on compatibility analysis)

---

## Migration Overview

### What Will Be Transferred

| Category | Items | Lines of Code | Estimated Time |
|----------|-------|---------------|----------------|
| **Test Suite** | 9 test files | ~900 lines | 4 hours |
| **Documentation** | 21 docs | N/A | 2 hours |
| **Frontend Components** | 4 components | ~400 lines | 6 hours |
| **Portfolio Engine** | 4 functions | ~350 lines | 4 hours |
| **Services** | 4 services | ~1,300 lines | 12 hours |
| **Routers** | 4 routers | ~300 lines | 6 hours |
| **Database Schema** | 3 tables | ~100 lines | 4 hours |
| **Utilities** | 3 files | ~200 lines | 2 hours |

**Total**: ~3,550 lines of code + 21 docs in **40 hours**

### What Will NOT Be Transferred

- ❌ Workspace tables and logic (incompatible with single-tenant Manus)
- ❌ 4-level role system (Manus uses 2 roles)
- ❌ PostgreSQL-specific code (will be converted to MySQL)

---

## Phase 1: Foundation (Days 1-3)

**Goal**: Transfer immediately compatible code and establish testing infrastructure  
**Duration**: 3 days  
**Effort**: 12-16 hours  
**Risk**: Low

### Day 1: Test Suite Migration

**Morning (4 hours):**

1. **Copy 9 Test Files from GitHub** (2 hours)
   ```bash
   # Files to copy:
   server/tests/engine.test.ts          (81 lines)
   server/tests/metrics.test.ts         (42 lines)
   server/tests/export.test.ts          (39 lines)
   server/tests/customPortfolio.test.ts (36 lines)
   server/tests/homeDashboard.test.ts   (70 lines)
   server/tests/timeRange.test.ts       (115 lines)
   server/tests/trpcError.test.ts       (46 lines)
   server/tests/version.test.ts         (20 lines)
   server/tests/metricsProperty.test.ts (38 lines)
   ```

2. **Adapt Tests for Manus Environment** (1 hour)
   - Update import paths to match Manus structure
   - Remove workspace-related test cases
   - Update database mocks to use MySQL syntax
   - Ensure tests use Vitest (not Node.js test runner)

3. **Run Tests and Fix Issues** (1 hour)
   ```bash
   pnpm test
   ```
   - Fix any import errors
   - Fix any type errors
   - Ensure all tests pass

**Afternoon (4 hours):**

4. **Add Property-Based Testing** (2 hours)
   - Set up fast-check library
   - Add property-based tests for metrics
   - Add property-based tests for equity curves

5. **Achieve 50%+ Test Coverage** (2 hours)
   - Run coverage report: `pnpm test --coverage`
   - Identify untested functions
   - Add tests for critical paths

**Deliverables:**
- ✅ 9 test files integrated
- ✅ All tests passing
- ✅ 50%+ test coverage
- ✅ Updated `COORDINATION_LOG.md` with results

**Success Criteria:**
- `pnpm test` passes with 0 failures
- Coverage report shows 50%+ coverage
- No TypeScript errors

---

### Day 2: Documentation Migration

**Morning (2 hours):**

1. **Copy 21 Documentation Files** (1 hour)
   ```bash
   # Files to copy:
   docs/ARCHITECTURE.md
   docs/Backend.md
   docs/Frontend.md
   docs/PortfolioEngine.md
   docs/TRADINGVIEW_WEBHOOKS.md
   docs/DEPLOY_ON_MANUS.md
   docs/MANUS_HANDOFF.md
   docs/MANUS_INTEGRATION_PLAN.md
   docs/CodexTaskGuide.md
   docs/AntigravitySetup.md
   docs/EXTERNAL_AI_INTEGRATION.md
   docs/ADMIN_DATA_MANAGER.md
   docs/DATA_PIPELINE.md
   docs/DOMAIN_MODEL.md
   docs/DevWorkflow.md
   docs/DeveloperGuide.md
   docs/UX_GUIDE.md
   docs/QA_WEAKNESSES.md
   docs/RELEASE_CHECKLIST.md
   docs/MANUS_CONTRACT_CHECKLIST.md
   docs/home-dashboard-upgrade.md
   ```

2. **Update Documentation for Manus** (1 hour)
   - Replace PostgreSQL references with MySQL
   - Remove workspace-related sections
   - Update file paths to match Manus structure
   - Add Manus-specific deployment notes

**Afternoon (2 hours):**

3. **Create Master Documentation Index** (1 hour)
   - Create `docs/README.md` with links to all docs
   - Organize by category (Architecture, Development, Deployment)
   - Add quick start guide

4. **Review and Test Documentation** (1 hour)
   - Verify all links work
   - Ensure code examples are correct
   - Test deployment instructions

**Deliverables:**
- ✅ 21 docs in `docs/` directory
- ✅ Master index created
- ✅ All Manus-specific updates applied

**Success Criteria:**
- All documentation accessible
- No broken links
- Code examples match current codebase

---

### Day 3: Portfolio Engine Enhancements

**Morning (4 hours):**

1. **Add buildCustomPortfolio() Function** (2 hours)
   - Copy from GitHub: `server/src/engine/portfolio-engine.ts` (lines 500-669)
   - Adapt for Manus schema
   - Add tests in `server/tests/customPortfolio.test.ts`
   - Test with sample data

2. **Add buildPortfolioOverview() Function** (1 hour)
   - Copy from GitHub: `server/src/engine/portfolio-engine.ts` (lines 700-778)
   - Adapt for Manus schema
   - Add tests
   - Test with sample data

3. **Add buildDrawdownCurves() Function** (1 hour)
   - Copy from GitHub: `server/src/engine/portfolio-engine.ts` (lines 800-920)
   - Adapt for Manus schema
   - Add tests
   - Test with sample data

**Afternoon (2 hours):**

4. **Add calculateRollingMetrics() Function** (1 hour)
   - Copy from GitHub: `server/src/engine/portfolio-engine.ts` (lines 950-1040)
   - Adapt for Manus schema
   - Add tests

5. **Integration Testing** (1 hour)
   - Test all 4 new functions together
   - Verify performance with 10k+ trades
   - Run full test suite

**Deliverables:**
- ✅ 4 new portfolio engine functions
- ✅ Tests for all functions
- ✅ Performance validated

**Success Criteria:**
- All functions work with Manus schema
- Tests pass
- No performance degradation

---

## Phase 2: Database & Services (Days 4-7)

**Goal**: Convert database schema to MySQL and migrate all services  
**Duration**: 4 days  
**Effort**: 20-24 hours  
**Risk**: Medium (database conversion)

### Day 4: Database Schema Conversion

**Morning (4 hours):**

1. **Convert Schema to MySQL** (2 hours)
   - Copy GitHub schema: `drizzle/schema.ts`
   - Convert all PostgreSQL syntax to MySQL:
     - `pgTable` → `mysqlTable`
     - `pgEnum` → `mysqlEnum`
     - `serial` → `int().autoincrement()`
     - `numeric` → `decimal`
     - `timestamp with timezone` → `timestamp`
   - Remove workspace tables (`workspaces`, `workspaceMembers`)
   - Remove `workspaceId` and `ownerId` columns from all tables
   - Change snake_case to camelCase

2. **Add New Tables** (1 hour)
   - Add `uploadLogs` table (for CSV upload tracking)
   - Add `auditLogs` table (for audit trail)
   - Ensure all columns use camelCase

3. **Test Schema** (1 hour)
   ```bash
   pnpm db:push
   ```
   - Verify migrations generate correctly
   - Check for any errors
   - Verify tables created in database

**Afternoon (2 hours):**

4. **Update Existing Code for New Schema** (1 hour)
   - Update all queries to use new table names
   - Update all queries to remove workspace filters
   - Update types

5. **Run Full Test Suite** (1 hour)
   ```bash
   pnpm test
   ```
   - Fix any schema-related test failures
   - Update test fixtures

**Deliverables:**
- ✅ Schema converted to MySQL
- ✅ New tables added
- ✅ Migrations applied
- ✅ All tests passing

**Success Criteria:**
- `pnpm db:push` succeeds
- Database has all tables
- All tests pass

---

### Day 5: Trade Ingestion Service

**Morning (4 hours):**

1. **Copy Trade Ingestion Service** (1 hour)
   - Copy from GitHub: `server/src/services/tradeIngestion.ts` (730 lines)
   - Create `server/services/` directory if needed

2. **Convert to MySQL** (2 hours)
   - Update all database queries to use MySQL schema
   - Remove workspace parameters
   - Remove workspace filtering
   - Update natural key logic

3. **Add Tests** (1 hour)
   - Copy from GitHub: `server/tests/ingestion.test.ts` (166 lines)
   - Adapt for MySQL
   - Run tests

**Afternoon (3 hours):**

4. **Add Upload Tracking** (2 hours)
   - Integrate with `uploadLogs` table
   - Track row counts, errors, warnings
   - Add status updates

5. **Integration Testing** (1 hour)
   - Test CSV import end-to-end
   - Test with real CSV files
   - Test error handling

**Deliverables:**
- ✅ Trade ingestion service working
- ✅ Upload tracking functional
- ✅ Tests passing

**Success Criteria:**
- Can import CSV trades successfully
- Upload logs recorded correctly
- Tests pass

---

### Day 6: Additional Services

**Morning (4 hours):**

1. **Add Benchmark Ingestion Service** (2 hours)
   - Copy from GitHub: `server/src/services/benchmarkIngestion.ts` (180 lines)
   - Convert to MySQL
   - Add tests

2. **Add Audit Service** (2 hours)
   - Copy from GitHub: `server/src/services/audit.ts` (150 lines)
   - Convert to MySQL
   - Add tests

**Afternoon (3 hours):**

3. **Add Admin Data Service** (2 hours)
   - Copy from GitHub: `server/src/services/adminData.ts` (200 lines)
   - Convert to MySQL
   - Add tests

4. **Integration Testing** (1 hour)
   - Test all services together
   - Verify audit logging works
   - Test admin data operations

**Deliverables:**
- ✅ 3 new services added
- ✅ All services tested
- ✅ Audit logging functional

**Success Criteria:**
- All services work with MySQL
- Tests pass
- Audit logs recorded

---

### Day 7: Router Updates

**Morning (4 hours):**

1. **Add adminData Router** (1.5 hours)
   - Copy from GitHub: `server/src/routers/adminData.ts` (141 lines)
   - Convert to MySQL
   - Remove workspace logic
   - Add to main router

2. **Add analytics Router** (1 hour)
   - Copy from GitHub: `server/src/routers/analytics.ts` (62 lines)
   - Convert to MySQL
   - Add to main router

3. **Add uploads Router** (1.5 hours)
   - Copy from GitHub: `server/src/routers/uploads.ts` (76 lines)
   - Convert to MySQL
   - Add to main router

**Afternoon (3 hours):**

4. **Update Existing Routers** (2 hours)
   - Update `portfolio.ts` with new endpoints
   - Update `strategies.ts` with new endpoints
   - Add audit logging to all mutations

5. **Integration Testing** (1 hour)
   - Test all routers
   - Test admin operations
   - Test upload tracking

**Deliverables:**
- ✅ 3 new routers added
- ✅ Existing routers updated
- ✅ All endpoints tested

**Success Criteria:**
- All routers work
- tRPC endpoints accessible
- Tests pass

---

## Phase 3: Frontend & Polish (Days 8-10)

**Goal**: Add frontend components and finalize production deployment  
**Duration**: 3 days  
**Effort**: 12-14 hours  
**Risk**: Low

### Day 8: Frontend Components

**Morning (4 hours):**

1. **Add ExportTradesButton Component** (1.5 hours)
   - Copy from GitHub: `client/src/components/ExportTradesButton.tsx`
   - Wire to `trpc.portfolio.exportTrades`
   - Add to Trades page
   - Test CSV download

2. **Add MonteCarloPanel Component** (2 hours)
   - Copy from GitHub: `client/src/components/MonteCarloPanel.tsx`
   - Wire to `trpc.portfolio.monteCarlo`
   - Add to Portfolio Overview
   - Test simulation

3. **Test Components** (0.5 hours)
   - Verify both components render
   - Test data loading
   - Test error states

**Afternoon (3 hours):**

4. **Add RollingMetrics Component** (1.5 hours)
   - Copy from GitHub: `client/src/components/RollingMetrics.tsx`
   - Add to Rolling Metrics page
   - Test with real data

5. **Add TodayPlaybook Component** (1.5 hours)
   - Copy from GitHub: `client/src/components/TodayPlaybook.tsx`
   - Add to Dashboard
   - Test with today's data

**Deliverables:**
- ✅ 4 new components added
- ✅ All components functional
- ✅ Mobile responsive

**Success Criteria:**
- Components render without errors
- Data loads correctly
- Mobile layout works

---

### Day 9: Integration & Testing

**Morning (4 hours):**

1. **Full Integration Testing** (2 hours)
   - Test all pages
   - Test all features
   - Test with real data
   - Test on mobile

2. **Performance Testing** (1 hour)
   - Test with 100k+ trades
   - Optimize slow queries
   - Add database indexes

3. **Error Handling** (1 hour)
   - Test error states
   - Add error boundaries
   - Add toast notifications

**Afternoon (3 hours):**

4. **User Acceptance Testing** (2 hours)
   - Walk through all user flows
   - Test CSV import/export
   - Test Monte Carlo simulation
   - Test drawdown analysis

5. **Bug Fixes** (1 hour)
   - Fix any issues found
   - Re-test after fixes

**Deliverables:**
- ✅ All features tested
- ✅ Performance optimized
- ✅ Bugs fixed

**Success Criteria:**
- No critical bugs
- Performance acceptable
- All features work

---

### Day 10: Production Deployment

**Morning (3 hours):**

1. **Final Code Review** (1 hour)
   - Review all changes
   - Check for any issues
   - Verify test coverage

2. **Documentation Update** (1 hour)
   - Update README
   - Update deployment guide
   - Add release notes

3. **Create Final Checkpoint** (1 hour)
   ```bash
   # Manus creates checkpoint
   ```
   - Document all changes
   - List all new features
   - Note any breaking changes

**Afternoon (2 hours):**

4. **Deploy to Production** (1 hour)
   - User clicks "Publish" in Manus UI
   - Monitor deployment
   - Verify all services start

5. **Post-Deployment Testing** (1 hour)
   - Test production URL
   - Verify database connection
   - Test all critical features
   - Monitor for errors

**Deliverables:**
- ✅ Code deployed to production
- ✅ All features operational
- ✅ Documentation complete

**Success Criteria:**
- Production site accessible
- No errors in logs
- All features work

---

## Risk Management

### Identified Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Database conversion errors** | Medium | High | Test thoroughly on Day 4, have rollback plan |
| **Schema migration failures** | Low | High | Use `pnpm db:push` carefully, backup database |
| **Performance degradation** | Low | Medium | Test with large datasets, add indexes |
| **Frontend bugs** | Medium | Low | Test all components, add error boundaries |
| **Integration issues** | Low | Medium | Test incrementally, fix issues immediately |

### Rollback Plan

If critical issues arise:

1. **Immediate Rollback** (< 5 minutes)
   ```bash
   # Manus can rollback to previous checkpoint
   ```

2. **Identify Issue** (10-30 minutes)
   - Check error logs
   - Identify root cause
   - Document issue

3. **Fix and Redeploy** (1-4 hours)
   - Fix issue in development
   - Test fix thoroughly
   - Create new checkpoint
   - Deploy again

---

## Success Metrics

### Quantitative Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| **Test Coverage** | 5% | 70%+ | `pnpm test --coverage` |
| **Lines of Code** | ~3,000 | ~6,500 | `cloc` command |
| **Test Files** | 1 | 13 | File count |
| **Documentation Files** | 2 | 23 | File count |
| **Frontend Components** | 10 | 14 | File count |
| **Backend Routers** | 4 | 8 | File count |
| **Services** | 0 | 4 | File count |

### Qualitative Metrics

- ✅ All features from GitHub repo integrated
- ✅ Zero TypeScript errors
- ✅ Zero runtime errors
- ✅ Production-ready code quality
- ✅ Comprehensive documentation
- ✅ Enterprise-grade testing

---

## Post-Migration Tasks

### Immediate (Week 3)

1. **Real Data Integration** (2-3 hours)
   - Connect to live TradingView webhooks
   - Test with real incoming trades
   - Verify data pipeline

2. **Performance Tuning** (1-2 hours)
   - Monitor query performance
   - Add missing indexes
   - Optimize slow queries

3. **UI Polish** (2-3 hours)
   - Final design tweaks
   - Mobile testing
   - Cross-browser testing

### Short-term (Month 1)

1. **User Feedback** (Ongoing)
   - Collect user feedback
   - Prioritize improvements
   - Fix reported bugs

2. **Feature Enhancements** (As needed)
   - Add requested features
   - Improve UX
   - Optimize performance

3. **Monitoring** (Ongoing)
   - Monitor error logs
   - Track performance metrics
   - Monitor user activity

---

## Coordination Workflow

### Daily Workflow

**Codex/Antigravity:**
1. Pull latest from GitHub
2. Read `COORDINATION_LOG.md`
3. Complete assigned tasks
4. Update `COORDINATION_LOG.md`
5. Run tests
6. Commit and push

**Manus:**
1. Pull latest from GitHub
2. Review changes
3. Test in Manus environment
4. Update `COORDINATION_LOG.md` with feedback
5. Assign next tasks
6. Commit and push

### Weekly Checkpoints

**End of Week 1 (Day 3):**
- Review Phase 1 completion
- Assess any blockers
- Adjust timeline if needed

**End of Week 2 (Day 7):**
- Review Phase 2 completion
- Test all backend features
- Prepare for frontend work

**End of Week 3 (Day 10):**
- Final review
- Deploy to production
- Celebrate! 🎉

---

## Final Deliverables

### Code Deliverables

- ✅ 3,550+ lines of production code
- ✅ 1,200+ lines of test code
- ✅ 70%+ test coverage
- ✅ Zero TypeScript errors
- ✅ Zero runtime errors

### Documentation Deliverables

- ✅ 21 comprehensive docs
- ✅ Architecture guide
- ✅ Developer guide
- ✅ Deployment guide
- ✅ API documentation
- ✅ Testing guide

### Feature Deliverables

**Backend:**
- ✅ Canonical portfolio engine (1,249 lines)
- ✅ 8 tRPC routers
- ✅ 4 services (ingestion, audit, uploads, admin)
- ✅ CSV import/export
- ✅ Monte Carlo simulation
- ✅ Advanced analytics
- ✅ Audit logging

**Frontend:**
- ✅ Portfolio Overview dashboard
- ✅ Swing/Intraday Strategies pages
- ✅ Compare Strategies page
- ✅ Drawdown Analysis page
- ✅ Rolling Metrics page
- ✅ Trades page with export
- ✅ Monte Carlo simulation panel
- ✅ Today's Playbook component

**Quality:**
- ✅ Enterprise-grade code quality
- ✅ Comprehensive testing
- ✅ Full documentation
- ✅ Production-ready deployment

---

## Conclusion

This migration roadmap provides a clear, step-by-step plan to transfer all compatible features from the GitHub repository to the Manus deployment. By following this incremental approach with testing at each phase, we can achieve a production-ready trading dashboard with enterprise-grade quality in **10 business days**.

The coordination workflow via GitHub ensures smooth handoffs between Manus AI and Codex/Antigravity AI, with clear communication and documentation at every step.

**Next Step**: Begin Phase 1, Day 1 by copying test files from GitHub and adapting them for Manus environment.

---

**Document End**

*This roadmap is a living document and will be updated as the migration progresses.*
