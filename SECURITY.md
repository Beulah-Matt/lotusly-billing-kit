# Security Policy

Lotusly Billing Kit handles payments. We take reports seriously and will work with you to fix problems quickly.

## Reporting a vulnerability

**Please do not open a public issue, discussion or pull request for a security problem.**

Report privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability**. This creates a private advisory visible only to you and the maintainers.

Include as much of this as you can:

- The package and version affected.
- What an attacker could do, and what they need to do it.
- Steps to reproduce, or a proof of concept.
- Any suggested fix.

Use only test-mode provider keys and your own accounts when investigating. Do not access data that is not yours, and do not run tests against anyone's production deployment.

## What to expect

| Step | Target |
| --- | --- |
| Acknowledgement of your report | Within 3 working days |
| Initial assessment and severity | Within 7 working days |
| Fix for critical and high severity | As fast as possible, with a target of 14 days |
| Fix for medium and low severity | In the next regular release |

We will keep you updated, credit you in the advisory unless you prefer otherwise, and coordinate the disclosure date with you. We ask that you give us reasonable time to release a fix before publishing details.

There is no paid bug bounty.

## Supported versions

The project is pre-1.0. Only the latest published minor version of each package receives security fixes. After 1.0 this table will list the supported major versions.

| Version | Supported |
| --- | --- |
| Latest `0.x` | Yes |
| Older `0.x` | No |

## In scope

- Any package published from this repository.
- The example apps, where the flaw would also affect a real integration that follows the documentation.
- The documentation, where following it as written leads to an insecure setup.

Examples of what we most want to hear about:

- Accepting a forged or replayed webhook.
- Gaining paid access without a verified payment.
- Reading or changing another account's billing data.
- Charging a customer twice, or for the wrong amount.
- Bypassing authorization on customer or admin routes.
- Leaking secrets, provider tokens or personal data through logs, errors or the client bundle.
- Injection through any input the kit handles.
- A compromised or tampered release artifact.

## Out of scope

- Vulnerabilities in a payment provider's own systems. Report those to the provider.
- Problems in a host application's own code, such as a `resolveAccount` function that returns the wrong account.
- Deployments that ignore documented requirements, for example running without a rate limiter or exposing the cron endpoint without a secret.
- Denial of service that requires overwhelming volume.
- Findings from automated scanners with no demonstrated impact.

## What the kit does, and what you must do

The kit's controls and the threats they address are listed in [`docs/security.md`](docs/security.md).

Using the kit does not make an application secure or compliant by itself. As an adopter you are responsible for:

- Authentication, sessions and the `resolveAccount` and `resolveOperator` functions.
- Supplying a rate limiter.
- Storing and rotating secrets and the data encryption key.
- Database access control, backups and restore testing.
- Your PCI DSS self-assessment with your payment provider.
- Tax and data-protection obligations in your jurisdiction.
- Wiring and responding to the alerts described in the README.

## Release integrity

- Packages are published only from CI, with npm provenance, so each release can be traced to the commit and workflow that built it.
- Maintainers' npm and GitHub accounts require two-factor authentication.
- `billing-core` has no runtime dependencies. Other packages keep theirs minimal and are scanned for known vulnerabilities on every pull request.
- Security fixes are announced through GitHub Security Advisories and noted in the changelog.
