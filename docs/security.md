# Security model

This document lists the threats the kit is designed against, the control for each, and where the test for that control lives. To report a vulnerability, see [`SECURITY.md`](../SECURITY.md).

> Test paths are the planned locations. A row is only considered done when its test exists and runs in CI.

## Trust boundaries

| Party | Trusted for | Not trusted for |
| --- | --- | --- |
| Browser | Nothing | Prices, account ids, payment results |
| Host application | Identifying the caller and their permissions | Nothing else is assumed |
| Payment provider | Statements about payments, once verified | Unverified requests claiming to be from it |
| Operator (staff) | Actions their permissions allow, with a reason | Unaudited changes |
| Database | Durability and constraints | Confidentiality of a stolen dump |

Paid access changes on exactly two kinds of input: information verified with the provider on the server, or an audited admin action.

## Threats and controls

| # | Threat | Control | Test |
| --- | --- | --- | --- |
| T1 | Forged webhook | Signature checked over the raw bytes with a constant-time compare before parsing. `receiveWebhook` is the only way to obtain events. Optional source IP allowlist | `packages/paystack/test/signature.test.ts` |
| T2 | Replayed webhook | Permanent claim key written in the same commit as the effect. All effects idempotent | `packages/testing/src/contracts/store.claim.ts` |
| T3 | Client alters the price | Client sends a plan id and interval only. Price comes from the server catalogue | `packages/server/test/checkout.test.ts` |
| T4 | Underpayment or wrong currency | Paid amount and currency compared with the stored attempt. A mismatch is recorded and grants nothing | `packages/core/test/payment-mismatch.test.ts` |
| T5 | Acting on another account | Account id comes only from `resolveAccount`. No route accepts it in the body or path. Optional Postgres row-level security | `packages/server/test/authorization.test.ts` |
| T6 | Free upgrade through the API | No customer route can mark an invoice paid or set a plan without a verified payment | `packages/server/test/no-self-grant.test.ts` |
| T7 | Cross-site request forgery | State-changing routes require `Content-Type: application/json` and an `Origin` in the allowlist | `packages/server/test/csrf.test.ts` |
| T8 | Card testing and endpoint abuse | Rate-limit hook is required for checkout and coupon routes. Cap on open attempts per account. Card entry only on the provider's page | `packages/server/test/rate-limit.test.ts` |
| T9 | Coupon guessing | Rate limit, redemption caps, minimum code entropy | `packages/core/test/coupons.test.ts` |
| T10 | Staff misuse | Admin routes exist only when `resolveOperator` is configured. Per-action permissions. Reason required. Append-only audit entry in the same commit | `packages/server/test/admin.test.ts` |
| T11 | Secret leak through logs or errors | Secrets passed as functions and read at call time. Logger uses a field allowlist. Errors never include request bodies | `packages/core/test/redaction.test.ts` |
| T12 | Secret in the client bundle | Server packages declare a `server-only` export condition | `examples/*/test/bundle.test.ts` |
| T13 | Stolen database dump | Provider tokens encrypted per field through the `Crypto` port, with key ids for rotation | `packages/core/test/crypto.test.ts` |
| T14 | SQL injection | Parameterized queries only. Lint rule forbids string-built SQL | `packages/postgres/test/injection.test.ts` |
| T15 | Malformed or oversized input | Request bodies validated against the published schema. Body size limit | `packages/server/test/validation.test.ts` |
| T16 | Double charge | The attempt reference is the idempotency key. One live attempt per invoice. Renewal jobs are leased | `packages/core/test/scenarios/double-charge.test.ts` |
| T17 | Forged scheduler call | Bearer secret compared in constant time. Endpoint returns 404 when no secret is configured | `packages/server/test/cron.test.ts` |
| T18 | Lost or reordered webhooks used to keep access | Status derived from invoices and dates. Reconciliation sweep and daily comparison | `packages/core/test/scenarios/fault-injection.test.ts` |
| T19 | Tampering with financial history | Issued invoices and ledger entries are immutable. Corrections are credit notes. Ledger balance checked nightly | `packages/testing/src/contracts/store.ledger.ts` |
| T20 | Compromised dependency or release | No runtime dependencies in core. Lockfile. Dependency and secret scanning. CodeQL. npm provenance. 2FA on maintainer accounts | CI workflows |

## Webhook verification in detail

1. Read the raw request body as bytes. Do not parse it first.
2. Compute the provider's signature over those bytes with each configured secret.
3. Compare with the header value in constant time. If none match, return `401` and record a metric.
4. Only then parse, map to normalized events, and build a `dedupeKey` for each.
5. Store the raw body and events in the inbox and return `200`.

Paystack signs with HMAC-SHA512 using the API secret key and includes no timestamp, so replay protection rests on the permanent dedupe key (T2). Because the signing key is the API key, the adapter accepts a list of keys so a rotation does not reject in-flight webhooks.

## Secrets and keys

| Secret | Used for | Rotation |
| --- | --- | --- |
| Provider secret key | API calls and webhook verification | Add the new key to the list, switch API calls to it, remove the old key after the provider's retry window |
| Data encryption key | Encrypting provider tokens | Add a new key id, new writes use it, re-encrypt in the background, retire the old id |
| Cron secret | Authenticating the scheduler | Accepts a list during rotation |

All are supplied as functions, so any secret manager works and rotation needs no redeploy.

## Data handled

| Data | Stored by the kit | Notes |
| --- | --- | --- |
| Card number, CVV | Never | Entered only on the provider's page |
| Card brand, last four, expiry | Yes | For display and expiry reminders |
| Provider token (authorization code) | Yes, encrypted | Deleted with the payment method |
| Billing email, name, tax number | Yes | Anonymized on erasure |
| Invoices, ledger, audit log | Yes | Kept for the statutory period; detached from personal details on erasure |
| Raw webhook bodies | Yes | Purged after a configurable window, 90 days by default |

## Adopter responsibilities

The kit cannot do these for you:

- Authenticate users and return the correct account from `resolveAccount`.
- Supply the rate limiter.
- Store secrets safely and rotate them.
- Restrict the database role to the billing schema, and back it up.
- Complete your PCI DSS self-assessment with your provider.
- Meet tax and data-protection law where you operate.
- Wire the alerts and respond to them.
- Commission an independent security review before taking real money.
