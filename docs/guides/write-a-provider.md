# Write a payment provider

A provider adapter lets the kit collect money through a payment service. The kit runs the billing cycle; your adapter only has to take a payment, optionally charge a saved method and refund, and report what happened.

You do not need to change `billing-core`. If you find you do, that is a bug in the port. Please open an issue.

## Before you start

Find out from the provider's documentation:

- How a customer-present payment starts (redirect, embedded form, or a prompt on the phone).
- Whether a payment method can be charged later without the customer, and for which method types.
- How webhooks are signed and whether the signature includes a timestamp.
- Whether events carry a unique id.
- Which outcomes arrive by webhook and which only in an API response.
- Whether you can pass your own unique reference with a payment and query by it.

The last point matters most. The kit's design depends on the provider accepting a caller-supplied reference.

## 1. Create the package

```
my-provider/
  src/index.ts
  test/fixtures/*.json
  test/contract.test.ts
  package.json
```

```json
{
  "name": "billing-myprovider",
  "type": "module",
  "peerDependencies": { "@lotusly/billing-core": "^0.x" },
  "devDependencies": { "@lotusly/billing-testing": "^0.x" }
}
```

Use `fetch` and Web Crypto. Avoid the provider's SDK so the adapter runs on Node, Bun, Deno and edge runtimes.

## 2. Declare capabilities

Capabilities tell the core what it may ask of you. Declare only what you implement; the contract suite checks they match.

```ts
import type { PaymentProvider } from "@lotusly/billing-core";

export function myProvider(config: { secretKeys: () => string[] }): PaymentProvider {
  return {
    id: "myprovider",
    capabilities: {
      methods: ["card", "mobile_money"],
      checkout: ["redirect"],
      savedMethods: ["card"],      // can be charged with no customer present
      refunds: "partial",          // "none" | "full" | "partial"
      disputes: true,
      currencies: ["KES", "NGN"],  // or "any"
    },
    createCheckout,
    chargeSaved,
    refund,
    receiveWebhook,
    fetchPayment,
  };
}
```

## 3. Start a customer-present payment

`createCheckout` receives the kit's `reference`, the amount, the customer's email and a return URL. Pass the reference to the provider unchanged.

```ts
async function createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const res = await call("POST", "/payments", {
    reference: input.reference,
    amount: input.money.amount,      // integer, minor units
    currency: input.money.currency,
    email: input.email,
    return_url: input.returnUrl,
  });
  return { kind: "redirect", url: res.checkout_url };
}
```

Return one of:

| `kind` | Use when |
| --- | --- |
| `redirect` | The customer goes to a hosted page |
| `embedded` | The frontend mounts the provider's form with a client token |
| `push` | A prompt is sent to the customer's phone and there is nothing to open |

Never put anything in provider metadata that the core then trusts. The core resolves the account and invoice from its own attempt record by reference.

## 4. Charge a saved method

Implement `chargeSaved` only for the method types in `savedMethods`. Return the outcome if the provider answers synchronously, or `pending` if the result arrives by webhook.

```ts
async function chargeSaved(input: SavedChargeInput): Promise<ChargeOutcome> {
  const res = await call("POST", "/charges", {
    reference: input.reference,
    token: input.method.token,       // decrypted by the core just before the call
    email: input.method.boundEmail,  // some providers bind a token to an email
    amount: input.money.amount,
    currency: input.money.currency,
  });
  if (res.status === "success") return { status: "succeeded", payment: toPayment(res) };
  if (res.status === "failed")  return { status: "failed", reason: toReason(res) };
  return { status: "pending" };
}
```

If the provider rejects a reused reference, treat that as "already attempted" and fall back to `fetchPayment`. This is what makes a retried renewal job safe.

## 5. Verify and parse webhooks

`receiveWebhook` does both. There is deliberately no separate parse function, so nothing can read an unverified event.

```ts
async function receiveWebhook(raw: { body: Uint8Array; headers: Headers }) {
  const given = raw.headers.get("x-myprovider-signature") ?? "";
  const ok = await anyKeyMatches(config.secretKeys(), raw.body, given); // constant-time
  if (!ok) throw new InvalidSignatureError();

  const payload = JSON.parse(new TextDecoder().decode(raw.body));
  return mapEvents(payload);
}
```

Rules:

- Verify over the **raw bytes**. Re-serialized JSON will not match.
- Compare in constant time. `@lotusly/billing-core` exports `timingSafeEqual`.
- Accept a list of secrets so adopters can rotate keys.
- If the signature includes a timestamp, reject events outside the provider's tolerance.

### Map to normalized events

The core understands a closed set:

| Event | Emit when |
| --- | --- |
| `payment.succeeded` | Money was collected. Include amount, currency, paid time, the provider's payment id, the fee if known, and a `savedMethod` if the provider returned a reusable token |
| `payment.failed` | An attempt definitively failed. Include a normalized reason |
| `refund.succeeded`, `refund.failed` | A refund finished |
| `dispute.opened`, `dispute.won`, `dispute.lost` | A chargeback changed state |

Drop every other event type. Return an empty array for them; do not throw.

Each event needs:

- `reference`: the kit's reference the provider echoed back.
- `dedupeKey`: stable and unique for this event. Use the provider's event id if it has one. Otherwise combine the event type with the object id, for example `charge.success:123456`.

### Normalize failure reasons

| Reason | Meaning | Effect on dunning |
| --- | --- | --- |
| `insufficient_funds` | Try again later | Retries continue |
| `method_expired` | The saved method cannot work again | Retries stop; customer is asked for a new method |
| `customer_declined` | The customer refused or did not approve | Retries continue with reminders |
| `provider_error` | The provider failed | Retried without counting against the schedule |
| `unknown` | Anything else | Retries continue |

## 6. Fetch a payment

`fetchPayment(reference)` returns the provider's current view, or `null` if it has never heard of the reference. Reconciliation depends on it, and it covers providers that do not send a webhook for every outcome.

Implement `listPayments(range, page)` if the provider can list transactions by date. It enables the daily comparison.

## 7. Calling the provider

- Set a timeout on every request.
- Retry network errors and 5xx responses a bounded number of times with jitter. Do not retry 4xx.
- Throw `ProviderUnavailableError` when retries are exhausted, so the core's circuit breaker can act.
- Never log request or response bodies.

## 8. Record fixtures

Trigger each event in the provider's **test mode** and save the raw body and headers:

```
test/fixtures/
  payment-succeeded-card.json
  payment-succeeded-mobile-money.json
  refund-succeeded.json
  dispute-opened.json
  ignored-event.json
```

Replace emails, phone numbers and names before committing. Never record from live mode.

## 9. Run the contract suite

```ts
import { providerContract } from "@lotusly/billing-testing";
import { myProvider } from "../src";
import { fixtures } from "./fixtures";

providerContract({
  create: () => myProvider({ secretKeys: () => ["test_secret"] }),
  fixtures,              // each with raw body, headers and the events you expect
  signingSecret: "test_secret",
});
```

It checks that:

- A tampered body and a missing signature are rejected.
- Each fixture maps to exactly the expected events.
- `dedupeKey` is stable across repeated delivery and differs between events.
- Unknown events return an empty array.
- Declared capabilities match the methods you implemented.
- The reference survives the round trip.

## Checklist

- [ ] Caller-supplied reference is passed through and echoed back
- [ ] Signature verified over raw bytes, constant time, multiple keys
- [ ] `dedupeKey` stable for every event
- [ ] Failure reasons normalized
- [ ] `fetchPayment` implemented
- [ ] Timeouts and bounded retries
- [ ] Fixtures from test mode, scrubbed
- [ ] `providerContract` passes
- [ ] README states which capabilities are supported and any provider quirks
