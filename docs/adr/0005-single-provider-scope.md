# 0005. Ship one provider, Paystack, and prove the port with a mock

- **Status:** Accepted
- **Date:** 2026-11-10

## Context

The project claims a developer can add a payment provider without changing the billing domain. The obvious way to prove that is to ship several providers.

Each live provider integration is a permanent cost: API changes, webhook format changes, sandbox accounts, nightly tests, and support questions. The maintainers use Paystack in production and have no production use for another provider.

## Options considered

1. **Ship Paystack, Stripe, Flutterwave and direct M-Pesa.** Broad appeal. Four integrations to keep correct, three of them unused by the maintainers.
2. **Ship Paystack and Stripe.** Two real integrations prove the port. Still one that nobody on the team runs in production.
3. **Ship Paystack only.** Prove the port with a full-featured mock provider, the provider contract suite, and a guide.

## Decision

Option 3.

- `@lotusly/billing-paystack` is the only maintained provider.
- `@lotusly/billing-testing` includes a mock provider that implements every capability, including the ones Paystack lacks, so the core's handling of each capability is exercised.
- The provider contract suite is public. A third-party provider that passes it works with every store and UI layer.
- Community providers live in their authors' repositories and are linked from the README.

## Consequences

**Good**

- One integration, done thoroughly and used in production by its maintainers.
- The port is still tested against more than one implementation.
- Maintenance load matches the team's size.

**Bad**

- The claim "works with any provider" rests on the mock and the contract suite until a second real provider exists. A real provider may expose an assumption the mock shares with Paystack.
- Adopters outside Paystack's markets must write an adapter before they can use the kit.

**Mitigation**

The provider port is not frozen until 1.0. If a community adapter shows the port is wrong, it changes before the freeze.

**What would make us revisit this**

- The maintainers adopting a second provider in production.
- A contributor committing to maintain another provider long term.
