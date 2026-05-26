<script setup lang="ts">
import { ref, computed } from 'vue';
import SimulatorLayout from '../../components/SimulatorLayout.vue';
import { useWizardStore } from '../../stores/wizard';
import { useWizardNavigation } from '../../composables/useWizardNavigation';
import { CONFIG } from '../../domain/config';
import { calculateClassification, getClassesForGroupe } from '../../domain/classification/engine';

const wizard = useWizardStore();
const { nextStep } = useWizardNavigation();

type SubStep = '1a' | '1b' | '1c';
const subStep = ref<SubStep>('1a');

const groupes = Object.keys(CONFIG.GROUPE_CLASSES) as string[];

const classesForGroupe = computed(() => (wizard.groupe ? getClassesForGroupe(wizard.groupe) : []));

function chooseManual() {
  wizard.mode = 'manual';
  subStep.value = '1b';
}

function chooseEstimation() {
  wizard.mode = 'estimation';
  subStep.value = '1c';
}

function validateManual() {
  if (wizard.groupe && wizard.classe) {
    nextStep();
  }
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
  <SimulatorLayout>
    <section class="wizard-step" aria-label="Étape 1 — Classification">
      <!-- 1a: Mode choice -->
      <div v-if="subStep === '1a'" class="step-content">
        <h2>Classification du poste</h2>
        <p class="step-subtitle">Comment souhaitez-vous déterminer votre classification ?</p>
        <div class="choice-cards">
          <button class="choice-card" @click="chooseManual">
            <span class="choice-icon">✓</span>
            <span class="choice-title">Je connais ma classification</span>
            <span class="choice-desc">Groupe et classe figurant sur ma fiche de paie</span>
          </button>
          <button class="choice-card" @click="chooseEstimation">
            <span class="choice-icon">?</span>
            <span class="choice-title">Je souhaite l'estimer</span>
            <span class="choice-desc">Répondre aux 6 critères de la convention</span>
          </button>
        </div>
      </div>

      <!-- 1b: Direct selection -->
      <div v-else-if="subStep === '1b'" class="step-content">
        <h2>Saisie directe</h2>
        <p class="step-subtitle">Sélectionnez votre groupe et votre classe</p>
        <div class="classification-direct">
          <div class="select-group-large">
            <label for="select-groupe">Groupe</label>
            <select
              id="select-groupe"
              v-model="wizard.groupe"
              class="book-select book-select-large"
            >
              <option v-for="g in groupes" :key="g" :value="g">
                {{ g }}
              </option>
            </select>
          </div>
          <div class="select-group-large">
            <label for="select-classe">Classe</label>
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
        <h2>Estimation par critères</h2>
        <p class="step-subtitle">Évaluez chacun des 6 critères de la convention</p>
        <div v-for="critere in CONFIG.CRITERES" :key="critere.id" class="critere-block">
          <label :for="`critere-${critere.id}`" class="critere-label">
            <strong>{{ critere.nom }}</strong> — {{ critere.description }}
          </label>
          <select
            :id="`critere-${critere.id}`"
            :value="wizard.scores[critere.id] ?? 1"
            class="book-select"
            @change="wizard.scores[critere.id] = Number(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="(label, deg) in critere.labels" :key="deg" :value="deg">
              {{ deg }} — {{ label }}
            </option>
          </select>
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
  </SimulatorLayout>
</template>
