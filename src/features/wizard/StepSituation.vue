<script setup lang="ts">
import SimulatorLayout from '../../components/SimulatorLayout.vue';
import { useWizardStore } from '../../stores/wizard';
import { useSituationStore } from '../../stores/situation';
import { useAgreementStore } from '../../stores/agreement';
import { useWizardNavigation } from '../../composables/useWizardNavigation';
import { useIframeMode } from '../../composables/useIframeMode';
import { CONFIG } from '../../domain/config';
import { isCadre } from '../../domain/classification/engine';
import { loadAgreement } from '../../domain/agreements/loader';
import { computed, onMounted } from 'vue';

const wizard = useWizardStore();
const situation = useSituationStore();
const agreementStore = useAgreementStore();
const { prevStep, nextStep } = useWizardNavigation();
const { urlParams } = useIframeMode();

const isCadreValue = computed(() => isCadre(wizard.classe));

onMounted(() => {
  situation.pointTerritorial = situation.pointTerritorial || CONFIG.POINT_TERRITORIAL_DEFAUT;
  if (urlParams.value.accord && !agreementStore.activeAccordId) {
    const loaded = loadAgreement(urlParams.value.accord);
    if (loaded) agreementStore.activeAccordId = loaded.id;
  }
});

function validate() {
  nextStep();
}
</script>

<template>
  <SimulatorLayout>
    <section class="wizard-step" aria-label="Étape 2 — Situation">
      <div class="step-content">
        <h2>Votre situation</h2>
        <p class="step-subtitle">
          Classification retenue : {{ wizard.groupe }}{{ wizard.classe }}
          <button class="btn-link" @click="prevStep">Modifier</button>
        </p>

        <div class="form-grid">
          <div class="form-group">
            <label for="anciennete">Ancienneté (années)</label>
            <input
              id="anciennete"
              v-model.number="situation.anciennete"
              type="number"
              class="book-input"
              min="0"
              max="50"
            />
          </div>

          <div class="form-group">
            <label for="point-territorial">Valeur du point territorial (€)</label>
            <input
              id="point-territorial"
              v-model.number="situation.pointTerritorial"
              type="number"
              step="0.01"
              class="book-input"
            />
          </div>

          <div v-if="isCadreValue" class="form-group">
            <label for="experience-pro">Expérience professionnelle (années)</label>
            <input
              id="experience-pro"
              v-model.number="situation.experiencePro"
              type="number"
              class="book-input"
              min="0"
            />
          </div>

          <div v-if="isCadreValue" class="form-group">
            <label for="forfait">Type de forfait</label>
            <select id="forfait" v-model="situation.forfait" class="book-select">
              <option value="heures">Forfait Heures</option>
              <option value="jours">Forfait Jours</option>
            </select>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input v-model="situation.travailNuit" type="checkbox" class="book-checkbox" />
              Travail de nuit
            </label>
            <input
              v-if="situation.travailNuit"
              v-model.number="situation.heuresNuit"
              type="number"
              class="book-input"
              min="0"
              placeholder="Heures/mois"
            />
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input v-model="situation.travailDimanche" type="checkbox" class="book-checkbox" />
              Travail le dimanche
            </label>
            <input
              v-if="situation.travailDimanche"
              v-model.number="situation.heuresDimanche"
              type="number"
              class="book-input"
              min="0"
              placeholder="Heures/mois"
            />
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input v-model="situation.travailHeuresSup" type="checkbox" class="book-checkbox" />
              Heures supplémentaires
            </label>
            <input
              v-if="situation.travailHeuresSup"
              v-model.number="situation.heuresSup"
              type="number"
              class="book-input"
              min="0"
              placeholder="Heures sup/mois"
            />
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input v-model="situation.tempsPartiel" type="checkbox" class="book-checkbox" />
              Temps partiel
            </label>
            <input
              v-if="situation.tempsPartiel"
              v-model.number="situation.tauxActivite"
              type="number"
              class="book-input"
              min="1"
              max="100"
              placeholder="Taux d'activité %"
            />
          </div>
        </div>

        <div class="step-actions">
          <button class="book-btn btn-secondary" @click="prevStep">
            <span class="btn-icon btn-icon-left">‹</span> Retour
          </button>
          <button class="book-btn btn-primary" @click="validate">
            Calculer <span class="btn-icon btn-icon-right">›</span>
          </button>
        </div>
      </div>
    </section>
  </SimulatorLayout>
</template>
