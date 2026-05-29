<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useWizardStore } from '../../stores/wizard';
import { useWizardNavigation } from '../../composables/useWizardNavigation';
import { CONFIG } from '../../domain/config';
import {
  calculateClassification,
  getClassesForGroupe,
  isCadre,
} from '../../domain/classification/engine';
import { GROUPE_SELECT_LABELS, WIZARD_LABELS } from '../../domain/ui/labels';
import { AppTooltip } from '../../components/ui';
import { buildWizardTooltipHtml } from '../../domain/ui/wizardTooltips';
import CriteriaRoulette from './CriteriaRoulette.vue';

const wizard = useWizardStore();
const { nextStep } = useWizardNavigation();

type SubStep = '1a' | '1b' | '1c';
const subStep = ref<SubStep>('1a');

const groupes = Object.keys(CONFIG.GROUPE_CLASSES) as string[];

const classesForGroupe = computed(() => (wizard.groupe ? getClassesForGroupe(wizard.groupe) : []));

watch(
  () => wizard.groupe,
  (newGroup, oldGroup) => {
    if (!newGroup || oldGroup === undefined || newGroup === oldGroup) return;
    const first = classesForGroupe.value[0];
    if (first != null) wizard.classe = first;
  },
);

const totalScorePreview = computed(() =>
  CONFIG.CRITERES.reduce((s, c) => s + (wizard.scores[c.id] ?? 1), 0),
);

const previewClassification = computed(() => {
  const scoresArray = CONFIG.CRITERES.map((c) => wizard.scores[c.id] ?? 1);
  return calculateClassification(scoresArray);
});

const statutEstimation = computed(() =>
  isCadre(previewClassification.value.classe) ? 'Cadre' : 'Non-Cadre',
);

const statutDirect = computed(() => {
  if (!wizard.classe) return '—';
  return isCadre(wizard.classe) ? 'Cadre' : 'Non-Cadre';
});

function chooseManual() {
  wizard.mode = 'manual';
  subStep.value = '1b';
}

function chooseEstimation() {
  wizard.mode = 'estimation';
  CONFIG.CRITERES.forEach((c) => {
    if (wizard.scores[c.id] == null) wizard.scores[c.id] = 1;
  });
  subStep.value = '1c';
}

function validateManual() {
  if (wizard.groupe && wizard.classe) {
    nextStep();
  }
}

function groupeClasseTooltipHtml() {
  return buildWizardTooltipHtml('groupeClasse');
}

function validateEstimation() {
  const scoresArray = CONFIG.CRITERES.map((c) => wizard.scores[c.id] ?? 1);
  const result = calculateClassification(scoresArray);
  wizard.groupe = result.groupe;
  wizard.classe = result.classe;
  nextStep();
}
</script>

<template>
  <section class="wizard-step" aria-label="Étape 1 — Classification">
    <!-- 1a: Mode choice -->
    <div v-if="subStep === '1a'" class="step-content">
      <h2>{{ WIZARD_LABELS.step1aPageTitle }}</h2>
      <p class="step-subtitle">
        {{ WIZARD_LABELS.step1aPageSubtitle }}
      </p>
      <div class="choice-cards">
        <button class="choice-card" @click="chooseManual">
          <span class="choice-icon">✓</span>
          <span class="choice-title">{{ WIZARD_LABELS.connaisClasse }}</span>
          <span class="choice-desc">{{ WIZARD_LABELS.connaisClasseDesc }}</span>
        </button>
        <button class="choice-card" @click="chooseEstimation">
          <span class="choice-icon">?</span>
          <span class="choice-title">{{ WIZARD_LABELS.estimerClasse }}</span>
          <span class="choice-desc">{{ WIZARD_LABELS.estimerClasseDesc }}</span>
        </button>
      </div>
    </div>

    <!-- 1b: Direct selection -->
    <div v-else-if="subStep === '1b'" class="step-content">
      <h2>{{ WIZARD_LABELS.step1bPageTitle }}</h2>
      <p class="step-subtitle">
        {{ WIZARD_LABELS.step1bPageSubtitle }}
      </p>
      <div class="classification-direct">
        <div class="select-group-large">
          <label for="select-groupe"
            >Groupe
            <AppTooltip :content="groupeClasseTooltipHtml()" variant="result" position="top" />
          </label>
          <select id="select-groupe" v-model="wizard.groupe" class="book-select book-select-large">
            <option v-for="g in groupes" :key="g" :value="g">
              {{ GROUPE_SELECT_LABELS[g] ?? g }}
            </option>
          </select>
        </div>
        <div class="select-group-large">
          <label for="select-classe"
            >Classe
            <AppTooltip :content="groupeClasseTooltipHtml()" variant="result" position="top" />
          </label>
          <select
            id="select-classe"
            v-model.number="wizard.classe"
            class="book-select book-select-large"
          >
            <option v-for="c in classesForGroupe" :key="c" :value="c">
              {{ c }}
            </option>
          </select>
        </div>
      </div>
      <div class="classification-result-mini vertical">
        <div class="classification-badge large">
          <span class="groupe">{{ wizard.groupe }}</span>
          <span class="classe">{{ wizard.classe }}</span>
        </div>
        <span class="statut-badge" :class="isCadre(wizard.classe) ? 'cadre' : 'non-cadre'">{{
          statutDirect
        }}</span>
      </div>
      <div class="step-actions">
        <button class="book-btn btn-secondary" @click="subStep = '1a'">
          <span class="btn-icon btn-icon-left">‹</span> Retour
        </button>
        <button class="book-btn btn-primary" @click="validateManual">
          Suivant <span class="btn-icon btn-icon-right">›</span>
        </button>
      </div>
    </div>

    <!-- 1c: Estimation wizard -->
    <div v-else-if="subStep === '1c'" class="step-content">
      <h2>{{ WIZARD_LABELS.step1cPageTitle }}</h2>
      <p class="step-subtitle">
        {{ WIZARD_LABELS.step1cPageSubtitle }}
      </p>
      <div class="roulettes-container">
        <CriteriaRoulette
          v-for="(critere, index) in CONFIG.CRITERES"
          :key="critere.id"
          :critere="critere"
          :critere-index="index"
          :model-value="wizard.scores[critere.id] ?? 1"
          @update:model-value="(v) => (wizard.scores[critere.id] = v)"
        />
      </div>

      <div class="estimation-result vertical">
        <div class="score-mini">
          <span class="score-label">Score</span>
          <span class="score-value">{{ totalScorePreview }}</span>
          <span class="score-max">/ 60</span>
        </div>
        <div class="classification-badge large">
          <span class="groupe">{{ previewClassification.groupe }}</span>
          <span class="classe">{{ previewClassification.classe }}</span>
        </div>
        <span
          class="statut-badge"
          :class="isCadre(previewClassification.classe) ? 'cadre' : 'non-cadre'"
          >{{ statutEstimation }}</span
        >
      </div>
      <div class="step-actions">
        <button class="book-btn btn-secondary" @click="subStep = '1a'">
          <span class="btn-icon btn-icon-left">‹</span> Retour
        </button>
        <button class="book-btn btn-primary" @click="validateEstimation">
          Valider <span class="btn-icon btn-icon-right">›</span>
        </button>
      </div>
    </div>
  </section>
</template>
