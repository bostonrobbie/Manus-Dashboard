# Backend & Database Improvement Report

## Executive Summary

After a deep analysis of the backend (3,500+ lines in routers.ts, 1,767 lines in db.ts) and database schema (1,214 lines, 25+ tables), I've identified **42 specific improvements** across 6 categories. The architecture is solid with good foundations (caching, transactions, rate limiting), but there are opportunities to improve performance, reliability, and scalability.

---

## 1. Database Schema Improvements

### 1.1 Missing Foreign Key Constraints (HIGH PRIORITY)

**Issue:** 59 indexes exist but 0 foreign key references are defined. This means referential integrity is not enforced at the database level.

**Tables Affected:**

- `trades.strategyId` → `strategies.id`
- `webhookLogs.strategyId` → `strategies.id`
- `webhookLogs.tradeId` → `trades.id`
- `brokerConnections.userId` → `users.id`
- `routingRules.userId` → `users.id`
- `routingRules.brokerConnectionId` → `brokerConnections.id`
- `openPositions.strategyId` → `strategies.id`
- `stagingTrades.strategyId` → `strategies.id`
- `notifications.userId` → `users.id`

**Recommendation:** Add foreign key constraints with `ON DELETE CASCADE` or `ON DELETE SET NULL` as appropriate.

```typescript
// Example fix in schema.ts
strategyId: int("strategyId")
  .notNull()
  .references(() => strategies.id, { onDelete: "cascade" }),
```

### 1.2 Missing Composite Indexes (MEDIUM PRIORITY)

**Issue:** Some common query patterns lack optimized indexes.

**Add These Indexes:**

```typescript
// trades table - for time-range queries by strategy
index("idx_trades_strategy_entry_exit").on(
  table.strategyId,
  table.entryDate,
  table.exitDate
);

// webhookLogs - for dashboard queries
index("idx_webhook_logs_strategy_created").on(
  table.strategyId,
  table.createdAt
);

// notifications - for user inbox queries
index("idx_notifications_user_read_created").on(
  table.userId,
  table.read,
  table.createdAt
);

// brokerOrders - for order tracking
index("idx_broker_orders_strategy_status_created").on(
  table.strategySymbol,
  table.status,
  table.createdAt
);
```

### 1.3 Data Type Optimizations (LOW PRIORITY)

| Current                  | Recommended           | Reason                    |
| ------------------------ | --------------------- | ------------------------- |
| `varchar(320)` for email | `varchar(254)`        | RFC 5321 max email length |
| `int` for prices         | Already using cents ✓ | Good practice             |
| `text` for JSON blobs    | Consider `json` type  | Better validation         |

### 1.4 Add Soft Delete Support (MEDIUM PRIORITY)

**Issue:** No soft delete columns exist. Deleting records loses audit trail.

**Add to critical tables:**

```typescript
deletedAt: datetime("deletedAt"),
deletedBy: int("deletedBy"),
```

**Tables to add soft delete:**

- `trades`
- `webhookLogs`
- `brokerConnections`
- `routingRules`

---

## 2. Query Performance Improvements

### 2.1 N+1 Query Patterns (HIGH PRIORITY)

**Location:** `server/db.ts` and `server/routers.ts`

**Issue:** Several endpoints fetch related data in loops instead of using JOINs.

**Example Problem (line ~300 in db.ts):**

```typescript
// Current: Fetches all trades, then loops for strategy info
const trades = await db.select().from(trades);
// Then in frontend, strategy names are fetched separately
```

**Fix:** Use JOINs or batch queries:

```typescript
const tradesWithStrategy = await db
  .select({
    trade: trades,
    strategyName: strategies.name,
  })
  .from(trades)
  .leftJoin(strategies, eq(trades.strategyId, strategies.id));
```

### 2.2 Unbounded Queries (MEDIUM PRIORITY)

**Issue:** Some queries don't have LIMIT clauses, which can cause memory issues with large datasets.

**Locations to fix:**

- `getAllTrades()` - line 298 in db.ts
- `getAllBenchmarks()` - line 328 in db.ts

**Fix:** Add pagination or reasonable limits:

```typescript
export async function getAllTrades(limit: number = 10000) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(trades).limit(limit);
}
```

### 2.3 Add Query Result Caching (MEDIUM PRIORITY)

**Current State:** Cache exists but not used consistently.

**Endpoints to add caching:**
| Endpoint | Current TTL | Recommended TTL |
|----------|-------------|-----------------|
| `portfolio.getOverview` | 2 min ✓ | Good |
| `portfolio.getStrategyDetail` | 2 min ✓ | Good |
| `webhook.getLogs` | 30 sec ✓ | Good |
| `broker.getConnections` | None | 1 min |
| `notifications.getUnread` | None | 30 sec |

### 2.4 Add Database Connection Pooling Metrics (LOW PRIORITY)

**Current:** Pool exists but no monitoring.

**Add:**

```typescript
export function getPoolStats() {
  if (!_pool) return null;
  return {
    activeConnections: _pool.pool._allConnections.length,
    idleConnections: _pool.pool._freeConnections.length,
    waitingRequests: _pool.pool._connectionQueue.length,
  };
}
```

---

## 3. API Improvements

### 3.1 Add Request Validation Middleware (HIGH PRIORITY)

**Current:** Zod validation exists but inconsistent.

**Missing validations:**

- Numeric ranges (e.g., `quantity` should be > 0)
- String lengths (e.g., `name` max 100 chars)
- Date range validation (start < end)

**Example fix:**

```typescript
.input(z.object({
  quantity: z.number().int().positive().max(1000),
  price: z.number().int().positive(),
  startDate: z.date(),
  endDate: z.date(),
}).refine(data => data.startDate < data.endDate, {
  message: "Start date must be before end date"
}))
```

### 3.2 Add API Versioning (MEDIUM PRIORITY)

**Current:** No versioning, breaking changes affect all clients.

**Recommendation:** Add version prefix to tRPC routes:

```typescript
// In server/_core/index.ts
app.use("/api/v1/trpc", trpcMiddleware);
```

### 3.3 Add Request ID Tracking (MEDIUM PRIORITY)

**Current:** Correlation IDs exist for webhooks but not for all API calls.

**Add to context:**

```typescript
// In context.ts
const requestId = req.headers["x-request-id"] || crypto.randomUUID();
return { user, requestId };
```

### 3.4 Standardize Error Responses (LOW PRIORITY)

**Current:** Mix of error formats.

**Standardize to:**

```typescript
{
  code: "VALIDATION_ERROR",
  message: "Human readable message",
  details: { field: "quantity", issue: "Must be positive" },
  requestId: "abc-123"
}
```

---

## 4. Security Enhancements

### 4.1 Add Input Sanitization (HIGH PRIORITY)

**Issue:** Some text inputs are stored without sanitization.

**Add sanitization for:**

- `webhookLogs.payload` - sanitize before storing
- `brokerConnections.name` - escape HTML
- `notifications.message` - sanitize markdown

**Implementation:**

```typescript
import DOMPurify from "isomorphic-dompurify";

function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
}
```

### 4.2 Add Audit Logging (MEDIUM PRIORITY)

**Current:** No audit trail for sensitive operations.

**Add audit log table:**

```typescript
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  action: varchar("action", { length: 50 }).notNull(),
  resourceType: varchar("resourceType", { length: 50 }).notNull(),
  resourceId: int("resourceId"),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

**Log these actions:**

- Broker connection created/updated/deleted
- Routing rule changes
- Subscription changes
- Admin actions

### 4.3 Encrypt Sensitive Data at Rest (MEDIUM PRIORITY)

**Current:** `encryptedCredentials` field exists but encryption implementation should be verified.

**Verify:**

- AES-256-GCM encryption is used
- Keys are rotated periodically
- IV is unique per encryption

### 4.4 Add Rate Limiting per User (LOW PRIORITY)

**Current:** Rate limiting exists for webhooks but not for API endpoints.

**Add per-user limits:**

```typescript
const userRateLimits = {
  "portfolio.getOverview": { max: 60, windowMs: 60000 },
  "webhook.simulateSignal": { max: 10, windowMs: 60000 },
  "broker.connect": { max: 5, windowMs: 300000 },
};
```

---

## 5. Reliability Improvements

### 5.1 Add Health Check Endpoint (HIGH PRIORITY)

**Current:** No dedicated health check.

**Add:**

```typescript
// In routers.ts
health: publicProcedure.query(async () => {
  const dbHealthy = await checkDatabaseHealth();
  const cacheStats = cache.stats();

  return {
    status: dbHealthy ? 'healthy' : 'degraded',
    database: dbHealthy,
    cache: cacheStats.size,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
}),
```

### 5.2 Add Circuit Breaker for External Services (MEDIUM PRIORITY)

**Current:** No circuit breaker for broker API calls.

**Implement for:**

- Alpaca API calls
- Tradovate API calls
- IBKR Gateway calls

**Example:**

```typescript
import CircuitBreaker from "opossum";

const alpacaBreaker = new CircuitBreaker(alpacaApiCall, {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});
```

### 5.3 Add Graceful Shutdown (MEDIUM PRIORITY)

**Current:** No graceful shutdown handling.

**Add:**

```typescript
process.on("SIGTERM", async () => {
  console.log("Received SIGTERM, shutting down gracefully...");

  // Stop accepting new requests
  server.close();

  // Wait for in-flight requests (max 30s)
  await new Promise(resolve => setTimeout(resolve, 30000));

  // Close database connections
  await _pool?.end();

  process.exit(0);
});
```

### 5.4 Add Dead Letter Queue Processing (LOW PRIORITY)

**Current:** Dead letter queue table exists but no processing job.

**Add scheduled job to:**

- Alert on new DLQ entries
- Auto-retry after manual review
- Archive old entries

---

## 6. Scalability Improvements

### 6.1 Add Read Replicas Support (FUTURE)

**Current:** Single database connection.

**For scale:**

```typescript
const writePool = mysql.createPool({ uri: process.env.DATABASE_URL });
const readPool = mysql.createPool({ uri: process.env.DATABASE_READ_URL });

// Use readPool for SELECT queries
// Use writePool for INSERT/UPDATE/DELETE
```

### 6.2 Add Background Job Queue (MEDIUM PRIORITY)

**Current:** Some operations block the request.

**Move to background:**

- Trade analytics recalculation
- Notification sending
- Broker position reconciliation

**Options:**

- BullMQ (Redis-based)
- pg-boss (PostgreSQL-based)
- Simple in-memory queue for MVP

### 6.3 Add Database Partitioning Strategy (FUTURE)

**For large datasets:**

- Partition `trades` by year
- Partition `webhookLogs` by month
- Partition `notifications` by month

---

## Priority Matrix

| Priority | Category    | Item                        | Effort | Impact |
| -------- | ----------- | --------------------------- | ------ | ------ |
| P0       | Database    | Add foreign key constraints | Medium | High   |
| P0       | Security    | Add input sanitization      | Low    | High   |
| P0       | Reliability | Add health check endpoint   | Low    | High   |
| P1       | Performance | Fix N+1 queries             | Medium | High   |
| P1       | API         | Add request validation      | Medium | Medium |
| P1       | Database    | Add composite indexes       | Low    | Medium |
| P1       | Security    | Add audit logging           | Medium | Medium |
| P2       | Reliability | Add circuit breaker         | Medium | Medium |
| P2       | API         | Add API versioning          | Low    | Medium |
| P2       | Performance | Add query result caching    | Low    | Medium |
| P3       | Scalability | Add background job queue    | High   | Medium |
| P3       | Database    | Add soft delete             | Low    | Low    |

---

## Quick Wins (Can implement today)

1. **Add health check endpoint** - 15 minutes
2. **Add missing composite indexes** - 30 minutes
3. **Add pagination to unbounded queries** - 30 minutes
4. **Add request ID tracking** - 20 minutes
5. **Standardize error responses** - 1 hour

---

## Recommended Implementation Order

### Week 1: Foundation

- [ ] Add health check endpoint
- [ ] Add foreign key constraints
- [ ] Add missing composite indexes
- [ ] Fix N+1 query patterns

### Week 2: Security

- [ ] Add input sanitization
- [ ] Add audit logging table
- [ ] Verify encryption implementation
- [ ] Add per-user rate limiting

### Week 3: Reliability

- [ ] Add circuit breaker for broker APIs
- [ ] Add graceful shutdown
- [ ] Add request ID tracking
- [ ] Improve error responses

### Week 4: Performance

- [ ] Add caching to uncached endpoints
- [ ] Add pagination everywhere
- [ ] Optimize slow queries
- [ ] Add database connection metrics

---

## Conclusion

The backend architecture is fundamentally sound with good practices already in place:

- ✅ In-memory caching with TTL
- ✅ Database transaction support
- ✅ Rate limiting for webhooks
- ✅ Sentry error tracking
- ✅ Zod validation (partial)

The main gaps are:

- ❌ Missing foreign key constraints
- ❌ Some N+1 query patterns
- ❌ Inconsistent input validation
- ❌ No health check endpoint
- ❌ No audit logging

Implementing the P0 and P1 items will significantly improve reliability and performance with moderate effort.
