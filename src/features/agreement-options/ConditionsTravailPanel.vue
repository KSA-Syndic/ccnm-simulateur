<script setup lang="ts">
import { computed } from 'vue';
import { useSituationStore } from '../../stores/situation';
import { useWizardStore } from '../../stores/wizard';
import { useAgreementStore } from '../../stores/agreement';
import { isCadre } from '../../domain/classification/engine';
import { CONFIG } from '../../domain/config';
import { getAgreement } from '../../domain/agreements/registry';
import { resolvePrimeSemanticId } from '../../domain/agreements/interface';
import { SEMANTIC_ID } from '../../domain/types';
import { AppTooltip, NumericInput } from '../../components/ui';
import { buildWizardTooltipHtml, type WizardTooltipKey } from '../../domain/ui/wizardTooltips';
import { wizardToastTauxActivitePlage } from '../../domain/ui/wizardToasts';
import { dispatchAppToast } from '../../utils/appToast';
import HourlyPrimesList from './HourlyPrimesList.vue';
import AutresPrimesNationalesList from './AutresPrimesNationalesList.vue';

const situation = useSituationStore();
const wizard = useWizardStore();
const agreementStore = useAgreementStore();

const isCadreStatus = computed(() => isCadre(wizard.classe));
const showForfaitJours = computed(() => isCadreStatus.value && situation.forfait === 'jours');

const accordSubstitueEquipe = computed(() => {
  if (!agreementStore.accordActif || !agreementStore.activeAccordId) return false;
  const doc = getAgreement(agreementStore.activeAccordId);
  if (!doc) return false;
  return doc.primes.some((p) => resolvePrimeSemanticId(p) === SEMANTIC_ID.PRIME_EQUIPE);
});

const showEquipeCcnm = computed(() => !isCadreStatus.value && !accordSubstitueEquipe.value);

const travailEquipeActif = computed({
  get: () => situation.modalityState.travailEquipe === true,
  set: (on: boolean) => {
    situation.modalityState = { ...situation.modalityState, travailEquipe: on };
  },
});

function tt(key: WizardTooltipKey) {
  return buildWizardTooltipHtml(key);
}

function onTauxActiviteBlocked() {
  dispatchAppToast(
    wizardToastTauxActivitePlage(CONFIG.TAUX_ACTIVITE_MIN, CONFIG.TAUX_ACTIVITE_MAX),
    'info',
  );
}
</script>

<template>
  <details id="conditions-travail" class="conditions-details">
    <summary>Conditions de travail</summary>
    <div class="conditions-content">
      <!-- Part-time -->
      <div class="form-group">
        <label class="checkbox-label">
          <input v-model="situation.tempsPartiel" type="checkbox" class="book-checkbox" />
          <span>Temps partiel</span>
        </label>
        <div v-if="situation.tempsPartiel" class="sub-field sub-field-inline">
          <div class="input-with-unit">
            <NumericInput
              v-model="situation.tauxActivite"
              mode="decimal"
              :min="CONFIG.TAUX_ACTIVITE_MIN"
              :max="CONFIG.TAUX_ACTIVITE_MAX"
              aria-label="Taux d'activité"
              @blocked-by-min="onTauxActiviteBlocked"
              @blocked-by-max="onTauxActiviteBlocked"
            />
            <span class="input-unit">%</span>
          </div>
        </div>
      </div>

      <!-- Night work -->
      <div class="form-group">
        <label class="checkbox-label">
          <input v-model="situation.travailNuit" type="checkbox" class="book-checkbox" />
          <span>Travail de nuit</span>
          <AppTooltip :content="tt('travailNuit')" variant="result" position="top" />
        </label>
        <div v-if="situation.travailNuit" class="sub-field sub-field-inline">
          <div class="input-with-unit">
            <NumericInput
              v-model="situation.heuresNuit"
              mode="decimal"
              :min="0"
              aria-label="Heures de nuit par mois"
            />
            <span class="input-unit">heures/mois</span>
          </div>
        </div>
      </div>

      <!-- Sunday -->
      <div class="form-group">
        <label class="checkbox-label">
          <input v-model="situation.travailDimanche" type="checkbox" class="book-checkbox" />
          <span>Travail le dimanche</span>
          <AppTooltip :content="tt('travailDimanche')" variant="result" position="top" />
        </label>
        <div v-if="situation.travailDimanche" class="sub-field sub-field-inline">
          <div class="input-with-unit">
            <NumericInput
              v-model="situation.heuresDimanche"
              mode="decimal"
              :min="0"
              aria-label="Heures dimanche par mois"
            />
            <span class="input-unit">heures/mois</span>
          </div>
        </div>
      </div>

      <!-- Overtime (not forfait jours) -->
      <div v-if="!showForfaitJours" class="form-group">
        <label class="checkbox-label">
          <input v-model="situation.travailHeuresSup" type="checkbox" class="book-checkbox" />
          <span>Heures supplémentaires</span>
          <AppTooltip :content="tt('heuresSup')" variant="result" position="top" />
        </label>
        <div v-if="situation.travailHeuresSup" class="sub-field sub-field-inline">
          <div class="input-with-unit">
            <NumericInput
              v-model="situation.heuresSup"
              mode="decimal"
              :min="0"
              aria-label="Heures supplémentaires par mois"
            />
            <span class="input-unit">heures/mois</span>
          </div>
        </div>
      </div>

      <!-- Team work (CCNM — non-cadre, hidden when enterprise agreement substitutes) -->
      <div v-if="showEquipeCcnm" class="form-group">
        <label class="checkbox-label">
          <input v-model="travailEquipeActif" type="checkbox" class="book-checkbox" />
          <span>Travail en équipe</span>
          <AppTooltip :content="tt('travailEquipe')" variant="result" position="top" />
        </label>
      </div>

      <!-- Forfait jours sup -->
      <div v-if="showForfaitJours" class="form-group">
        <label class="checkbox-label">
          <input v-model="situation.travailJoursSupForfait" type="checkbox" class="book-checkbox" />
          <span>Jours supplémentaires (rachat)</span>
          <AppTooltip :content="tt('joursSupForfait')" variant="result" position="top" />
        </label>
        <div v-if="situation.travailJoursSupForfait" class="sub-field sub-field-inline">
          <div class="input-with-unit">
            <NumericInput
              v-model="situation.joursSupForfait"
              mode="decimal"
              :min="0"
              aria-label="Jours supplémentaires rachetés par an"
            />
            <span class="input-unit">jours/an</span>
          </div>
        </div>
      </div>

      <HourlyPrimesList />

      <AutresPrimesNationalesList />
    </div>
  </details>
</template>
