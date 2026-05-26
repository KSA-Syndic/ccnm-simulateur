<script setup lang="ts">
import { computed } from 'vue';
import SimulatorLayout from '../../components/SimulatorLayout.vue';
import { useWizardStore } from '../../stores/wizard';
import { useSituationStore } from '../../stores/situation';
import { useUiStore } from '../../stores/ui';
import { useWizardNavigation } from '../../composables/useWizardNavigation';
import { buildComputeContext } from '../../domain/remuneration/engine';
import { getAllConventionDefs } from '../../domain/convention/catalog';
import { resolveBySubstitution, computeElement } from '../../domain/remuneration/engine';
import { CONFIG } from '../../domain/config';
import { roundToEuro } from '../../domain/utils/rounding';

const wizard = useWizardStore();
const situation = useSituationStore();
const ui = useUiStore();
const { prevStep, goToStep } = useWizardNavigation();

const smhAnnuel = computed(() => {
  const smh = CONFIG.SMH[wizard.classe];
  if (!smh) return 0;
  return smh;
});

const baseSMH = computed(() => {
  const rate = situation.tempsPartiel ? situation.tauxActivite / 100 : 1;
  return roundToEuro(smhAnnuel.value * rate);
});

const ctx = computed(() =>
  buildComputeContext(
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
    },
    baseSMH.value,
    wizard.classe,
  ),
);

const conventionDefs = computed(() => getAllConventionDefs());

const resolvedElements = computed(() => resolveBySubstitution(conventionDefs.value, [], ctx.value));

const total = computed(() => {
  let sum = baseSMH.value;
  for (const el of resolvedElements.value) {
    if (!el.result.inclusDansSMH) sum += el.result.amount;
  }
  return roundToEuro(sum);
});

const mensuel = computed(() => roundToEuro(total.value / ui.nbMois));

function formatMoney(v: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v);
}
</script>

<template>
  <SimulatorLayout>
    <section class="wizard-step" aria-label="Étape 3 — Résultat">
      <div class="step-content">
        <h2>Résultat de la simulation</h2>
        <p class="step-subtitle">Classification {{ wizard.groupe }}{{ wizard.classe }}</p>

        <div class="result-card">
          <div class="result-main">
            <span class="result-value">{{ formatMoney(total) }}</span>
            <span class="result-label">Rémunération annuelle brute</span>
          </div>
          <div class="result-monthly">
            <span class="result-value-secondary">{{ formatMoney(mensuel) }}</span>
            <span class="result-label">soit par mois ({{ ui.nbMois }} mois)</span>
            <div class="months-toggle">
              <button
                type="button"
                class="month-btn"
                :class="{ active: ui.nbMois === 12 }"
                @click="ui.nbMois = 12"
              >
                12 mois
              </button>
              <button
                type="button"
                class="month-btn"
                :class="{ active: ui.nbMois === 13 }"
                @click="ui.nbMois = 13"
              >
                13 mois
              </button>
            </div>
          </div>
        </div>

        <details class="result-details-toggle" open>
          <summary>Détail du calcul</summary>
          <div class="result-details">
            <div class="detail-line detail-line--base">
              <span>Salaire de base ({{ wizard.groupe }}{{ wizard.classe }})</span>
              <span>{{ formatMoney(baseSMH) }}</span>
            </div>
            <div
              v-for="el in resolvedElements"
              :key="el.def.id"
              class="detail-line"
              :class="{ 'detail-line--smh': el.result.inclusDansSMH }"
            >
              <span>
                {{ el.result.label }}
                <small v-if="el.note">({{ el.note }})</small>
              </span>
              <span>{{ formatMoney(el.result.amount) }}</span>
            </div>
          </div>
        </details>

        <div class="arretees-check-card">
          <p><strong>Vérifiez vos arriérés de salaire</strong></p>
          <p>Comparez votre salaire réel avec le minimum conventionnel sur une période passée.</p>
          <button class="book-btn btn-primary" @click="goToStep(4, { allowForward: true })">
            Calculer mes arriérés
          </button>
        </div>

        <div class="step-actions">
          <button class="book-btn btn-secondary" @click="prevStep">
            <span class="btn-icon btn-icon-left">‹</span> Modifier
          </button>
          <button
            class="book-btn btn-primary"
            @click="
              ui.resetAll();
              goToStep(1);
            "
          >
            <span class="btn-icon">↻</span> Recommencer
          </button>
        </div>
      </div>
    </section>
  </SimulatorLayout>
</template>
