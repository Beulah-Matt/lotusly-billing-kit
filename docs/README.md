# Documentation

Start with the [project README](../README.md) for an overview and quick start.

## Understand the design

- [Architecture decision records](adr/README.md): why the kit is built the way it is.
- [Security model](security.md): threats, controls and adopter responsibilities.

## Extend the kit

- [Write a payment provider](guides/write-a-provider.md)
- [Write a store](guides/write-a-store.md)
- [Theme and customize the UI](guides/theming.md)

## Glossary

| Term | Meaning |
| --- | --- |
| Account | The party that pays. Identified by an opaque id your app chooses. |
| Catalogue | Your plans, their prices and their entitlements. |
| Entitlement | Something a plan unlocks: a boolean flag or a numeric limit. |
| Invoice | What is owed for a period. Immutable once issued. |
| Payment attempt | One try at collecting an invoice. Carries the kit's unique reference. |
| Reference | The identifier the kit generates for an attempt and sends to the provider. It is the idempotency key. |
| Ledger | Append-only double-entry record of financial events. |
| Dunning | The retry and reminder schedule after a failed or missed payment. |
| Grace period | Time after the last retry during which paid access continues. |
| Port | An interface the core defines and something else implements. |
| Adapter | A package that implements a port for one provider, database or service. |
| Change set | The group of writes passed to `store.commit()`, applied all together or not at all. |
| Claim | A permanent unique key written in a change set so the same event cannot be applied twice. |
| Lease | A short-lived lock on a queued item so only one worker processes it. |
| Inbox | Verified raw webhooks waiting to be processed. |
| Outbox | Domain events waiting to be delivered to your hooks. |
| Tick | One call to the scheduler endpoint, which runs all due work. |
| Minor unit | The smallest unit of a currency. All amounts are integers in minor units. |
