export type ConsentStatus = 'consented' | 'absent' | 'revoked' | 'expired' | 'version-mismatch';

export interface ConsentOptions {
  version: string;
  now?: () => number;
  maxPurposes?: number;
}

export interface ConsentSnapshot {
  readonly purpose: string;
  readonly status: ConsentStatus;
  readonly version?: string;
  readonly grantedAt?: number;
  readonly expiresAt?: number;
  readonly revision: number;
}

export interface ConsentState {
  readonly version: string;
  grant(purpose: string, expiresAt?: number): ConsentSnapshot;
  revoke(purpose: string): ConsentSnapshot;
  get(purpose: string): ConsentSnapshot;
  updateVersion(version: string): void;
  purposes(): readonly string[];
}

interface Entry {
  version: string;
  grantedAt?: number;
  expiresAt?: number;
  revoked: boolean;
  revision: number;
}

function text(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 128 || value.trim() !== value)
    throw new TypeError(`${name} must be a nonempty string up to 128 characters.`);
  return value;
}

function timestamp(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new RangeError(`${name} must be a nonnegative safe integer timestamp.`);
  return value;
}

/** Creates a bounded in-memory consent ledger; persistence and identity are application-owned. */
export function createConsentState(options: ConsentOptions): ConsentState {
  if (!options || typeof options !== 'object') throw new TypeError('options must be an object.');
  let currentVersion = text(options.version, 'version');
  const now = options.now ?? Date.now;
  if (typeof now !== 'function') throw new TypeError('now must be a function.');
  const maxPurposes = options.maxPurposes ?? 10_000;
  if (!Number.isSafeInteger(maxPurposes) || maxPurposes < 1 || maxPurposes > 100_000)
    throw new RangeError('maxPurposes must be an integer from 1 to 100000.');
  const entries = new Map<string, Entry>();
  let revision = 0;
  const instant = () => timestamp(now(), 'clock value');
  const snapshot = (purpose: string): ConsentSnapshot => {
    const entry = entries.get(purpose);
    const status: ConsentStatus = !entry
      ? 'absent'
      : entry.revoked
        ? 'revoked'
        : entry.version !== currentVersion
          ? 'version-mismatch'
          : entry.expiresAt !== undefined && instant() >= entry.expiresAt
            ? 'expired'
            : 'consented';
    return Object.freeze({
      purpose,
      status,
      ...(entry ? { version: entry.version } : {}),
      ...(entry?.grantedAt !== undefined ? { grantedAt: entry.grantedAt } : {}),
      ...(entry?.expiresAt !== undefined ? { expiresAt: entry.expiresAt } : {}),
      revision: entry?.revision ?? revision,
    });
  };
  const ensureSlot = (purpose: string) => {
    if (!entries.has(purpose) && entries.size >= maxPurposes)
      throw new RangeError('Consent purpose capacity exceeded.');
  };
  return Object.freeze({
    get version() {
      return currentVersion;
    },
    grant(purposeInput: string, expiresAt?: number) {
      const purpose = text(purposeInput, 'purpose');
      ensureSlot(purpose);
      const grantedAt = instant();
      if (expiresAt !== undefined) {
        timestamp(expiresAt, 'expiresAt');
        if (expiresAt <= grantedAt)
          throw new RangeError('expiresAt must be later than grant time.');
      }
      const entry: Entry = {
        version: currentVersion,
        grantedAt,
        revoked: false,
        revision: ++revision,
      };
      if (expiresAt !== undefined) entry.expiresAt = expiresAt;
      entries.set(purpose, entry);
      return snapshot(purpose);
    },
    revoke(purposeInput: string) {
      const purpose = text(purposeInput, 'purpose');
      ensureSlot(purpose);
      const entry: Entry = {
        version: currentVersion,
        revoked: true,
        revision: ++revision,
      };
      entries.set(purpose, entry);
      return snapshot(purpose);
    },
    get(purposeInput: string) {
      return snapshot(text(purposeInput, 'purpose'));
    },
    updateVersion(versionInput: string) {
      const version = text(versionInput, 'version');
      if (version !== currentVersion) {
        currentVersion = version;
        revision++;
      }
    },
    purposes() {
      return Object.freeze([...entries.keys()]);
    },
  });
}
