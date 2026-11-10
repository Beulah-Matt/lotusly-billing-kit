# Write a store

A store persists billing data. The kit ships PostgreSQL and (planned) Firestore stores. This guide is for adding another database, such as MySQL, SQLite or DynamoDB.

Read [ADR 0003](../adr/0003-atomic-commit-store-port.md) first. It explains why the port looks the way it does.

## What your database must support

- Reading a record by key.
- A transaction that applies several writes atomically.
- A way to reject a write when a unique key already exists.
- A way to make a write conditional on a version, inside that transaction.
- Indexed queries on a few fixed fields with stable ordering.

If it cannot do all of these, it cannot be a store.

## The interface

```ts
export interface BillingStore {
  get<K extends Kind>(kind: K, id: string): Promise<Versioned<Entity<K>> | null>;

  list<Q extends QueryName>(
    query: Q, args: QueryArgs<Q>, page: PageRequest
  ): Promise<Page<QueryRow<Q>>>;

  lease(
    queue: "jobs" | "inbox" | "outbox", now: Date, limit: number, leaseMs: number
  ): Promise<Leased[]>;

  commit(changes: ChangeSet): Promise<
    | { ok: true; allocated?: Record<string, number> }
    | { ok: false; reason: "duplicate" | "version_conflict" }
  >;
}
```

There are four methods. All writes go through `commit`.

## `get`

Return the record and its `version`, or `null`. Versions are integers that start at 1 and increase by 1 on every put.

Store records in whatever shape suits the database. The core hands you plain objects and expects the same objects back. Dates are `Date` values at the boundary; convert them to your native type. Amounts are integers and must come back as integers.

## `list`

The core defines a closed set of queries. You implement each one and nothing else.

| Query | Arguments | Order |
| --- | --- | --- |
| `invoicesByAccount` | `accountId` | Issued time, newest first |
| `openInvoicesDueBefore` | `before` | Due time, oldest first |
| `subscriptionsRenewingBefore` | `before` | Period end, oldest first |
| `trialsEndingBefore` | `before` | Trial end, oldest first |
| `paymentsByAccount` | `accountId` | Paid time, newest first |
| `paymentsByProviderDate` | `provider`, `from`, `to` | Paid time, oldest first |
| `attemptsPendingSince` | `before` | Created time, oldest first |
| `grantsExpiringBefore` | `before` | Expiry, oldest first |
| `auditByAccount` | `accountId` | Time, newest first |
| `ledgerByAccount` | `accountId` | Sequence, oldest first |

Each needs an index. Pagination is by opaque cursor: return `nextCursor` when more rows exist. Ordering must be stable, so break ties with the record id.

## `commit`

A change set may contain any of:

```ts
interface ChangeSet {
  claim?: string;
  put?: Array<{ kind: Kind; value: unknown; expectedVersion: number | null }>;
  append?: Array<{ kind: "ledger" | "audit" | "outbox" | "job"; value: unknown }>;
  allocate?: string[];
  complete?: Array<{ queue: "jobs" | "inbox" | "outbox"; id: string }>;
}
```

Apply all of it in one transaction, in this order:

1. **Claim.** Insert the key into a table with a unique constraint. If it exists, roll back and return `{ ok: false, reason: "duplicate" }`. Claims are never deleted.
2. **Puts.** For each:
   - `expectedVersion: null` means create. Fail with `version_conflict` if the record exists.
   - Otherwise update only where the stored version equals `expectedVersion`, and set the new version to `expectedVersion + 1`. If no row matched, roll back and return `version_conflict`.
3. **Allocations.** For each series name, increment its counter and return the new value in `allocated`. The increment must be inside the transaction so a rolled-back commit does not consume a number.
4. **Appends.** Insert. Ledger entries get a monotonically increasing sequence.
5. **Completions.** Mark the queue items done.

Any failure rolls back everything. Never return `ok: true` for a partial write.

### Ledger rule

Before committing, check that the ledger entries in the change set sum to zero per currency. The core already guarantees this; the store checks again as a last line of defence and throws if it is violated.

### Immutability

Reject any put that would change an invoice or credit note whose status is past `draft`, other than the allowed status and payment fields. Ledger and audit records have no update path at all.

## `lease`

Return up to `limit` items from the queue where `runAt <= now` and the item is neither done nor currently leased, and mark them leased until `now + leaseMs`. Two concurrent callers must never receive the same item.

| Database | Technique |
| --- | --- |
| PostgreSQL | `SELECT … FOR UPDATE SKIP LOCKED`, then set `leased_until` |
| Firestore | Query due items, then set `leasedUntil` in a transaction per item; skip items whose transaction fails |
| Others | An atomic conditional update: set the lease only where it is empty or expired |

An item whose lease expires without completion becomes available again. Processing is therefore at least once, and the core's handlers are idempotent.

Increment an `attempts` counter on each lease. The core marks an item dead when it exceeds the limit.

## Schema and migrations

- Keep everything in its own namespace: a schema, a table prefix or a collection prefix. Make it configurable.
- Ship migrations with the package and number them. Never edit a released migration.
- Follow expand-then-contract: add in one release, remove in a later one, so a new version of the kit can run against the previous schema during a rolling deploy.
- Expose the schema version. The core reads it at startup and refuses to run on a mismatch.

## Run the contract suite

```ts
import { storeContract } from "@lotusly/billing-testing";

storeContract({
  create: async () => myStore(await freshDatabase()),
  destroy: async (store) => store.close(),
});
```

It checks:

- A commit with a failing part writes nothing.
- A repeated claim returns `duplicate` and writes nothing.
- Of many concurrent commits against one version, exactly one succeeds.
- Create fails when the record exists.
- Allocated numbers are gapless and unique under concurrency, including after rollbacks.
- Concurrent `lease` calls never return the same item; expired leases are handed out again.
- Every named query returns the right rows in the right order and paginates without gaps or repeats.
- Dates and integer amounts survive a round trip exactly.
- Issued invoices and ledger entries cannot be altered.
- An unbalanced ledger change set is rejected.

Run the suite against a real instance of the database, not a fake.

## Common mistakes

- **Checking the claim outside the transaction.** The check and the effect must be atomic.
- **Read-modify-write without the version condition.** Two writers will overwrite each other.
- **Using an auto-increment for invoice numbers.** Sequences skip values on rollback. Use a counter row updated in the commit.
- **Storing amounts in a floating-point column.** Use a 64-bit integer type.
- **Storing timestamps without a time zone.** Store UTC instants.
- **Unstable ordering.** Without a tie-breaker, pagination repeats or skips rows.

## Checklist

- [ ] All four methods implemented
- [ ] Commit is a single transaction in the documented order
- [ ] Claims are permanent and unique
- [ ] Version check on every put
- [ ] Gapless allocation inside the commit
- [ ] Leases are exclusive and expire
- [ ] An index for every named query
- [ ] Migrations numbered, forward-only, shipped in the package
- [ ] `storeContract` passes against a real database
