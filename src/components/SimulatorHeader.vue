<script setup lang="ts">
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { CONFIG } from '../domain/config';
import { CONVENTION_METALLURGIE_CONSOLIDEE_PDF_URL, SIMULATOR_SHELL } from '../domain/ui/labels';
import { useAgreementStore } from '../stores/agreement';
import { getAgreement } from '../domain/agreements/registry';
import { AppTooltip } from './ui';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const agreementStore = useAgreementStore();
const { activeAccordId } = storeToRefs(agreementStore);

/** Accord chargé (URL / registre) — indépendant de la case « Appliquer » sur la page Résultat. */
const loadedAgreementDoc = computed(() =>
  activeAccordId.value ? getAgreement(activeAccordId.value) : null,
);

const subtitleText = computed(() => {
  const nom = loadedAgreementDoc.value?.nomCourt ?? loadedAgreementDoc.value?.nom;
  return nom ? `${SIMULATOR_SHELL.headerSubtitle} · ${nom}` : SIMULATOR_SHELL.headerSubtitle;
});

const headerTitle = computed(() => `${SIMULATOR_SHELL.headerTitle} ${CONFIG.CURRENT_DATA_YEAR}`);

const tooltipHtml = computed(() => {
  const blocks: string[] = [];
  blocks.push(
    `${esc(SIMULATOR_SHELL.headerInfoIntro)}<br>` +
      `<a class="tooltip-link" href="${esc(CONVENTION_METALLURGIE_CONSOLIDEE_PDF_URL)}" target="_blank" rel="noopener noreferrer">${esc(SIMULATOR_SHELL.headerConventionPdfLinkLabel)}</a>`,
  );

  const smhUpdate = CONFIG.SMH_UPDATE;
  const year = smhUpdate.referenceYear;
  const yearEntries = Object.entries(smhUpdate.years ?? {})
    .map(([y, info]) => ({ year: Number(y), ...info }))
    .filter((e) => Number.isFinite(e.year))
    .sort((a, b) => a.year - b.year);

  const selectedYear =
    yearEntries.find((e) => e.year === year) ?? yearEntries[yearEntries.length - 1];
  if (selectedYear || yearEntries.length) {
    const lines: string[] = [];
    if (year) lines.push(`Grille des minima (SMH) : ${year}`);
    const eff = selectedYear?.effectiveDate
      ? new Date(String(selectedYear.effectiveDate)).toLocaleDateString('fr-FR')
      : null;
    if (eff) lines.push(`Date d'effet : ${eff}`);
    const upd = smhUpdate.updatedAt
      ? new Date(String(smhUpdate.updatedAt)).toLocaleDateString('fr-FR')
      : null;
    if (upd) lines.push(`MAJ appli : ${upd}`);
    if (selectedYear?.sourceLabel) lines.push(`Source : ${esc(String(selectedYear.sourceLabel))}`);
    const yearlyRates = yearEntries.filter((e) => typeof e.indicativeRate === 'number');
    if (yearlyRates.length) {
      const ratesLabel = yearlyRates
        .map((e) => `${e.year} : +${Math.round(Number(e.indicativeRate) * 10000) / 100} %`)
        .join(' · ');
      lines.push(`Repères annuels (indicatifs) : ${ratesLabel}`);
      lines.push('Calcul : grilles annuelles.');
    }
    let updatesBlock = `📅 <strong>MAJ salaires minima</strong><br>${lines.join('<br>')}`;
    if (selectedYear?.sourceUrl) {
      updatesBlock += `<br><a class="tooltip-link" href="${esc(String(selectedYear.sourceUrl))}" target="_blank" rel="noopener">Source revalorisation ${selectedYear.year}</a>`;
    }
    blocks.push(updatesBlock);
  }

  const ag = loadedAgreementDoc.value;
  if (ag) {
    const nom = ag.nomCourt || ag.nom;
    const labels = ag.labels ?? {};
    const desc =
      labels.description ||
      labels.tooltipHeader ||
      labels.tooltip ||
      `Accord ${nom} : activez l'option sur la page Résultat pour appliquer ses règles.`;
    let accordBlock = `🏢 <strong>${esc(nom)}</strong><br>${esc(String(desc))}`;
    if (ag.url) {
      accordBlock += `<br><a class="tooltip-link" href="${esc(ag.url)}" target="_blank" rel="noopener">Texte de l'accord</a>`;
    }
    blocks.push(accordBlock);
  }

  return blocks.join('<br><br>');
});
</script>

<template>
  <header class="simulator-header">
    <h1>{{ headerTitle }}</h1>
    <p class="subtitle simulator-header__subtitle">
      <span id="header-subtitle-text">{{ subtitleText }}</span>
      <span id="header-info-icon" class="header-info">
        <AppTooltip
          :content="tooltipHtml"
          position="bottom"
          variant="result"
          trigger-tone="on-dark"
          :trigger-aria-label="SIMULATOR_SHELL.headerTooltipTriggerAriaLabel"
        />
      </span>
    </p>
  </header>
</template>
