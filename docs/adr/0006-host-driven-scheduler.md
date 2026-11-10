# 0006. The host drives the scheduler

- **Status:** Accepted
- **Date:** 2026-11-10

## Context

Because the kit owns the billing cycle ([ADR 0001](0001-kit-owned-billing-cycle.md)), work must happen when time passes: renewals, payment requests, dunning retries, trial endings, draining the inbox and outbox, and reconciliation.

The kit is a library. It runs inside whatever the adopter deploys, which is often a serverless platform with no long-lived process. It cannot rely on timers, and it should not require a specific queue or cloud product.

## Options considered

1. **In-process timers.** Simple. Do not survive serverless, and fire once per instance when scaled out.
2. **Require a queue or workflow product.** Robust. Ties adopters to infrastructure and makes local development heavier.
3. **One idempotent `tick` the host calls on a schedule.** Works with any cron. All due work is stored in the database and leased.

## Decision

Option 3. The kit exposes `billing.tick()` and `POST /v1/cron/tick`. The host calls it every few minutes from any scheduler. Each tick leases due items from the jobs, inbox and outbox queues and processes them within a time budget.

## Consequences

**Good**

- Runs anywhere a request can be made on a schedule.
- No infrastructure dependency. Local development and tests call `tick()` directly with the fake clock.
- Leases make concurrent or overlapping ticks safe.
- A missed tick delays work and loses nothing. The next tick picks it up.

**Bad**

- Timing precision is the tick interval. A renewal may run a few minutes after its due time.
- Throughput per tick is bounded by the platform's request timeout. Each tick works within a budget and leaves the rest for the next.
- If the adopter's cron stops, billing stops advancing. `/v1/health` reports the time since the last tick so this can be alerted on.
- The cron endpoint is an attack surface. It requires a bearer secret and returns 404 when none is configured.

**Extension point**

Adopters with high volume can call `billing.tick({ queues: [...] })` from dedicated workers, or process the inbox from their own queue. The core does not depend on either.
