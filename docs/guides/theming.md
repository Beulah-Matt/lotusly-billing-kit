# Theme and customize the UI

There are three levels of control. Start at the first and move down only when you need to.

| Level | What you do | What you own |
| --- | --- | --- |
| 1. Theme | Set colours and shape with props, a theme object or CSS variables | Look |
| 2. Slots | Replace parts of a component, or its class names and text | Look and parts of the markup |
| 3. Headless | Use the hooks and write your own components | All markup and styling |

If you are not using React, call the [JSON API](../../README.md#server-api) directly.

## Setup

```tsx
import { BillingProvider, createFetchClient } from "@lotusly/billing-react";
import "@lotusly/billing-react/ui/styles.css";

const client = createFetchClient({ baseUrl: "/api/billing/v1" });

<BillingProvider client={client}>{children}</BillingProvider>
```

The stylesheet is plain CSS with no runtime. All rules are scoped under `.lb-root` and use low specificity, so your own styles win without `!important`.

## Level 1: theme

### Props on a component

```tsx
<PricingTable accentColor="#2f7d4f" radius="lg" density="compact" />
```

| Prop | Values |
| --- | --- |
| `accentColor` | Any CSS colour |
| `radius` | `"none"`, `"sm"`, `"md"`, `"lg"`, or a number of pixels |
| `density` | `"comfortable"` (default), `"compact"` |
| `colorScheme` | `"light"`, `"dark"`, `"auto"` (default; follows the system) |

### A theme for a subtree

```tsx
import { BillingTheme } from "@lotusly/billing-react/ui";

<BillingTheme
  colorScheme="auto"
  theme={{
    accent: "#2f7d4f",
    surface: "#ffffff",
    text: "#14181f",
    radius: 10,
    font: "inherit",
  }}
  darkTheme={{ accent: "#4fa872", surface: "#12161c", text: "#e7e9ec" }}
>
  <SubscriptionCard />
  <PricingTable />
</BillingTheme>
```

### CSS variables

Props and themes set these variables. You can set them yourself anywhere in your CSS.

| Variable | Controls | Default (light) |
| --- | --- | --- |
| `--lb-accent` | Primary buttons, highlights, focus ring | `#2f7d4f` |
| `--lb-accent-contrast` | Text on the accent colour | computed |
| `--lb-surface` | Component background | `#ffffff` |
| `--lb-surface-raised` | Cards and dialogs | `#f5f6f8` |
| `--lb-text` | Primary text | `#14181f` |
| `--lb-text-muted` | Secondary text | `#5b6472` |
| `--lb-border` | Borders and dividers | `#d7dbe1` |
| `--lb-success` | Paid, active | `#2f7d4f` |
| `--lb-warning` | Trial ending, payment due | `#b5601c` |
| `--lb-danger` | Past due, failed, destructive actions | `#b5342a` |
| `--lb-radius` | Corner radius | `8px` |
| `--lb-space` | Base spacing unit | `1rem` |
| `--lb-font` | Font family | `inherit` |
| `--lb-font-size` | Base font size | `1rem` |

```css
.billing-area {
  --lb-accent: var(--brand-600);
  --lb-radius: 4px;
  --lb-font: "Inter", sans-serif;
}

@media (prefers-color-scheme: dark) {
  .billing-area {
    --lb-surface: #12161c;
    --lb-text: #e7e9ec;
  }
}
```

When you set only `--lb-accent`, the text colour on top of it is chosen automatically for contrast. In development, the console warns when a colour pair falls below WCAG AA.

## Level 2: slots

### Class names

Every component accepts `classNames` keyed by part. This is the route for Tailwind and similar.

```tsx
<PricingTable
  classNames={{
    root: "grid gap-6 md:grid-cols-3",
    card: "rounded-xl border p-6",
    cardFeatured: "ring-2 ring-emerald-600",
    price: "text-3xl font-bold",
    button: "btn btn-primary",
  }}
/>
```

Pass `unstyled` to drop the kit's styles for that component and keep only yours.

### Replace parts

```tsx
<PricingTable
  components={{
    Button: MyButton,                         // receives the same props as the default
    PlanFeatures: ({ plan }) => <MyFeatureList plan={plan} />,
  }}
/>
```

Replacement components receive the state and handlers they need as props. Spread the provided `aria-*` and event props onto your element to keep accessibility and behaviour intact.

### Text and formatting

```tsx
<PricingTable
  labels={{
    choose: "Chagua mpango",
    current: "Mpango wa sasa",
    perMonth: "kwa mwezi",
  }}
  formatMoney={(money) => myFormatter(money)}
  locale="sw-KE"
/>
```

Every visible string is a label with an English default. `formatMoney` receives `{ amount, currency }` with `amount` in minor units.

### Behaviour

```tsx
<CheckoutButton
  planId="grower"
  interval="year"
  onCheckoutStart={() => track("checkout_started")}
  onCheckoutSuccess={(result) => router.push("/billing?paid=1")}
  onError={(error) => toast(error.message)}
/>
```

Callbacks observe; they do not replace the action. To change what happens, use the hooks.

## Level 3: headless

The hooks have no markup and no styles.

| Hook | Returns |
| --- | --- |
| `usePlans()` | The catalogue |
| `useSubscription()` | Subscription, status, current plan, period dates |
| `useEntitlement(name)` | The flag or limit for the current account |
| `useCheckout()` | `start(planId, options)`, `status`, `error`, and the pending instruction for push payments |
| `useInvoices()` | Paginated invoices |
| `usePaymentMethods()` | Saved methods and actions to add or remove one |
| `usePlanChange()` | `preview(planId)` with the prorated amount, and `confirm()` |

```tsx
function MyPricing() {
  const { plans } = usePlans();
  const { plan: current } = useSubscription();
  const checkout = useCheckout();

  return plans.map((plan) => (
    <MyCard key={plan.id} plan={plan} isCurrent={plan.id === current?.id}>
      <button
        disabled={checkout.status === "starting"}
        onClick={() => checkout.start(plan.id, { interval: "month" })}
      >
        Choose
      </button>
    </MyCard>
  ));
}
```

`useCheckout` handles all three checkout kinds. For a redirect it navigates. For an embedded form it gives you a token to mount. For a phone prompt it sets `status` to `"awaiting_customer"` and polls until the payment resolves.

### Your own data client

`BillingProvider` takes any object that implements `BillingClient`. Use this to route through tRPC, GraphQL or server actions in place of the default fetch client.

```tsx
const client: BillingClient = {
  getState: () => trpc.billing.state.query(),
  startCheckout: (input) => trpc.billing.checkout.mutate(input),
  // …
};
```

## Server components

The styled components need no JavaScript to render their initial state. In a Next.js server component you can fetch state on the server and pass it down:

```tsx
import { getBillingState } from "@lotusly/billing-server/next";

const state = await getBillingState(billing);
return <BillingProvider client={client} initialState={state}>…</BillingProvider>;
```

## Accessibility

The supplied components are keyboard operable, labelled, show a visible focus ring, announce status changes, and respect `prefers-reduced-motion`. When you replace parts or go headless, keep these:

- Use real `<button>` and `<a>` elements.
- Keep the focus ring visible.
- Do not signal state by colour alone. Pair it with text or an icon.
- Announce checkout status changes in a live region.

## A reminder

`FeatureGate` and `useEntitlement` only hide interface. Enforce access on the server with `billing.can()` and `billing.limit()`.
