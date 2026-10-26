import { CONSENT_ITEMS } from '../../common/enums';
import type { ConsentItem, ConsentSource } from '../../common/enums';
import type { ConsentRecord } from '@prisma/client';

/** The wire shape of `ConsentState` in openapi.yaml. */
export interface ConsentStateView {
  item: ConsentItem;
  granted: boolean;
  source: ConsentSource;
  appVersion: string | null;
  recordedAt: Date;
}

export interface ConsentRecordLike {
  item: ConsentItem;
  granted: boolean;
  source: ConsentSource;
  appVersion: string | null;
  recordedAt: Date;
}

export function toConsentState(record: ConsentRecordLike): ConsentStateView {
  return {
    item: record.item,
    granted: record.granted,
    source: record.source,
    appVersion: record.appVersion,
    recordedAt: record.recordedAt,
  };
}

/**
 * Current state for every consent item. The newest record per item wins.
 * An item with no record has never been granted, so it projects as refused from
 * onboarding at the account's creation time. That gives `GET /v1/consents` a
 * complete, stable shape without inventing consent the user never gave.
 *
 * ASSUMPTION (spec file absent): signup records only `crisis_detection` as
 * granted. The remaining items are refused-by-default until the client grants
 * them explicitly.
 */
export function projectConsentStates(
  records: readonly ConsentRecordLike[],
  accountCreatedAt: Date,
): ConsentStateView[] {
  const latest = new Map<ConsentItem, ConsentRecordLike>();
  for (const record of records) {
    // Records arrive newest first, so a strict comparison keeps the newest row
    // for an item and makes an exact timestamp tie deterministic (first wins).
    const current = latest.get(record.item);
    if (!current || record.recordedAt.getTime() > current.recordedAt.getTime()) {
      latest.set(record.item, record);
    }
  }

  return CONSENT_ITEMS.map((item) => {
    const record = latest.get(item);
    if (record) return toConsentState(record);
    return {
      item,
      granted: false,
      source: 'onboarding',
      appVersion: null,
      recordedAt: accountCreatedAt,
    };
  });
}

export function findConsentState(
  states: readonly ConsentStateView[],
  item: ConsentItem,
): ConsentStateView {
  const state = states.find((candidate) => candidate.item === item);
  if (!state) {
    // projectConsentStates always returns every item, so this is a programming error.
    throw new Error(`Consent projection is missing item ${item}`);
  }
  return state;
}

/** Prisma rows carry extra columns; this keeps the projection free of Prisma types. */
export function fromConsentRecord(record: ConsentRecord): ConsentRecordLike {
  return {
    item: record.item as ConsentItem,
    granted: record.granted,
    source: record.source as ConsentSource,
    appVersion: record.appVersion,
    recordedAt: record.recordedAt,
  };
}
