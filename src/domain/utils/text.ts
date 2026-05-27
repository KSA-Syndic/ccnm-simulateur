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
