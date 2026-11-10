# 0002. Subscription status is derived from invoices and dates

- **Status:** Accepted
- **Date:** 2026-11-10

## Context

The usual design stores a `status` column and lets each incoming event overwrite it: a success event sets `active`, a failure event sets `past_due`.

Webhooks are delivered at least once, can arrive late, and can arrive out of order. With event-set status, the last event to arrive wins. A failure event that arrives after a successful retry flips a paying customer to past due. Defending against this by comparing provider timestamps is fragile: providers do not all supply one, and clocks and equal timestamps cause edge cases.

A stored status can also drift from the financial records. A customer has paid, but the status says otherwise.

## Options considered

1. **Event-set status with ordering guards.** Compare event timestamps or sequence numbers and reject stale events.
2. **Derived status.** Events only record facts about a payment attempt. Status is a pure function of the subscription's dates and the state of its invoices.

## Decision

Option 2.

```
status = f(subscription, invoices, now)
```

- `trialing`: the trial end is in the future.
- `active`: the current period's invoice is paid, or the plan is free.
- `past_due`: an invoice is open past its due date and grace has not run out.
- `canceled`: the period ended with the cancel flag set, or grace ran out.

## Consequences

**Good**

- Late, duplicated and reordered events give the same result. A stale failure marks one old attempt as failed and changes nothing else.
- Status cannot disagree with the money.
- Time-based transitions (trial end, grace expiry) need no event to fire at the right moment.
- Correcting a record (voiding an invoice, recording an offline payment) corrects the status automatically.
- The function is pure and is tested exhaustively with a fake clock.

**Bad**

- Listing accounts by status cannot filter on a status column. The store exposes named queries on the underlying dates instead, for example open invoices due before a given time.
- Side effects of a status change (updating the entitlement snapshot, sending a notice) still need the scheduler to notice the change. A stopped scheduler leaves the snapshot stale, so scheduler health is alerted on.
- The rules must be total: every combination of dates and invoice states maps to exactly one status. This is enforced by property tests.

**Implementation note**

A cached status is stored in the account's entitlement snapshot for display and fast reads. It is a cache, recomputed in the same commit as any change that affects it and by the scheduler when a date passes. It is never the input to a billing decision.
