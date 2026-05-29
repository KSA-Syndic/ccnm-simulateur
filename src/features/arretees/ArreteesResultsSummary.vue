<script setup lang="ts">
import { computed } from 'vue';
import type { ArreteesSummaryVue } from '@/domain/arretees/aggregateFromPeriodes';
import { formatMensuelDuComposantes } from '@/domain/arretees/formatDuDetail';
import { formatMoney } from '@/domain/utils/format';
import { useArreteesStore } from '@/stores/arretees';
import { WIZARD_LABELS } from '@/domain/ui/labels';

const props = withDefaults(
  defineProps<{
    summary: ArreteesSummaryVue;
    /** Désactive le bouton pendant la génération Word/PDF. */
    exportBusy?: boolean;
  }>(),
  { exportBusy: false },
);

const emit = defineEmits<{
  exportPdf: [];
}>();

const arretees = useArreteesStore();

const legalContent = computed(() => {
  const neg: string[] = [];
  const pos: string[] = [];
  const firstPk = props.summary.detailMois[0]?.periodKey;
  if (firstPk) {
    const y = Number(firstPk.slice(0, 4));
    const mo = Number(firstPk.slice(5, 7)) - 1;
    const d = new Date(y, mo, 1);
    const presc = new Date();
    presc.setFullYear(presc.getFullYear() - 3);
    if (d < presc) {
      neg.push(
        `La prescription de 3 ans limite les arriérés réclamables à partir du ${presc.toLocaleDateString('fr-FR')}.`,
      );
    }
    const ccnm = new Date('2024-01-01');
    if (d < ccnm) {
      neg.push(
        'Les arriérés avant le 1er janvier 2024 ne sont pas réclamables au titre de cette convention.',
      );
    }
  }
  if (arretees.accordEcrit) {
    pos.push("Un accord écrit avec l'employeur renforce votre position juridique.");
  }
  if (arretees.dateChangementClassification) {
    pos.push('Un changement de classification documenté peut faciliter la réclamation.');
  }
  return { neg, pos, hasAny: neg.length > 0 || pos.length > 0 };
});
</script>

<template>
  <div id="arretees-results" class="arretees-results">
    <div class="arretees-results-card">
      <h3 class="arretees-results-title">
        {{ WIZARD_LABELS.arreteesResultsTitle }}
      </h3>

      <div id="arretees-summary">
        <template v-if="summary.conformeAuSMH">
          <p class="arretees-en-ordre-msg">
            {{ WIZARD_LABELS.arreteesConformeMsg }}
          </p>
        </template>
        <template v-else>
          <details class="arretees-accordion-summary result-details-toggle" open>
            <summary class="arretees-accordion-summary-title">
              {{ WIZARD_LABELS.arreteesResumeAnneeTitle }}
            </summary>
            <div class="arretees-summary result-details">
              <div class="result-detail-item">
                <span class="result-detail-label">Période</span>
                <span class="result-detail-value"
                  >{{ summary.dateDebutLabel }} → {{ summary.dateFinLabel }}</span
                >
              </div>
              <div class="result-detail-item">
                <span class="result-detail-label">Années avec écart</span>
                <span class="result-detail-value"
                  >{{ summary.anneesAvecEcartCount }} sur {{ summary.nbAnnees }}</span
                >
              </div>
              <div class="result-detail-item total-row">
                <span class="result-detail-label">Total des arriérés</span>
                <span class="result-detail-value">{{ formatMoney(summary.totalArretees) }}</span>
              </div>
            </div>

            <div
              v-if="summary.detailsParAnnee.length > 0"
              class="arretees-details-table result-details"
            >
              <div class="arretees-detail-header">
                <span class="detail-col-periode">Année</span>
                <span class="detail-col-montants">Perçu → Dû</span>
                <span class="detail-col-diff">Écart</span>
              </div>
              <div
                v-for="a in summary.detailsParAnnee"
                :key="a.annee"
                :class="
                  a.ecart > 0
                    ? 'arretees-detail-row-elegant detail-row-arretees'
                    : 'arretees-detail-row-elegant detail-row-positif'
                "
              >
                <span class="detail-periode">{{ a.annee }} ({{ a.nbMoisSaisis }} mois)</span>
                <span class="detail-montants-inline"
                  >{{ formatMoney(a.totalReel) }} → {{ formatMoney(a.totalDu) }}</span
                >
                <span class="detail-diff-value">{{
                  a.ecart > 0 ? `- ${formatMoney(a.ecart)}` : formatMoney(0)
                }}</span>
              </div>
            </div>
          </details>

          <details
            v-if="summary.detailMois.length > 0"
            class="arretees-accordion-detail result-details-toggle"
          >
            <summary class="arretees-accordion-detail-title">
              {{ WIZARD_LABELS.arreteesDetailMoisTitle }}
            </summary>
            <div class="arretees-details-table result-details">
              <div class="arretees-detail-header">
                <span class="detail-col-periode">Période</span>
                <span class="detail-col-montants">Réel → Dû</span>
                <span class="detail-col-diff">Écart mensuel</span>
              </div>
              <div
                v-for="(d, idx) in summary.detailMois"
                :key="idx"
                :class="
                  d.difference > 0
                    ? 'arretees-detail-row-elegant detail-row-arretees'
                    : 'arretees-detail-row-elegant detail-row-positif'
                "
              >
                <span class="detail-periode">
                  {{ d.periode }}
                  <span v-if="formatMensuelDuComposantes(d)" class="arretees-du-composantes">
                    {{ formatMensuelDuComposantes(d) }}
                  </span>
                </span>
                <span class="detail-montants-inline"
                  >{{ formatMoney(d.salaireMensuelReel) }} →
                  {{ formatMoney(d.salaireMensuelDu) }}</span
                >
                <span class="detail-diff-value">{{
                  d.difference > 0
                    ? `- ${formatMoney(Math.abs(d.difference))}`
                    : d.difference < 0
                      ? `+ ${formatMoney(Math.abs(d.difference))}`
                      : formatMoney(0)
                }}</span>
              </div>
            </div>
          </details>
        </template>
      </div>

      <div v-if="legalContent.hasAny" id="arretees-legal-info" class="arretees-legal-info">
        <h4>{{ WIZARD_LABELS.arreteesLegalPointsTitle }}</h4>
        <ul
          v-if="legalContent.neg.length > 0"
          class="arretees-legal-list arretees-legal-list--warn"
        >
          <li v-for="(t, i) in legalContent.neg" :key="'n' + i">❌ {{ t }}</li>
        </ul>
        <ul v-if="legalContent.pos.length > 0" class="arretees-legal-list arretees-legal-list--ok">
          <li v-for="(t, i) in legalContent.pos" :key="'p' + i">✅ {{ t }}</li>
        </ul>
      </div>

      <div class="arretees-export-action">
        <button
          id="btn-generer-pdf-arretees"
          type="button"
          class="book-btn btn-primary"
          :disabled="props.exportBusy"
          @click="emit('exportPdf')"
        >
          {{ props.exportBusy ? 'Génération…' : WIZARD_LABELS.arreteesExportPdf }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.arretees-legal-list {
  margin: 0.5rem 0 0;
  padding-left: 1.25rem;
}
.arretees-legal-list--warn {
  color: #d32f2f;
}
.arretees-legal-list--ok {
  color: #2e7d32;
}
.arretees-legal-info h4 {
  margin: 0.25rem 0;
  font-size: 1rem;
}
.arretees-du-composantes {
  display: block;
  font-size: 0.85em;
  font-weight: 400;
  color: var(--gray-600, #666);
  margin-top: 0.15rem;
}
.arretees-export-action {
  display: flex;
  justify-content: center;
  margin-top: 1.25rem;
}
</style>
