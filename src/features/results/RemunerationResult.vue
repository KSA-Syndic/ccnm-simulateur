<script setup lang="ts">
import { computed } from 'vue';
import { type AggregatedRemuneration } from '../../domain/remuneration/aggregate';
import { formatMoney, formatNumberFr } from '../../domain/utils/format';
import { AppTooltip } from '../../components/ui';
import { useUiStore } from '../../stores/ui';
import { useSituationStore } from '../../stores/situation';
import { useAgreementStore } from '../../stores/agreement';
import { useWizardStore } from '../../stores/wizard';
import { CONFIG } from '../../domain/config';
import { isCadre } from '../../domain/classification/engine';
import { getSmhHourlyBaseRate, getSmhDailyBaseRate } from '../../domain/remuneration/rates';
import { WIZARD_LEGACY_LABELS, RESULT_SALAIRE_BASE_TOOLTIP } from '../../domain/ui/labels';
import { getAgreement } from '../../domain/agreements/registry';
import AccordBadge from '../agreement-options/AccordBadge.vue';
import { buildLegalTooltipContent, getAccordNomCourt } from '../../domain/tooltip/builders';
import { wizardToastNbMoisImposeParAccord } from '../../domain/ui/wizardToasts';
import { dispatchAppToast } from '../../utils/appToast';

const props = defineProps<{
  data: AggregatedRemuneration;
}>();

const ui = useUiStore();
const situation = useSituationStore();
const agreement = useAgreementStore();
const wizard = useWizardStore();

const classificationReady = computed(() => Boolean(wizard.groupe && wizard.classe >= 1));
const statutBadgeLabel = computed(() => {
  if (!classificationReady.value) return '—';
  return isCadre(wizard.classe) ? 'Cadre' : 'Non-Cadre';
});
const statutBadgeClass = computed(() => {
  if (!classificationReady.value) return '';
  return isCadre(wizard.classe) ? 'cadre' : 'non-cadre';
});

const nbMoisImpose = computed((): 12 | 13 | null => {
  if (!agreement.accordActif || !agreement.activeAccordId) return null;
  const doc = getAgreement(agreement.activeAccordId);
  const r = doc?.repartition13Mois;
  if (r && typeof r.actif === 'boolean') return r.actif ? 13 : 12;
  return null;
});

/** Document accord pour pastille sur les lignes « source accord » (étape résultat). */
const resultAccordDoc = computed(() =>
  agreement.accordActif && agreement.activeAccordId ? getAgreement(agreement.activeAccordId) : null,
);

const resultContextNotice = computed(() => {
  let baseInfo = '';
  if (situation.forfait === 'jours') {
    baseInfo = 'Forfait jours · 218 j/an';
  } else if (situation.forfait === 'heures') {
    baseInfo = 'Forfait heures';
  } else {
    baseInfo = 'Base 35h/sem.';
  }
  if (situation.tempsPartiel) {
    const taux =
      Math.round((Number(situation.tauxActivite) || CONFIG.TAUX_ACTIVITE_DEFAUT) * 100) / 100;
    baseInfo += ` · Temps partiel ${String(taux).replace('.', ',')}%`;
  }
  const smhBaseAnnuel = Number(props.data.baseSMH) || 0;
  const tauxActivitePctRaw = situation.tempsPartiel
    ? Number(situation.tauxActivite) || CONFIG.TAUX_ACTIVITE_DEFAUT
    : 100;
  const tauxActivitePct = Math.max(
    CONFIG.TAUX_ACTIVITE_MIN,
    Math.min(CONFIG.TAUX_ACTIVITE_MAX, tauxActivitePctRaw),
  );
  const activityRate = tauxActivitePct / 100;
  const isForfaitJours = situation.forfait === 'jours';
  const tauxHoraire = getSmhHourlyBaseRate(smhBaseAnnuel, {
    nbMois: 12,
    activityRate,
    heuresMensuellesBase: CONFIG.DUREE_LEGALE_HEURES_MOIS,
  });
  const tauxJournalier = getSmhDailyBaseRate(smhBaseAnnuel, { activityRate });
  const tauxStr = isForfaitJours
    ? `${formatNumberFr(tauxJournalier, 2)} €/j`
    : `${formatNumberFr(tauxHoraire, 2)} €/h`;
  return `${baseInfo} · SMH ${tauxStr}`;
});

function simplifyLabel(raw: string): string {
  return String(raw || '')
    .replace(/\bconventionnelle?\b/gi, '')
    .replace(/\bCCN(M)?\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+\)/g, ')')
    .trim();
}

const salaireBaseTooltipHtml = computed(() => {
  const t = RESULT_SALAIRE_BASE_TOOLTIP;
  return buildLegalTooltipContent(CONFIG.TOOLTIP_TEXTS, t.title, t.description, {
    sourceArticle: t.sourceArticle,
  });
});

const detailLineCount = computed(
  () =>
    1 +
    props.data.includedInSmhItems.length +
    props.data.sections.reduce((n, s) => n + s.items.length, 0),
);

function detailValueParts(amount: number): { text: string; positive: boolean } {
  if (amount > 0) return { text: `+${formatMoney(amount)}`, positive: true };
  return { text: formatMoney(amount), positive: false };
}

function hasDetailTooltip(tooltip: string | undefined): boolean {
  return Boolean(String(tooltip ?? '').trim());
}

const monthsToggleAriaLabel = computed(() =>
  nbMoisImpose.value != null
    ? "Répartition imposée par l'accord d'entreprise (cliquez pour plus d'informations)"
    : 'Choisir 12 ou 13 mois',
);

function selectNbMois(target: 12 | 13) {
  const imp = nbMoisImpose.value;
  if (imp != null && target !== imp) {
    const doc =
      agreement.accordActif && agreement.activeAccordId
        ? getAgreement(agreement.activeAccordId)
        : null;
    const nom = getAccordNomCourt(doc) || "d'entreprise";
    dispatchAppToast(wizardToastNbMoisImposeParAccord(imp, nom), 'info');
    return;
  }
  if (ui.nbMois !== target) ui.nbMois = target;
}
</script>

<template>
  <div class="remuneration-result-legacy" aria-live="polite">
    <div class="result-card">
      <div class="result-card-header-statut">
        <span id="result-statut-badge" class="statut-badge small" :class="statutBadgeClass">{{
          statutBadgeLabel
        }}</span>
      </div>
      <div class="result-main">
        <span id="result-smh" class="result-value">{{ formatMoney(data.totalAnnual) }}</span>
        <span id="result-label-annuel" class="result-label">{{
          WIZARD_LEGACY_LABELS.resultatAnnuel
        }}</span>
      </div>

      <div class="result-monthly">
        <span id="result-mensuel" class="result-value-secondary">{{
          formatMoney(Math.round(data.totalAnnual / ui.nbMois))
        }}</span>
        <span id="result-label-mensuel" class="result-label">{{
          WIZARD_LEGACY_LABELS.resultatMensuel
        }}</span>
        <div
          class="months-toggle"
          :class="{ 'months-toggle-locked': nbMoisImpose != null }"
          :aria-label="monthsToggleAriaLabel"
        >
          <button
            type="button"
            class="month-btn"
            :class="{ active: ui.nbMois === 12 }"
            data-months="12"
            @click="selectNbMois(12)"
          >
            12 mois
          </button>
          <button
            type="button"
            class="month-btn"
            :class="{ active: ui.nbMois === 13 }"
            data-months="13"
            @click="selectNbMois(13)"
          >
            13 mois
          </button>
        </div>
      </div>

      <span id="result-context-notice" class="result-card-caption">{{ resultContextNotice }}</span>
      <span id="result-hourly-deduced" class="result-card-caption result-card-caption-compact" />
    </div>

    <details class="result-details-toggle" open>
      <summary id="result-details-summary">
        {{ WIZARD_LEGACY_LABELS.detailCalcul }}
      </summary>
      <div id="result-details" class="result-details">
        <div class="result-detail-item">
          <span class="result-detail-label">
            <span class="result-detail-label-text">Salaire de base</span>
            <AppTooltip
              :content="salaireBaseTooltipHtml"
              variant="result"
              position="top"
              trigger-aria-label="Détail salaire de base (minimum conventionnel)"
            />
          </span>
          <span class="result-detail-value">{{ formatMoney(data.baseSMH) }}</span>
        </div>

        <div
          v-for="item in data.includedInSmhItems"
          :key="'in-smh-' + item.semanticId"
          class="result-detail-item smh-sub-line"
        >
          <span class="result-detail-label">
            <span class="result-detail-label-text">↳ dont {{ simplifyLabel(item.label) }}</span>
            <AccordBadge
              v-if="item.source === 'accord' && resultAccordDoc"
              :agreement="resultAccordDoc"
            />
            <AppTooltip
              v-if="hasDetailTooltip(item.tooltip)"
              :content="String(item.tooltip)"
              variant="result"
              position="top"
              :trigger-aria-label="`Détail : ${simplifyLabel(item.label)}`"
            />
            <span v-else class="result-detail-tooltip-spacer" aria-hidden="true" />
          </span>
          <span class="result-detail-value">{{ formatMoney(item.amount) }}</span>
        </div>

        <template v-for="section in data.sections" :key="section.label">
          <div
            v-for="item in section.items"
            :key="item.semanticId + section.label"
            class="result-detail-item"
          >
            <span class="result-detail-label">
              <span class="result-detail-label-text">{{ simplifyLabel(item.label) }}</span>
              <AccordBadge
                v-if="item.source === 'accord' && resultAccordDoc"
                :agreement="resultAccordDoc"
              />
              <AppTooltip
                v-if="hasDetailTooltip(item.tooltip)"
                :content="String(item.tooltip)"
                variant="result"
                position="top"
                :trigger-aria-label="`Détail : ${simplifyLabel(item.label)}`"
              />
              <span v-else class="result-detail-tooltip-spacer" aria-hidden="true" />
            </span>
            <span
              class="result-detail-value"
              :class="{ positive: detailValueParts(item.amount).positive }"
              >{{ detailValueParts(item.amount).text }}</span
            >
          </div>
        </template>

        <div v-if="detailLineCount > 1" class="result-detail-item total-row">
          <span class="result-detail-label"><strong>Total annuel brut</strong></span>
          <span class="result-detail-value"
            ><strong>{{ formatMoney(data.totalAnnual) }}</strong></span
          >
        </div>
      </div>
    </details>
  </div>
</template>

<style scoped>
.result-card-header-statut {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.35rem;
}
</style>
