import { omitRecordKeys } from '../utils/record';
import type { NationalPrimeOverrideRow } from './catalog';

/** Clés dynamiques modalités CCNM (legacy `state.accordInputs` pour les primes « extra »). */
export type ModalityState = Record<string, boolean | number>;

export function isNationalModalityActive(
  modalityState: ModalityState,
  stateKeyActif: string,
): boolean {
  return modalityState[stateKeyActif] === true;
}

export function modalityQuantity(
  modalityState: ModalityState,
  quantityKey: string,
  fallback = 0,
): number {
  const v = modalityState[quantityKey];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return fallback;
}

export function hasNationalPrimeOverride(
  overrides: Record<string, number>,
  semanticId: string,
): boolean {
  return Object.prototype.hasOwnProperty.call(overrides, semanticId);
}

export function nationalPrimeOverrideValue(
  overrides: Record<string, number>,
  semanticId: string,
  fallback: number,
): number {
  const v = overrides[semanticId];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return fallback;
}

export function clearNationalModality(
  modalityState: ModalityState,
  overrides: Record<string, number>,
  row: NationalPrimeOverrideRow,
): { modalityState: ModalityState; nationalPrimeOverrides: Record<string, number> } {
  const modalityKeys = row.quantityKey
    ? ([row.stateKeyActif, row.quantityKey] as const)
    : ([row.stateKeyActif] as const);

  return {
    modalityState: omitRecordKeys(modalityState, modalityKeys),
    nationalPrimeOverrides: omitRecordKeys(overrides, [row.semanticId]),
  };
}

export function activateNationalModality(
  modalityState: ModalityState,
  overrides: Record<string, number>,
  row: NationalPrimeOverrideRow,
): { modalityState: ModalityState; nationalPrimeOverrides: Record<string, number> } {
  const nextModality: ModalityState = {
    ...modalityState,
    [row.stateKeyActif]: true,
  };
  if (row.quantityKey) {
    nextModality[row.quantityKey] = row.defaultQuantity ?? 0;
  }

  let nextOverrides = { ...overrides };
  if (row.seedOverrideOnActivate) {
    nextOverrides = { ...nextOverrides, [row.semanticId]: row.defaultValue };
  }

  return { modalityState: nextModality, nationalPrimeOverrides: nextOverrides };
}

export function setModalityQuantity(
  modalityState: ModalityState,
  quantityKey: string,
  value: number,
): ModalityState {
  return { ...modalityState, [quantityKey]: value };
}

export function setNationalPrimeOverride(
  overrides: Record<string, number>,
  row: NationalPrimeOverrideRow,
  value: number,
): Record<string, number> {
  if (row.valueField === 'optionalRate' && !(value > 0)) {
    return omitRecordKeys(overrides, [row.semanticId]);
  }
  return { ...overrides, [row.semanticId]: value };
}
