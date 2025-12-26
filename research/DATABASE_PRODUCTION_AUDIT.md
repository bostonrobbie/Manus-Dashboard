# Database Production Readiness Audit

**Prepared for:** IntraDay Strategies Dashboard  
**Date:** December 20, 2025  
**Author:** Manus AI

---

## Executive Summary

This audit evaluates the database schema, indexes, security, and overall production readiness of the IntraDay Strategies Dashboard. The database has a solid foundation with well-designed tables and some indexes in place, but several critical improvements are needed before production deployment.

**Overall Assessment:** 70% Production Ready

**Critical Issues:** 3  
**High Priority Issues:** 5  
**Medium Priority Issues:** 4  

---

## 1. Schema Design Analysis

### 1.1 Strengths

The schema demonstrates good practices in several areas:

| Aspect | Assessment | Notes |
|--------|------------|-------|
| **Table Normalization** | ✅ Good | Tables are properly normalized, no obvious redundancy |
| **Data Types** | ✅ Good | Appropriate use of int, varchar, text, datetime |
| **Timestamps** | ✅ Good | Consistent createdAt/updatedAt on all tables |
| **Enums** | ✅ Good | Proper use of MySQL enums for status fields |
| **Audit Trail** | ✅ Good | Dedicated audit_logs table exists |

### 1.2 Issues Found

**Issue 1: Missing Foreign Key Constraints (CRITICAL)**

The schema defines relationships (e.g., `trades.strategyId` → `strategies.id`) but does NOT enforce them with foreign key constraints. This allows orphaned records and data integrity issues.

**Affected Tables:**
- `trades.strategyId` → No FK to `strategies`
- `broker_connections.userId` → No FK to `users`
- `routing_rules.userId` → No FK to `users`
- `routing_rules.brokerConnectionId` → No FK to `broker_connections`
- `execution_logs.webhookLogId` → No FK to `webhook_logs`
- `user_subscriptions.userId` → No FK to `users`
- `user_subscriptions.strategyId` → No FK to `strategies`
- And many more...

**Impact:** Data can become inconsistent. Deleting a strategy won't delete its trades, leaving orphaned records.

**Issue 2: No Check Constraints (HIGH)**

MySQL 8.0+ supports CHECK constraints, but none are defined:
- `trades.direction` should only be "Long" or "Short"
- `trades.quantity` should be > 0
- `trades.pnl` calculation should match entry/exit prices

**Issue 3: Sensitive Data Not Encrypted at Rest (HIGH)**

The `broker_connections` table stores:
- `encryptedCredentials` - Marked as encrypted but stored as plain text
- `accessToken` - OAuth tokens in plain text
- `refreshToken` - OAuth tokens in plain text

These should use application-level encryption before storage.

---

## 2. Index Analysis

### 2.1 Current Indexes

```
trades:
  - PRIMARY: (id)
  - MISSING: strategyId, exitDate (critical for queries)

webhook_logs:
  - PRIMARY: (id)
  - MISSING: strategyId, status, createdAt

broker_connections:
  - PRIMARY: (id)
  - MISSING: userId (critical for user lookups)

open_positions:
  - PRIMARY: (id)
  - MISSING: strategyId, status (critical for webhook processing)
```

### 2.2 Missing Critical Indexes (CRITICAL)

The `trades` table is queried heavily but has NO indexes beyond the primary key:

```sql
-- These queries will be SLOW without indexes:
SELECT * FROM trades WHERE strategyId = ? ORDER BY exitDate;
SELECT * FROM trades WHERE exitDate BETWEEN ? AND ?;
SELECT * FROM trades WHERE strategyId = ? AND exitDate > ?;
```

**Recommended Indexes for `trades`:**
```sql
CREATE INDEX idx_trades_strategy ON trades(strategyId);
CREATE INDEX idx_trades_exit_date ON trades(exitDate);
CREATE INDEX idx_trades_strategy_exit ON trades(strategyId, exitDate);
```

**Recommended Indexes for `webhook_logs`:**
```sql
CREATE INDEX idx_webhook_logs_strategy ON webhook_logs(strategyId);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX idx_webhook_logs_created ON webhook_logs(createdAt);
```

**Recommended Indexes for `broker_connections`:**
```sql
CREATE INDEX idx_broker_connections_user ON broker_connections(userId);
```

**Recommended Indexes for `open_positions`:**
```sql
CREATE INDEX idx_open_positions_strategy ON open_positions(strategyId);
CREATE INDEX idx_open_positions_status ON open_positions(status);
CREATE INDEX idx_open_positions_strategy_status ON open_positions(strategyId, status);
```

### 2.3 Index Coverage Summary

| Table | Has Indexes | Missing Critical | Status |
|-------|-------------|-----------------|--------|
| users | ✅ openId | None | ✅ OK |
| strategies | ✅ symbol | None | ✅ OK |
| trades | ❌ None | strategyId, exitDate | ⚠️ CRITICAL |
| benchmarks | ✅ date | None | ✅ OK |
| webhook_logs | ❌ None | strategyId, status | ⚠️ HIGH |
| broker_connections | ❌ None | userId | ⚠️ HIGH |
| open_positions | ❌ None | strategyId, status | ⚠️ HIGH |
| user_subscriptions | ✅ userId,strategyId | None | ✅ OK |

---

## 3. Security Analysis

### 3.1 SQL Injection Protection

The application uses Drizzle ORM with parameterized queries, which provides good protection against SQL injection. However:

**Issue: Raw SQL in Some Places**

Check for any use of `db.execute(sql\`...\`)` with string interpolation - these could be vulnerable.

### 3.2 Sensitive Data Handling (HIGH)

| Field | Table | Current State | Recommended |
|-------|-------|---------------|-------------|
| accessToken | broker_connections | Plain text | Encrypt with AES-256 |
| refreshToken | broker_connections | Plain text | Encrypt with AES-256 |
| encryptedCredentials | broker_connections | Plain text (misnamed) | Actually encrypt |
| email | users | Plain text | Consider hashing for privacy |

### 3.3 Access Control

The schema has a `role` field on users (admin/user), but:
- No row-level security
- No audit of who accessed what data
- Admin can see all user data without logging

**Recommendation:** Add access logging for sensitive operations.

---

## 4. Data Integrity

### 4.1 Missing Constraints

**Trades Table:**
```sql
-- Should enforce:
-- direction IN ('Long', 'Short')
-- quantity > 0
-- entryPrice > 0
-- exitPrice > 0
```

**Users Table:**
```sql
-- Should enforce:
-- email format validation (application level)
-- subscriptionTier matches actual tier
```

### 4.2 Orphan Prevention

Without foreign keys, these scenarios can occur:
1. Delete a strategy → trades still reference it
2. Delete a user → subscriptions still reference them
3. Delete a webhook_log → execution_logs still reference it

**Recommendation:** Add foreign keys with ON DELETE CASCADE or ON DELETE RESTRICT.

---

## 5. Performance Considerations

### 5.1 Table Size Projections

| Table | Current | 1 Year | 5 Years | Concern |
|-------|---------|--------|---------|---------|
| trades | ~10K | ~50K | ~250K | Need indexes |
| webhook_logs | ~5K | ~100K | ~500K | Need archival strategy |
| audit_logs | ~1K | ~50K | ~250K | Need archival strategy |
| benchmarks | ~4K | ~5K | ~6K | OK |

### 5.2 Query Performance Risks

**High Risk Queries (without indexes):**
1. `SELECT * FROM trades WHERE strategyId = ?` - Full table scan
2. `SELECT * FROM trades ORDER BY exitDate` - Full table scan + sort
3. `SELECT * FROM webhook_logs WHERE status = 'pending'` - Full table scan

### 5.3 Connection Pooling

Check that the application uses connection pooling. Without it:
- Each request creates a new connection
- Connection overhead adds latency
- Risk of exhausting max_connections

---

## 6. Backup and Recovery

### 6.1 Current State

No backup strategy documented. The Manus platform may provide automatic backups, but this should be verified.

### 6.2 Recommendations

1. **Point-in-Time Recovery:** Enable binary logging for PITR
2. **Regular Backups:** Daily full backups, hourly incrementals
3. **Backup Testing:** Monthly restore tests
4. **Retention Policy:** 30 days minimum

---

## 7. Recommended Fixes

### Priority 1: Critical (Must Fix Before Production)

| # | Issue | Fix | Effort |
|---|-------|-----|--------|
| 1 | Missing trades indexes | Add strategyId, exitDate indexes | 30 min |
| 2 | Missing broker_connections userId index | Add userId index | 15 min |
| 3 | Missing open_positions indexes | Add strategyId, status indexes | 15 min |

### Priority 2: High (Fix Within First Week)

| # | Issue | Fix | Effort |
|---|-------|-----|--------|
| 4 | No foreign key constraints | Add FK constraints with CASCADE | 2 hours |
| 5 | Sensitive data not encrypted | Implement AES encryption for tokens | 4 hours |
| 6 | Missing webhook_logs indexes | Add strategyId, status, createdAt indexes | 30 min |
| 7 | No data validation constraints | Add CHECK constraints | 1 hour |

### Priority 3: Medium (Fix Within First Month)

| # | Issue | Fix | Effort |
|---|-------|-----|--------|
| 8 | No archival strategy | Implement log rotation/archival | 4 hours |
| 9 | No backup verification | Set up backup testing | 2 hours |
| 10 | No row-level access logging | Add detailed audit logging | 4 hours |

---

## 8. Implementation Plan

### Phase 1: Indexes (Day 1)

```sql
-- Add critical indexes
CREATE INDEX idx_trades_strategy ON trades(strategyId);
CREATE INDEX idx_trades_exit_date ON trades(exitDate);
CREATE INDEX idx_trades_strategy_exit ON trades(strategyId, exitDate);

CREATE INDEX idx_webhook_logs_strategy ON webhook_logs(strategyId);
CREATE INDEX idx_webhook_logs_status ON webhook_logs(status);
CREATE INDEX idx_webhook_logs_created ON webhook_logs(createdAt);

CREATE INDEX idx_broker_connections_user ON broker_connections(userId);

CREATE INDEX idx_open_positions_strategy ON open_positions(strategyId);
CREATE INDEX idx_open_positions_status ON open_positions(status);
```

### Phase 2: Foreign Keys (Day 2-3)

Add foreign key constraints to enforce referential integrity.

### Phase 3: Encryption (Day 4-5)

Implement application-level encryption for sensitive fields.

### Phase 4: Validation (Day 6-7)

Add CHECK constraints and application-level validation.

---

## 9. Conclusion

The database schema is well-designed conceptually but lacks critical production hardening:

1. **Indexes:** The `trades` table has no indexes beyond the primary key, which will cause severe performance issues as data grows.

2. **Foreign Keys:** No referential integrity enforcement, risking orphaned data.

3. **Security:** Sensitive tokens stored in plain text despite field names suggesting encryption.

4. **Validation:** No database-level constraints to prevent invalid data.

Addressing the Priority 1 issues (indexes) should take less than 2 hours and will have immediate performance benefits. The remaining issues can be addressed over the following week.

---

*This audit is based on schema analysis and does not include load testing or penetration testing.*
