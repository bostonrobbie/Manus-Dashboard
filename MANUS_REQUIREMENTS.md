# Manus Platform Requirements & Constraints

**Document Version**: 1.0  
**Created**: December 2, 2025  
**Author**: Manus AI  
**Purpose**: Define hard requirements and constraints for code that will be deployed on Manus platform

---

## 🚨 Critical Rules (MUST Follow)

These are **non-negotiable requirements** that MUST be followed for code to work on Manus. Violating these rules will cause deployment failures or runtime errors.

---

## 1. Database Requirements

### ✅ MUST Use MySQL/TiDB

**Rule**: All database code MUST use MySQL syntax, not PostgreSQL.

**Correct:**
```typescript
import { mysqlTable, mysqlEnum, int, varchar, decimal, timestamp } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  role: mysqlEnum("role", ["admin", "user"]).default("user").notNull(),
  balance: decimal("balance", { precision: 18, scale: 4 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

**Incorrect:**
```typescript
// ❌ NEVER use PostgreSQL syntax
import { pgTable, pgEnum, serial, numeric } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  role: pgEnum("role", ["admin", "user"]).default("user").notNull(),
  balance: numeric("balance", { precision: 18, scale: 4 }),
});
```

### ✅ MUST Use camelCase Column Names

**Rule**: All column names MUST use camelCase, not snake_case.

**Correct:**
```typescript
export const trades = mysqlTable("trades", {
  userId: int("userId").notNull(),
  strategyId: int("strategyId").notNull(),
  entryPrice: decimal("entryPrice", { precision: 18, scale: 4 }),
  exitPrice: decimal("exitPrice", { precision: 18, scale: 4 }),
  entryTime: timestamp("entryTime").notNull(),
  exitTime: timestamp("exitTime").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

**Incorrect:**
```typescript
// ❌ NEVER use snake_case
export const trades = mysqlTable("trades", {
  user_id: int("user_id").notNull(),
  strategy_id: int("strategy_id").notNull(),
  entry_price: decimal("entry_price", { precision: 18, scale: 4 }),
  exit_price: decimal("exit_price", { precision: 18, scale: 4 }),
  entry_time: timestamp("entry_time").notNull(),
  exit_time: timestamp("exit_time").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});
```

### ✅ MUST Use Correct Data Types

| Data Type | Correct | Incorrect |
|-----------|---------|-----------|
| **Auto-increment ID** | `int("id").autoincrement()` | `serial("id")` |
| **Money/Decimals** | `decimal("price", { precision: 18, scale: 4 })` | `numeric("price", { precision: 18, scale: 4 })` |
| **Timestamps** | `timestamp("createdAt")` | `timestamp("created_at", { withTimezone: true })` |
| **Enums** | `mysqlEnum("role", ["admin", "user"])` | `pgEnum("role", ["admin", "user"])` |
| **Unique Constraint** | `.unique()` modifier | `uniqueIndex()` function |

### ✅ MUST Use mysql2 Driver

**Rule**: Use `mysql2` package, not `pg` (PostgreSQL driver).

**Correct:**
```json
{
  "dependencies": {
    "mysql2": "^3.15.0",
    "drizzle-orm": "^0.44.5"
  }
}
```

**Incorrect:**
```json
{
  "dependencies": {
    "pg": "^8.11.5",  // ❌ NEVER use PostgreSQL driver
    "drizzle-orm": "^0.44.5"
  }
}
```

---

## 2. Authentication Requirements

### ✅ MUST Use Manus OAuth

**Rule**: Authentication is handled by Manus platform. Do NOT implement custom auth.

**Correct:**
```typescript
// Use built-in Manus OAuth (already configured)
import { protectedProcedure } from "../_core/trpc";

export const myRouter = router({
  getProfile: protectedProcedure.query(({ ctx }) => {
    // ctx.user is automatically populated by Manus OAuth
    return { user: ctx.user };
  }),
});
```

**Incorrect:**
```typescript
// ❌ NEVER implement custom auth
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const login = publicProcedure
  .input(z.object({ email: z.string(), password: z.string() }))
  .mutation(async ({ input }) => {
    // ❌ Don't hash passwords
    // ❌ Don't generate JWT tokens
    // ❌ Don't manage sessions
  });
```

### ✅ MUST Use 2 Roles Only

**Rule**: Manus supports 2 roles: `admin` and `user`. Do NOT use 4-level roles.

**Correct:**
```typescript
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  role: mysqlEnum("role", ["admin", "user"]).default("user").notNull(),
});

// Check if user is admin
if (ctx.user.role === "admin") {
  // Admin-only logic
}
```

**Incorrect:**
```typescript
// ❌ NEVER use 4-level roles
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  role: mysqlEnum("role", ["OWNER", "ADMIN", "USER", "VIEWER"]).default("USER").notNull(),
});
```

### ✅ MUST Use protectedProcedure

**Rule**: Use `protectedProcedure` for authenticated endpoints, not custom middleware.

**Correct:**
```typescript
import { protectedProcedure, router } from "../_core/trpc";

export const portfolioRouter = router({
  // Requires authentication
  getPortfolio: protectedProcedure.query(({ ctx }) => {
    const userId = ctx.user.id; // Guaranteed to exist
    return getPortfolioByUserId(userId);
  }),
});
```

**Incorrect:**
```typescript
// ❌ NEVER create custom auth middleware
const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization;
  // ❌ Don't verify tokens manually
  // ❌ Don't check sessions manually
};
```

### ✅ MUST Use jose for JWT

**Rule**: If you need JWT operations, use `jose` library (not `jsonwebtoken`).

**Correct:**
```typescript
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);
const token = await new SignJWT({ userId: 123 })
  .setProtectedHeader({ alg: "HS256" })
  .sign(secret);
```

**Incorrect:**
```typescript
// ❌ NEVER use jsonwebtoken
import jwt from "jsonwebtoken";

const token = jwt.sign({ userId: 123 }, process.env.JWT_SECRET);
```

---

## 3. File Structure Requirements

### ✅ MUST Follow Manus Directory Structure

**Rule**: Place files in correct directories matching Manus template.

**Correct Structure:**
```
trading-dashboard-frontend/
├── client/
│   ├── src/
│   │   ├── pages/           ← Page components
│   │   ├── components/      ← Reusable components
│   │   ├── hooks/           ← Custom React hooks
│   │   └── lib/             ← Utilities
│   └── public/              ← Static assets
├── server/
│   ├── routers/             ← tRPC routers (NOT server/src/routers/)
│   ├── services/            ← Business logic (create if needed)
│   ├── tests/               ← Test files (NOT server/tests/)
│   ├── portfolio-engine.ts  ← Core engine (NOT server/src/engine/)
│   └── db.ts                ← Database helpers
├── drizzle/
│   ├── schema.ts            ← Database schema (NOT drizzle/schema/)
│   └── migrations/          ← Auto-generated migrations
└── shared/
    └── types.ts             ← Shared types
```

**Incorrect Structure:**
```
❌ server/src/routers/        (Don't use src/ subdirectory)
❌ server/src/engine/         (Don't use src/ subdirectory)
❌ server/tests/              (Use server/tests/ not at root)
❌ drizzle/schema/            (Schema is drizzle/schema.ts, not a directory)
```

### ✅ MUST Use Correct Import Paths

**Rule**: Import paths must match Manus structure.

**Correct:**
```typescript
// From a router file (server/routers/portfolio.ts)
import { getDb } from "../db";
import { trades, strategies } from "../../drizzle/schema";
import { buildEquityCurve } from "../portfolio-engine";
import { protectedProcedure, router } from "../_core/trpc";
```

**Incorrect:**
```typescript
// ❌ NEVER use these paths
import { getDb } from "../src/db";              // Wrong: no src/ directory
import { trades } from "../db/schema";          // Wrong: schema is in drizzle/
import { buildEquityCurve } from "../src/engine/portfolio-engine";  // Wrong: no src/
```

---

## 4. Testing Requirements

### ✅ MUST Use Vitest

**Rule**: Use Vitest for testing, not Node.js built-in test runner.

**Correct:**
```typescript
// server/tests/portfolio.test.ts
import { describe, it, expect } from "vitest";
import { buildEquityCurve } from "../portfolio-engine";

describe("Portfolio Engine", () => {
  it("should build equity curve", () => {
    const result = buildEquityCurve(trades);
    expect(result).toHaveLength(100);
  });
});
```

**Incorrect:**
```typescript
// ❌ NEVER use Node.js test runner
import { describe, it } from "node:test";
import assert from "node:assert";

describe("Portfolio Engine", () => {
  it("should build equity curve", () => {
    const result = buildEquityCurve(trades);
    assert.strictEqual(result.length, 100);
  });
});
```

### ✅ MUST Place Tests in server/tests/

**Rule**: All test files go in `server/tests/*.test.ts`.

**Correct:**
```
server/
└── tests/
    ├── portfolio.test.ts
    ├── ingestion.test.ts
    └── metrics.test.ts
```

**Incorrect:**
```
❌ tests/portfolio.test.ts           (Wrong: at root)
❌ server/src/tests/portfolio.test.ts (Wrong: no src/ directory)
❌ __tests__/portfolio.test.ts        (Wrong: not Manus convention)
```

### ✅ MUST Run Tests with pnpm test

**Rule**: Use `pnpm test` command, not `node --test`.

**Correct:**
```bash
pnpm test                    # Run all tests
pnpm test portfolio.test.ts  # Run specific test
```

**Incorrect:**
```bash
❌ node --test tests/**/*.test.ts
❌ npm test
❌ yarn test
```

---

## 5. Workspace Requirements

### ❌ MUST NOT Use Workspaces

**Rule**: Manus is **single-tenant**. Do NOT implement workspace features.

**Incorrect:**
```typescript
// ❌ NEVER add workspace tables
export const workspaces = mysqlTable("workspaces", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }),
});

export const workspaceMembers = mysqlTable("workspace_members", {
  workspaceId: int("workspaceId").notNull(),
  userId: int("userId").notNull(),
});

// ❌ NEVER add workspaceId columns
export const trades = mysqlTable("trades", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),  // ❌ Remove this
  userId: int("userId").notNull(),
});

// ❌ NEVER filter by workspace
const trades = await db.select()
  .from(trades)
  .where(eq(trades.workspaceId, workspaceId));  // ❌ Remove this
```

**Correct:**
```typescript
// ✅ Use userId only (no workspaces)
export const trades = mysqlTable("trades", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),  // ✅ Only userId
  strategyId: int("strategyId").notNull(),
});

// ✅ Filter by userId only
const trades = await db.select()
  .from(trades)
  .where(eq(trades.userId, ctx.user.id));
```

---

## 6. Package Manager Requirements

### ✅ MUST Use pnpm

**Rule**: Use `pnpm` for package management, not npm or yarn.

**Correct:**
```bash
pnpm install
pnpm add drizzle-orm
pnpm run dev
pnpm test
pnpm db:push
```

**Incorrect:**
```bash
❌ npm install
❌ yarn add drizzle-orm
❌ npm run dev
```

---

## 7. Environment Variables

### ✅ MUST Use Manus-Provided Environment Variables

**Rule**: Use environment variables provided by Manus platform. Do NOT create custom env vars for auth/database.

**Available System Environment Variables:**
```typescript
// These are automatically provided by Manus
process.env.DATABASE_URL           // MySQL connection string
process.env.JWT_SECRET             // Session signing secret
process.env.VITE_APP_ID            // OAuth app ID
process.env.OAUTH_SERVER_URL       // OAuth backend URL
process.env.VITE_OAUTH_PORTAL_URL  // OAuth login URL
process.env.OWNER_OPEN_ID          // Owner's OAuth ID
process.env.OWNER_NAME             // Owner's name
process.env.VITE_APP_TITLE         // App title
process.env.VITE_APP_LOGO          // App logo URL
```

**Correct:**
```typescript
// Use system env vars
const db = drizzle(process.env.DATABASE_URL);
```

**Incorrect:**
```typescript
// ❌ NEVER create custom auth env vars
process.env.CUSTOM_JWT_SECRET      // ❌ Use JWT_SECRET
process.env.CUSTOM_DB_URL          // ❌ Use DATABASE_URL
process.env.CUSTOM_OAUTH_CLIENT_ID // ❌ Use VITE_APP_ID
```

---

## 8. tRPC Requirements

### ✅ MUST Use tRPC 11.6.0+

**Rule**: Use stable tRPC version, not release candidates.

**Correct:**
```json
{
  "dependencies": {
    "@trpc/server": "^11.6.0",
    "@trpc/client": "^11.6.0",
    "@trpc/react-query": "^11.6.0"
  }
}
```

**Incorrect:**
```json
{
  "dependencies": {
    "@trpc/server": "^11.0.0-rc.660",  // ❌ Don't use RC versions
    "@trpc/client": "^11.0.0-rc.660",
    "@trpc/react-query": "^11.0.0-rc.660"
  }
}
```

### ✅ MUST Export Router from server/routers.ts

**Rule**: Main router must be exported from `server/routers.ts` (not `server/routers/index.ts`).

**Correct:**
```typescript
// server/routers.ts (at root of server/)
import { router } from "./_core/trpc";
import { portfolioRouter } from "./routers/portfolio";
import { strategiesRouter } from "./routers/strategies";

export const appRouter = router({
  portfolio: portfolioRouter,
  strategies: strategiesRouter,
});

export type AppRouter = typeof appRouter;
```

**Incorrect:**
```typescript
// ❌ NEVER use server/routers/index.ts
// server/routers/index.ts
export const appRouter = router({ ... });
```

---

## 9. Frontend Requirements

### ✅ MUST Use React 19

**Rule**: Manus uses React 19. Ensure compatibility.

**Correct:**
```json
{
  "dependencies": {
    "react": "^19.1.1",
    "react-dom": "^19.1.1"
  }
}
```

### ✅ MUST Use Tailwind 4

**Rule**: Manus uses Tailwind CSS 4. Use new syntax.

**Correct:**
```typescript
// Use Tailwind 4 syntax
<div className="bg-background text-foreground">
  <h1 className="text-2xl font-bold">Title</h1>
</div>
```

### ✅ MUST Use shadcn/ui Components

**Rule**: Use existing shadcn/ui components from `client/src/components/ui/`.

**Correct:**
```typescript
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

<Card>
  <Button>Click me</Button>
</Card>
```

---

## 10. Migration Requirements

### ✅ MUST Use pnpm db:push

**Rule**: Use `pnpm db:push` to apply schema changes, not manual migrations.

**Correct:**
```bash
# After editing drizzle/schema.ts
pnpm db:push
```

**Incorrect:**
```bash
❌ pnpm drizzle-kit generate
❌ pnpm drizzle-kit migrate
❌ node scripts/migrate.ts
```

---

## Summary Checklist

Before submitting code to Manus, verify:

**Database:**
- [ ] Uses `mysqlTable`, `mysqlEnum`, `int().autoincrement()`
- [ ] Uses `decimal()` for money, not `numeric()`
- [ ] Uses camelCase column names
- [ ] No workspace tables or columns
- [ ] Uses `mysql2` driver

**Authentication:**
- [ ] Uses `protectedProcedure` for auth
- [ ] Uses 2 roles only (admin/user)
- [ ] No custom auth implementation
- [ ] Uses `jose` for JWT (if needed)

**File Structure:**
- [ ] Routers in `server/routers/*.ts`
- [ ] Tests in `server/tests/*.test.ts`
- [ ] Schema in `drizzle/schema.ts`
- [ ] No `server/src/` subdirectory

**Testing:**
- [ ] Uses Vitest (not Node.js test runner)
- [ ] Tests run with `pnpm test`
- [ ] Tests in `server/tests/*.test.ts`

**Packages:**
- [ ] Uses pnpm (not npm/yarn)
- [ ] Uses tRPC 11.6.0+ (not RC versions)
- [ ] Uses React 19
- [ ] Uses Tailwind 4

**Workspaces:**
- [ ] No workspace tables
- [ ] No workspaceId columns
- [ ] No workspace filtering in queries

---

**Document End**

*This document defines the hard requirements for code compatibility with Manus platform. Following these rules ensures smooth deployment and operation.*
