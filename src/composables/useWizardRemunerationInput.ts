import { computed } from 'vue';
import { useWizardStore } from '../stores/wizard';
import { useSituationStore } from '../stores/situation';
import { useAgreementStore } from '../stores/agreement';
import type { WizardRemunerationInput } from '../domain/remuneration/compute';

/** Entrée moteur rémunération à partir des stores Pinia (résultat, PDF, arriérés). */
export function useWizardRemunerationInput() {
  const wizard = useWizardStore();
  const situation = useSituationStore();
  const agreement = useAgreementStore();

  return computed(
    (): WizardRemunerationInput => ({
      mode: wizard.mode,
      groupe: wizard.groupe,
      classe: wizard.classe,
      scores: wizard.scores,
      situation: {
        anciennete: situation.anciennete,
        pointTerritorial: situation.pointTerritorial,
        tempsPartiel: situation.tempsPartiel,
        tauxActivite: situation.tauxActivite,
        forfait: situation.forfait,
        experiencePro: situation.experiencePro,
        travailNuit: situation.travailNuit,
        heuresNuit: situation.heuresNuit,
        travailDimanche: situation.travailDimanche,
        heuresDimanche: situation.heuresDimanche,
        travailHeuresSup: situation.travailHeuresSup,
        heuresSup: situation.heuresSup,
        travailJoursSupForfait: situation.travailJoursSupForfait,
        joursSupForfait: situation.joursSupForfait,
        nationalPrimeOverrides: situation.nationalPrimeOverrides,
        modalityState: situation.modalityState,
      },
      agreement: {
        accordActif: agreement.accordActif,
        activeAccordId: agreement.activeAccordId,
        inputs: agreement.inputs,
      },
    }),
  );
}
