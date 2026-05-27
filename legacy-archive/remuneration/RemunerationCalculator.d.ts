export function calculateAnnualRemuneration(
  state: Record<string, unknown>,
  agreement: unknown,
  options?: { mode?: string },
): {
  total: number;
  baseSMH: number;
  details?: { label: string; value: number; isBase?: boolean }[];
};

export function getMontantAnnuelSMHSeul(
  state: Record<string, unknown>,
  agreement: unknown,
  options?: { mode?: string },
): number;
