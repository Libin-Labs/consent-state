import {
  createConsentState,
  type ConsentSnapshot,
  type ConsentStatus,
} from '@lp-labs/consent-state';
const state = createConsentState({ version: '2026-01', now: () => 1_000 });
const snapshot: ConsentSnapshot = state.grant('analytics', 2_000);
const status: ConsentStatus = state.get('analytics').status;
void [snapshot, status];
