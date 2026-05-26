<script setup lang="ts">
import { computed } from 'vue';
import { useWizardStore } from '../../stores/wizard';
import { useSituationStore } from '../../stores/situation';
import { useAgreementStore } from '../../stores/agreement';
import { useUiStore } from '../../stores/ui';
import { buildComputeContext, resolveBySubstitution } from '../../domain/remuneration/engine';
import { getAllConventionDefs } from '../../domain/convention/catalog';
import { aggregateRemunerationDetails } from '../../domain/remuneration/aggregate';
import { getSmhForClasse } from '../../domain/remuneration/smh';
import { roundToEuro } from '../../domain/utils/rounding';
import RemunerationResult from './RemunerationResult.vue';

const wizard = useWizardStore();
const situation = useSituationStore();
const agreement = useAgreementStore();
const ui = useUiStore();

const computedResult = computed(() => {
  const rawSmh = getSmhForClasse(wizard.classe);
  const rate = situation.tempsPartiel ? situation.tauxActivite / 100 : 1;
  const baseSMH = roundToEuro(rawSmh * rate);

  const ctx = buildComputeContext(
    {
      anciennete: situation.anciennete,
      pointTerritorial: situation.pointTerritorial,
      forfait: situation.forfait,
      travailNuit: situation.travailNuit,
      heuresNuit: situation.heuresNuit,
      travailDimanche: situation.travailDimanche,
      heuresDimanche: situation.heuresDimanche,
      travailHeuresSup: situation.travailHeuresSup,
      heuresSup: situation.heuresSup,
      travailTempsPartiel: situation.tempsPartiel,
      tauxActivite: situation.tempsPartiel ? situation.tauxActivite : 100,
      experiencePro: situation.experiencePro,
      travailJoursSupForfait: situation.travailJoursSupForfait,
      joursSupForfait: situation.joursSupForfait,
    },
    baseSMH,
    wizard.classe,
    agreement.accordActif ? { ...agreement.inputs } : undefined,
  );

  const convDefs = getAllConventionDefs();
  const resolved = resolveBySubstitution(convDefs, [], ctx);
  const details = resolved.map((r) => r.result);

  return aggregateRemunerationDetails(details, baseSMH, ui.nbMois);
});
</script>

<template>
  <RemunerationResult :data="computedResult" :nb-mois="ui.nbMois" />
</template>
