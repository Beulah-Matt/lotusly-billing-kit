# Contributing to Lotusly Billing Kit

Thanks for your interest. This project handles other people's money, so the bar for changes is correctness first, then clarity, then everything else.

> The project is pre-alpha. Until milestone M1 lands, the most useful contributions are design feedback on the [architecture decision records](docs/adr) and the port interfaces.

## Ways to contribute

- **Report a bug.** Open an issue with what you did, what you expected and what happened. Include package versions.
- **Report a security problem.** Do not open an issue. Follow [`SECURITY.md`](SECURITY.md).
- **Propose a change.** For anything larger than a small fix, open an issue or discussion first so we can agree on the approach before you write code.
- **Improve the docs.** Corrections and clearer wording are always welcome.
- **Build an adapter.** Providers and stores can live in your own repo. See [write a provider](docs/guides/write-a-provider.md) and [write a store](docs/guides/write-a-store.md). We link to community adapters that pass the contract suites.

## Setup

Requirements: Node.js 22.18 or later, pnpm 12 or later, Docker (for the Postgres tests).

```bash
git clone <repo-url>
cd lotusly-billing-kit
pnpm install
pnpm build
pnpm test
```

| Command | What it runs |
| --- | --- |
| `pnpm build` | Builds every package |
| `pnpm test` | Unit, property and contract tests against the memory store and mock provider |
| `pnpm test:postgres` | Store contract suite against Postgres in Docker |
| `pnpm lint` | ESLint, formatting and the import-boundary check |
| `pnpm typecheck` | TypeScript across the workspace |
| `pnpm changeset` | Records a version bump for your change |

To try the example app, copy its `.env.example`, add Paystack **test** keys and a database URL, then run `pnpm --filter next-postgres-paystack dev`.

## Rules that are not negotiable

These protect the three [design guarantees](README.md#design-guarantees). CI enforces most of them.

1. **`billing-core` imports nothing outside itself.** No provider code, no database driver, no framework, no runtime dependencies. Time, randomness, encryption and telemetry come in through ports.
2. **Adapters never import each other.** A provider does not know which store is in use, and the reverse.
3. **Browser packages contain no server code and no secrets.**
4. **All writes go through `store.commit()`.** One use case, one atomic change set.
5. **Money is an integer in minor units.** No floating-point arithmetic on amounts, anywhere.
6. **Subscription status is derived, never stored as the source of truth.** See [ADR 0002](docs/adr/0002-derived-subscription-status.md).
7. **Every ledger change set sums to zero.**
8. **Nothing the browser sends can grant paid access.** State changes that grant access need provider-verified information or an audited admin action.

A pull request that needs to break one of these needs a new ADR first.

## Making a change

1. Fork and create a branch from `main`: `fix/short-description` or `feat/short-description`.
2. Write the test first where you can. For a bug, add a test that fails without your fix.
3. Make the change. Keep the pull request focused on one thing.
4. Run `pnpm lint && pnpm typecheck && pnpm test`.
5. Add a changeset: `pnpm changeset`. Pick the affected packages and the bump type, and write one sentence a user of the package would understand.
6. Open the pull request and fill in the template.

### Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org): `fix(core): round proration lines half up`. The scope is the package folder name.

### What a good pull request includes

- A description of the problem and why this is the right fix.
- Tests that cover the change, including the failure case.
- Docs updated when behaviour or a public type changes.
- A changeset, unless the change is docs-only or test-only.
- No unrelated formatting or refactoring.

## Testing expectations

| If you change… | You must add or update… |
| --- | --- |
| Domain logic | Unit tests, plus a time-travel scenario if dates are involved |
| Anything that computes money | A property test showing no money is created or lost |
| A use case | A fault-injection case if it has more than one step |
| The store port or a store | The `storeContract` suite, so every store is held to it |
| The provider port or a provider | The `providerContract` suite and recorded fixtures |
| A server route | Request validation tests and the authorization failure case |
| A security control | A test for the attack it prevents, linked from [`docs/security.md`](docs/security.md) |
| A UI component | Tests for its states, keyboard use and an automated accessibility check |

Tests must be deterministic. Use the fake clock from `@lotusly/billing-testing`; never call `Date.now()` or `Math.random()` in the core.

### Webhook fixtures

Provider fixtures are real payloads recorded from the provider's **test mode**. Before committing one, remove or replace emails, phone numbers, names and customer codes. Never commit a payload from live mode.

## Versioning and compatibility

- Packages follow semantic versioning and are versioned independently with Changesets.
- **The port interfaces are the public contract.** Adding an optional method or field is a minor release. Removing something, or changing what an existing method means, is a major release.
- The HTTP API under `/v1` only gains fields. Breaking changes go to a new version served alongside.
- Database migrations are forward-only and follow expand-then-contract, so a new kit version can run against the previous schema during a rolling deploy.
- Before 1.0, minor releases may contain breaking changes. They are always called out in the changelog.

## Proposing a design change

Decisions that affect a port, the data model or a guarantee are recorded as ADRs.

1. Copy [`docs/adr/0000-template.md`](docs/adr/0000-template.md) to the next number.
2. Describe the context, the options you considered and the consequences, including the downsides.
3. Open a pull request with only the ADR. Code follows once it is accepted.

## Style

- TypeScript strict mode. No `any` in public types.
- Prefer plain functions and data over classes in the core.
- Name things by what they mean in billing, using the terms in the README.
- Errors are typed and carry a stable `code`. Messages say what went wrong and what the caller can do.
- Never log secrets, tokens, full webhook bodies or personal data.
- Comments explain why, not what.

## Code of conduct

Be respectful and constructive. Assume good intent, critique the code and not the person, and keep discussion on the technical question. Maintainers may remove comments or block accounts that make the project unwelcoming.

## Licence

By contributing, you agree that your contributions are licensed under the [MIT Licence](LICENSE).
