# 0004. The Postgres store uses plain SQL, not an ORM

- **Status:** Accepted
- **Date:** 2026-11-10

## Context

The first adopter uses Prisma, and an early draft shipped a Prisma adapter. Publishing that as a package has problems:

- A Prisma model must be declared in the host application's schema file. A package cannot ship models; it can only ask the adopter to paste them in and keep them in sync.
- It forces every adopter onto Prisma. Teams on Drizzle, Kysely or a bare driver would need a second data layer and a second connection pool.
- The store needs specific SQL: `INSERT … ON CONFLICT`, `UPDATE … WHERE version = $n`, `SELECT … FOR UPDATE SKIP LOCKED`. An ORM adds little here.

## Options considered

1. **Prisma adapter.** Good experience for Prisma users only. Schema lives in the adopter's repo.
2. **Bundle a query builder.** Adds a runtime dependency and still needs a driver.
3. **Plain SQL through a minimal client interface.** The store depends on three methods and ships its own migrations.

## Decision

Option 3. The store is written against:

```ts
interface SqlClient {
  query<T>(text: string, params: unknown[]): Promise<T[]>;
  transaction<T>(fn: (tx: SqlClient) => Promise<T>): Promise<T>;
  close?(): Promise<void>;
}
```

The package provides wrappers: `fromPg(pool)`, `fromPostgresJs(sql)` and `fromPrisma(prisma)`. Tables live in a dedicated `billing` schema and are created by numbered SQL migrations shipped in the package.

## Consequences

**Good**

- Works with whatever the adopter already uses and shares its connection pool.
- The kit controls its own schema and migrations, so upgrades are predictable.
- The exact SQL is visible and reviewable.
- A database role can be limited to the `billing` schema.

**Bad**

- No generated types for adopters who want to read billing tables through their ORM. A Prisma schema fragment and TypeScript row types are published for read-only use.
- Two migration systems run side by side in an adopter's project. The CLI can also print the SQL so it can be copied into the adopter's own tool.
- All queries are hand-written and must be parameterized. A lint rule forbids building SQL by string concatenation.
