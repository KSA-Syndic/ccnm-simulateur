/** Entrée glossaire — formulation grand public + sigle technique pour tooltips. */
export interface GlossaryEntry {
  full: string;
  plain: string;
  hint: string;
}

/** Source unique des acronymes métallurgie / paie (UI, tooltips, labels). */
export const ACRONYM_GLOSSARY = {
  CCNM: {
    full: 'Convention collective nationale de la métallurgie',
    plain: 'convention métallurgie',
    hint: 'Texte conventionnel applicable aux salariés relevant du périmètre métallurgie (signée 2022, entrée en vigueur 2024, mise à jour par avenants).',
  },
  SMH: {
    full: 'Salaire minimum hiérarchique',
    plain: 'minimum conventionnel',
    hint: 'Salaire annuel brut minimum garanti par la convention pour chaque classe, avant primes et majorations.',
  },
  IDCC: {
    full: 'Identifiant de la convention collective',
    plain: 'numéro officiel de la convention',
    hint: "Numéro attribué par l'État pour identifier la convention. La métallurgie porte le numéro 3248.",
  },
  UIMM: {
    full: 'Union des industries et métiers de la métallurgie',
    plain: 'fédération patronale métallurgie',
    hint: 'Organisation patronale signataire de la convention collective.',
  },
} as const satisfies Record<string, GlossaryEntry>;

export type AcronymKey = keyof typeof ACRONYM_GLOSSARY;

/** Sigle entre parenthèses après la formulation complète (première occurrence d’un écran). */
export function acronymWithSigle(key: AcronymKey): string {
  const e = ACRONYM_GLOSSARY[key];
  const sigle = key;
  return `${e.full} (${sigle})`;
}

/** Libellé court grand public + sigle entre parenthèses. */
export function plainWithSigle(key: AcronymKey, capitalize = false): string {
  const e = ACRONYM_GLOSSARY[key];
  const plain = capitalize ? e.plain.charAt(0).toUpperCase() + e.plain.slice(1) : e.plain;
  const sigle = key;
  return `${plain} (${sigle})`;
}
