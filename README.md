# @lp-labs/consent-state

Bounded in-memory consent records with version checks, expiry and explicit revocation. No runtime
or peer dependencies.

## Install

```sh
npm install @lp-labs/consent-state
```

Provides ESM, CommonJS and TypeScript declarations for Node 18+.

## Quickstart

```js
import { createConsentState } from '@lp-labs/consent-state';

let now = 1_000;
const consents = createConsentState({ version: '2026-01', now: () => now });
consents.grant('analytics', 2_000);
if (consents.get('analytics').status !== 'consented') {
  throw new Error('Consent was not recorded');
}
consents.revoke('analytics');
if (consents.get('analytics').status !== 'revoked') throw new Error('Revocation must take effect');
now = 2_000;
```

CommonJS: `const { createConsentState } = require('@lp-labs/consent-state');`.

## API and types

Runtime export: `createConsentState(options): ConsentState`.

Exported types:

- `ConsentStatus`: `consented`, `absent`, `revoked`, `expired`, or `version-mismatch`.
- `ConsentOptions`: required current `version`, optional injected millisecond clock `now`, and
  optional `maxPurposes` (default 10,000, maximum 100,000).
- `ConsentSnapshot`: purpose, status, revision and, when present, the stored version, original
  grant timestamp and optional expiry. A revocation does not claim a grant timestamp.
- `ConsentState`: read-only current `version`; `grant(purpose, expiresAt?)`, `revoke(purpose)`,
  `get(purpose)`, `updateVersion(version)` and `purposes()`.

All times are nonnegative safe-integer epoch milliseconds. Consent is expired when `now >=
expiresAt`. Changing the active version invalidates older unrevoked grants; a new grant under the
active version restores the `consented` status. Revocations are explicit and replace any previous
grant. Every mutation receives an increasing revision; a version update also advances it.

## Validation, storage and limits

- `purpose` and `version` must be trimmed, nonempty strings up to 128 characters.
- Expiry must be later than grant time. The clock must return a nonnegative safe integer timestamp.
- Invalid types throw `TypeError`; invalid timestamps, capacity and limits throw `RangeError`.
- Snapshots and purpose lists are immutable copies. The default record limit is 10,000; configure
  up to 100,000 purposes.
- This is a process-local ledger only. It has no identity model, persistence, synchronization,
  audit log, legal compliance logic, withdrawal UI or cross-process consistency. Persist and
  protect records using application-owned trusted infrastructure and define applicable policies
  with qualified counsel.

All exported API names: `createConsentState`, `ConsentStatus`, `ConsentOptions`, `ConsentSnapshot`,
`ConsentState`.

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
