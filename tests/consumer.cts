import consent = require('@lp-labs/consent-state');
const state = consent.createConsentState({ version: '1' });
const revoked = state.revoke('email');
void revoked.revision;
