<script setup lang="ts">
import { useWizardStore } from '../../stores/wizard';
import { useSituationStore } from '../../stores/situation';
import { useAgreementStore } from '../../stores/agreement';
import { useWizardNavigation } from '../../composables/useWizardNavigation';
import { CONFIG } from '../../domain/config';
import { isCadre } from '../../domain/classification/engine';
import { getBaremeDebutantTranche, getSmhForClasse } from '../../domain/remuneration/smh';
import { computed, onMounted, ref, watch } from 'vue';
import { AppTooltip, NumericInput } from '../../components/ui';
import { buildWizardTooltipHtml } from '../../domain/ui/wizardTooltips';
import { WIZARD_TOOLTIPS, WIZARD_TOASTS } from '../../domain/ui/labels';
import { wizardToastAncienneteMax } from '../../domain/ui/wizardToasts';
import { dispatchAppToast } from '../../utils/appToast';
import ConditionsTravailPanel from '../agreement-options/ConditionsTravailPanel.vue';

const wizard = useWizardStore();
const situation = useSituationStore();
const agreementStore = useAgreementStore();
const { prevStep, nextStep } = useWizardNavigation();

const isCadreValue = computed(() => isCadre(wizard.classe));

const classificationReady = computed(() => Boolean(wizard.groupe && wizard.classe >= 1));

const statutLabel = computed(() => {
  if (!classificationReady.value) return '—';
  return isCadreValue.value ? 'Cadre' : 'Non-Cadre';
});

const minExperiencePro = computed(() =>
  showCadreDebutant.value ? Math.max(0, Math.floor(Number(situation.anciennete) || 0)) : 0,
);

watch(
  () => situation.anciennete,
  () => {
    const ae = Math.max(0, Math.floor(Number(situation.anciennete) || 0));
    if (showCadreDebutant.value && situation.experiencePro < ae) {
      situation.experiencePro = ae;
    }
  },
);

function onExperienceProBlur() {
  const a = Math.max(0, Math.floor(Number(situation.anciennete) || 0));
  if (situation.experiencePro < a) situation.experiencePro = a;
}

const showCadreDebutant = computed(
  () => isCadreValue.value && wizard.classe >= 11 && wizard.classe <= 12,
);

/**
 * Barème débutants F11/F12 : CCNM Annexe I (grille débutants) — champ affiché uniquement pour cadres en F11/F12.
 * L’ancienneté professionnelle hors entreprise sert au plafond du barème (seuil catalogue `BAREME_DEBUTANTS_SEUIL_EXP_PRO`).
 */
const smhDebutantPreview = computed(() => {
  if (!showCadreDebutant.value) return null;
  const exp = Number(situation.experiencePro) || 0;
  if (exp >= CONFIG.BAREME_DEBUTANTS_SEUIL_EXP_PRO) return null;
  const tranche = getBaremeDebutantTranche(exp);
  const montant = getSmhForClasse(wizard.classe, CONFIG.CURRENT_DATA_YEAR, exp);
  return { tranche, montant };
});

/** Afficher l’aperçu SMH seulement après une saisie manuelle (pas au chargement ni si sync ancienneté). */
const experienceProEditedByUser = ref(false);

const showSmhDebutantIndicatif = computed(
  () => smhDebutantPreview.value != null && experienceProEditedByUser.value,
);

watch(showCadreDebutant, (show) => {
  if (!show) experienceProEditedByUser.value = false;
});

function onExperienceProUserInput(v: number) {
  experienceProEditedByUser.value = true;
  situation.experiencePro = v;
}

const pointTerritorialTooltip = computed(() => buildWizardTooltipHtml('pointTerritorial'));

watch(
  [() => situation.forfait, () => isCadre(wizard.classe)],
  () => {
    const cadre = isCadre(wizard.classe);
    const cadreForfaitJours = cadre && situation.forfait === 'jours';
    if (cadreForfaitJours) {
      situation.travailHeuresSup = false;
      situation.heuresSup = 0;
    } else {
      situation.travailJoursSupForfait = false;
      situation.joursSupForfait = 0;
    }
    if (!cadre && situation.forfait !== '35h') {
      situation.forfait = '35h';
    }
  },
  { flush: 'sync', immediate: true },
);

const experienceProTooltip = computed(() => buildWizardTooltipHtml('experiencePro'));

const ancienneteTooltip = computed(() => buildWizardTooltipHtml('anciennete'));

onMounted(() => {
  situation.pointTerritorial = situation.pointTerritorial || CONFIG.POINT_TERRITORIAL.valeurDefaut;
  agreementStore.bootstrapFromUrl();
});

function onExperienceProBlockedByMin() {
  if (!showCadreDebutant.value) return;
  dispatchAppToast(WIZARD_TOASTS.experienceProMinAnciennete, 'info');
}

const ANCIENNETE_MAX = 50;

function onAncienneteBlockedByMax() {
  dispatchAppToast(wizardToastAncienneteMax(ANCIENNETE_MAX), 'info');
}

function validate() {
  nextStep();
}
</script>

<template>
  <section class="wizard-step" aria-label="Étape 2 — Situation">
    <div class="step-content">
      <h2>Votre situation</h2>

      <div class="recap-classification">
        <div class="recap-badge-wrapper">
          <div class="classification-badge small">
            <span class="groupe">{{ wizard.groupe }}</span>
            <span class="classe">{{ wizard.classe }}</span>
          </div>
          <span
            class="statut-badge small"
            :class="!classificationReady ? '' : isCadreValue ? 'cadre' : 'non-cadre'"
            >{{ statutLabel }}</span
          >
        </div>
        <button type="button" class="btn-link" @click="prevStep">Modifier la classification</button>
      </div>

      <div class="form-grid">
        <div class="form-group">
          <label for="anciennete">
            Ancienneté (années)
            <AppTooltip :content="ancienneteTooltip" variant="result" position="top" />
          </label>
          <NumericInput
            id="anciennete"
            v-model="situation.anciennete"
            mode="integer"
            :min="0"
            :max="ANCIENNETE_MAX"
            @blocked-by-max="onAncienneteBlockedByMax"
          />
        </div>
      </div>

      <div v-if="!isCadreValue" id="modalites-non-cadre" class="modalites-non-cadre">
        <div class="form-group">
          <label for="point-territorial">
            Valeur du point territorial (€)
            <AppTooltip :content="pointTerritorialTooltip" variant="result" position="top" />
          </label>
          <NumericInput
            id="point-territorial"
            v-model="situation.pointTerritorial"
            mode="decimal"
            :min="0"
            step="0.01"
          />
        </div>
      </div>

      <div v-if="isCadreValue" id="modalites-cadre" class="modalites-cadre">
        <div class="form-group">
          <label for="forfait">Type de forfait</label>
          <select id="forfait" v-model="situation.forfait" class="book-select">
            <option value="35h">Base 35h</option>
            <option value="heures">Forfait heures</option>
            <option value="jours">Forfait jours</option>
          </select>
        </div>

        <div v-if="showCadreDebutant" id="cadre-debutant" class="cadre-debutant">
          <div class="form-group">
            <label for="experience-pro">
              Expérience professionnelle (années)
              <AppTooltip :content="experienceProTooltip" variant="result" position="top" />
            </label>
            <NumericInput
              id="experience-pro"
              :model-value="situation.experiencePro"
              mode="integer"
              :min="minExperiencePro"
              @update:model-value="onExperienceProUserInput"
              @blur="onExperienceProBlur"
              @blocked-by-min="onExperienceProBlockedByMin"
            />
          </div>
          <p v-if="showSmhDebutantIndicatif && smhDebutantPreview" class="cadre-debutant-smh">
            <strong>Salaire minimum indicatif</strong> (barème débutants, tranche
            {{ smhDebutantPreview.tranche }}) :
            {{
              new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'EUR',
                maximumFractionDigits: 0,
              }).format(smhDebutantPreview.montant)
            }}
            /an ({{ CONFIG.CURRENT_DATA_YEAR }})
          </p>
        </div>
      </div>

      <ConditionsTravailPanel />

      <div class="step-actions">
        <button type="button" class="book-btn btn-secondary" @click="prevStep">
          <span class="btn-icon btn-icon-left">‹</span> Retour
        </button>
        <button type="button" class="book-btn btn-primary" @click="validate">
          Calculer <span class="btn-icon btn-icon-right">›</span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.recap-classification {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
  margin-bottom: 1.25rem;
}
.recap-badge-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.modalites-cadre {
  margin: 1rem 0;
}
.modalites-non-cadre {
  margin: 0 0 1rem;
}
.cadre-debutant-smh {
  margin: 0.75rem 0 0;
  font-size: 0.92rem;
  color: var(--text-secondary, #444);
}
.cadre-debutant {
  margin-top: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--border-color, #e5e7eb);
  background: var(--gray-50, #f9fafb);
}
</style>
