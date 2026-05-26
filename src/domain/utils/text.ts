const ACRONYMS: Record<string, string> = {
  CCN: 'Convention Collective Nationale',
  CCNM: 'Convention Collective Nationale de la Métallurgie',
  SMH: 'Salaire Minimum Hiérarchique',
  PDF: 'format de document portable',
  UIMM: 'Union des Industries et Métiers de la Métallurgie',
  UES: 'Unité Économique et Sociale',
};

const acronymsExplained = new Set<string>();

export function formatAcronym(acronym: string, forceExplanation = false): string {
  if (!acronym || typeof acronym !== 'string') return acronym;
  const upper = acronym.toUpperCase();
  const full = ACRONYMS[upper];
  if (!full) return acronym;

  if (!acronymsExplained.has(upper) || forceExplanation) {
    acronymsExplained.add(upper);
    return `${full} (${acronym})`;
  }
  return acronym;
}

export function resetAcronymsRegistry(): void {
  acronymsExplained.clear();
}

export function getAcronymFullForm(acronym: string): string | null {
  if (!acronym || typeof acronym !== 'string') return null;
  return ACRONYMS[acronym.toUpperCase()] ?? null;
}

export function formatWithUnit(value: number | null | undefined, unit: string): string {
  if (value === null || value === undefined) return '-';
  const formatted =
    typeof value === 'number'
      ? new Intl.NumberFormat('fr-FR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        }).format(value)
      : String(value);
  return `${formatted} ${unit}`;
}
