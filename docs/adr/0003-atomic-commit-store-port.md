# 0003. The store port has one atomic commit and no general queries

- **Status:** Accepted
- **Date:** 2026-11-10

## Context

The kit must run on PostgreSQL and on Firestore with identical business logic. The two differ sharply: Postgres has joins, arbitrary filters and interactive transactions; Firestore has document reads by key, pre-declared indexes, and transactions that require all reads before any write.

A conventional repository interface (one repository per entity with `find`, `save`, flexible filters, and a unit-of-work wrapper) is natural on Postgres and leaks on Firestore. Business logic written against it ends up depending on SQL behaviour.

Billing also needs several writes to succeed or fail together. Processing one webhook must record the idempotency claim, update state, append ledger entries and queue outgoing events as a unit. An earlier draft checked "already processed?", did the work, then marked the event processed. Two concurrent retries could both pass the check.

## Options considered

1. **Per-entity repositories with a transaction callback.** Familiar. Encourages read-modify-write sequences that do not translate to Firestore's transaction rules.
2. **A narrow port designed to the common subset.** Key reads, a closed list of named queries, leases for queues, and a single `commit(changeSet)` for all writes.

## Decision

Option 2.

- **Reads:** `get(kind, id)` and `list(queryName, args, page)`. The query names are a closed set defined in the core. Adding one is a core change that every store must implement.
- **Writes:** only `commit(changeSet)`. A change set may contain a claim key, versioned puts, appends, number allocations and queue completions. It applies entirely or not at all.
- **Concurrency:** optimistic. Each put carries the version the caller read. A mismatch fails the commit with `version_conflict` and the use case reloads and retries.
- **Idempotency:** the claim key is unique forever. A second commit with the same claim fails with `duplicate`.
- **Queues:** `lease(queue, now, limit, leaseMs)` hands due items to one worker at a time.

## Consequences

**Good**

- Use cases have the shape "read, decide in pure code, commit once". That shape works on both databases and is easy to test.
- Idempotency and the effect are in the same transaction, which closes the concurrent-retry race.
- One contract suite defines correct behaviour for every store, including concurrency.
- No use case can accidentally depend on a join or an unindexed filter.

**Bad**

- Reporting-style queries are not available through the port. Adopters query their database directly for analytics, or use the ledger export.
- Every new named query costs an index on each store.
- Optimistic concurrency means occasional retries under contention on one account.
- Change sets must stay small to fit Firestore's per-transaction limits. Bulk operations are split into many commits by the scheduler.

**What would make us revisit this**

- A required feature that cannot be expressed as key reads plus a named query without unacceptable cost on one of the stores.
