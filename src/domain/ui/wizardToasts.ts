/** Messages toast — contraintes métier connues (texte utilisateur, pas de jargon technique). */

export function wizardToastNbMoisImposeParAccord(nb: 12 | 13, accordNom: string): string {
  return `La répartition sur ${nb} mois est imposée par l'accord ${accordNom}. Vous ne pouvez pas la modifier.`;
}

export function wizardToastStepperLocked(stepLabel: string): string {
  return `Terminez d'abord les étapes précédentes pour accéder à « ${stepLabel} ».`;
}

export function wizardToastTauxActivitePlage(min: number, max: number): string {
  return `Le taux d'activité doit être compris entre ${min} % et ${max} %. La valeur a été ajustée.`;
}

export function wizardToastAncienneteMax(max: number): string {
  return `L'ancienneté ne peut pas dépasser ${max} ans. La valeur a été ajustée.`;
}
