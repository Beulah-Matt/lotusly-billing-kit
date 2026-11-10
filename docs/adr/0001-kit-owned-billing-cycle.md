# 0001. The kit owns the billing cycle; providers only move money

- **Status:** Accepted
- **Date:** 2026-11-10

## Context

A subscription billing system has to decide who is in charge of the recurring cycle: who creates each period's invoice, who decides when to charge, and who handles a failed payment.

Payment providers offer to do this. Paystack has Plans and Subscriptions; Stripe has Billing. Using them is less code.

Three facts make that a poor fit here:

- Paystack's reusable authorizations are documented for cards (and direct debit in Nigeria). M-Pesa payments are approved by the customer each time. A provider-run subscription therefore cannot renew a mobile-money customer, and those customers are a large share of the first adopter's market.
- Invoices, tax lines, proration and failed-payment policy need to be auditable and under the adopter's control. When the provider owns the cycle, these live in the provider's system with the provider's rules.
- Every provider models subscriptions differently. A port that abstracts provider-run subscriptions ends up as the lowest common denominator, and each new provider is a large integration.

## Options considered

1. **Provider-managed.** Create the plan and subscription at the provider and mirror its state from webhooks. Least code. Cards only on Paystack. Billing rules differ per provider.
2. **Hybrid.** Provider-managed for cards, kit-managed for mobile money. Two code paths for the same concept, and two sets of behaviour for customers.
3. **Kit-managed.** The kit issues invoices and decides when to collect. The provider is asked to take a payment, refund one, or report on one.

## Decision

Option 3. The kit runs the cycle for every payment method. Provider subscription products are not used.

## Consequences

**Good**

- Card and mobile-money customers follow one lifecycle with one set of rules.
- Invoices, tax, proration, coupons and dunning are implemented once, in the core, and behave the same on every provider.
- The provider port shrinks to payments: checkout, charge a saved method, refund, receive webhooks, fetch a payment.
- All billing data is in the adopter's database.

**Bad**

- The kit needs a scheduler ([ADR 0006](0006-host-driven-scheduler.md)).
- We are responsible for renewal correctness: charging once, on time, for the right amount. This is covered by leases, the reference-as-idempotency-key rule, and time-travel and fault-injection tests.
- Provider features tied to their subscription products (hosted customer portals, provider-side retry logic) are unavailable.
- The kit must store a provider token for saved cards, which adds an encryption requirement.

**What would make us revisit this**

- A provider that can silently renew mobile-money payments in the target markets, combined with adopters who do not need their own invoices.
