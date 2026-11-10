# Architecture decision records

Each record captures one significant decision: the situation, the options, what was chosen and what it costs. Records are immutable once accepted. A changed decision gets a new record that supersedes the old one.

| # | Decision | Status |
| --- | --- | --- |
| [0001](0001-kit-owned-billing-cycle.md) | The kit owns the billing cycle; providers only move money | Accepted |
| [0002](0002-derived-subscription-status.md) | Subscription status is derived from invoices and dates | Accepted |
| [0003](0003-atomic-commit-store-port.md) | The store port has one atomic commit and no general queries | Accepted |
| [0004](0004-plain-sql-postgres-store.md) | The Postgres store uses plain SQL, not an ORM | Accepted |
| [0005](0005-single-provider-scope.md) | Ship one provider, Paystack, and prove the port with a mock | Accepted |
| [0006](0006-host-driven-scheduler.md) | The host drives the scheduler | Accepted |

To propose a new decision, copy [`0000-template.md`](0000-template.md), take the next number, and open a pull request containing only the record.
