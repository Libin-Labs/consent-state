import assert from 'node:assert/strict';
import test from 'node:test';
import { createConsentState } from '../dist/esm/index.js';

test('grants and expires consent at the exact boundary', () => {
  let time = 10_000;
  const state = createConsentState({ version: 'v1', now: () => time });
  assert.equal(state.grant('analytics', 10_500).status, 'consented');
  time = 10_499;
  assert.equal(state.get('analytics').status, 'consented');
  time = 10_500;
  assert.equal(state.get('analytics').status, 'expired');
});

test('revocation replaces a grant and remains explicit', () => {
  const state = createConsentState({ version: 'v1', now: () => 1 });
  const grant = state.grant('email');
  const revoked = state.revoke('email');
  assert.equal(state.get('email').status, 'revoked');
  assert.equal('grantedAt' in revoked, false);
  assert.ok(revoked.revision > grant.revision);
});

test('version changes make older unrevoked grants stale', () => {
  const state = createConsentState({ version: 'v1', now: () => 1 });
  state.grant('personalization');
  state.updateVersion('v2');
  assert.equal(state.version, 'v2');
  assert.equal(state.get('personalization').status, 'version-mismatch');
  assert.equal(state.get('unknown').status, 'absent');
});

test('regrant under the active version creates a fresh consent record', () => {
  const state = createConsentState({ version: 'v1', now: () => 42 });
  state.grant('analytics');
  state.updateVersion('v2');
  assert.equal(state.grant('analytics').status, 'consented');
  assert.equal(state.get('analytics').version, 'v2');
});

test('snapshots and purpose lists are detached and immutable', () => {
  const state = createConsentState({ version: 'v1', now: () => 1 });
  const grant = state.grant('storage');
  assert.equal(Object.isFrozen(grant), true);
  const names = state.purposes();
  assert.equal(Object.isFrozen(names), true);
  assert.deepEqual(names, ['storage']);
});

test('rejects invalid clocks, expiry, version, purpose and capacity', () => {
  assert.throws(() => createConsentState({ version: '' }), TypeError);
  assert.throws(() => createConsentState({ version: 'v1', now: () => NaN }).grant('x'), RangeError);
  assert.throws(
    () => createConsentState({ version: 'v1', now: () => 10 }).grant('x', 10),
    RangeError,
  );
  assert.throws(() => createConsentState({ version: 'v1', maxPurposes: 0 }), RangeError);
  const bounded = createConsentState({ version: 'v1', now: () => 1, maxPurposes: 1 });
  bounded.grant('first');
  assert.throws(() => bounded.grant('second'), RangeError);
});
