<script setup lang="ts">
import { computed } from 'vue';
import { useSituationStore } from '../../stores/situation';
import { useWizardStore } from '../../stores/wizard';
import { isCadre } from '../../domain/classification/engine';
import { AppTooltip } from '../../components/ui';

const situation = useSituationStore();
const wizard = useWizardStore();

const isCadreStatus = computed(() => isCadre(wizard.classe));
const showForfaitJours = computed(() => isCadreStatus.value && situation.forfait === 'jours');
</script>

<template>
  <details class="conditions-details">
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
            <input
              v-model.number="situation.tauxActivite"
              type="text"
              class="book-input"
              inputmode="decimal"
              aria-label="Taux d'activité"
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
          <AppTooltip content="Majoration pour heures effectuées entre 21h et 6h (CCN Art. 145)." />
        </label>
        <div v-if="situation.travailNuit" class="sub-field sub-field-inline">
          <div class="input-with-unit">
            <input
              v-model.number="situation.heuresNuit"
              type="text"
              class="book-input"
              inputmode="decimal"
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
          <AppTooltip content="Majoration dimanche (CCN Art. 146)." />
        </label>
        <div v-if="situation.travailDimanche" class="sub-field sub-field-inline">
          <div class="input-with-unit">
            <input
              v-model.number="situation.heuresDimanche"
              type="text"
              class="book-input"
              inputmode="decimal"
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
          <AppTooltip
            content="CCN : +25% de la 36e à la 43e heure, +50% à partir de la 44e heure."
          />
        </label>
        <div v-if="situation.travailHeuresSup" class="sub-field sub-field-inline">
          <div class="input-with-unit">
            <input
              v-model.number="situation.heuresSup"
              type="text"
              class="book-input"
              inputmode="decimal"
              aria-label="Heures supplémentaires par mois"
            />
            <span class="input-unit">heures/mois</span>
          </div>
        </div>
      </div>

      <!-- Forfait jours sup -->
      <div v-if="showForfaitJours" class="form-group">
        <label class="checkbox-label">
          <input v-model="situation.travailJoursSupForfait" type="checkbox" class="book-checkbox" />
          <span>Jours supplémentaires (rachat)</span>
          <AppTooltip
            content="Code du travail (L3121-59) : majoration ≥ 10% pour rachat de jours de repos."
          />
        </label>
        <div v-if="situation.travailJoursSupForfait" class="sub-field sub-field-inline">
          <div class="input-with-unit">
            <input
              v-model.number="situation.joursSupForfait"
              type="text"
              class="book-input"
              inputmode="decimal"
              aria-label="Jours supplémentaires rachetés par an"
            />
            <span class="input-unit">jours/an</span>
          </div>
        </div>
      </div>
    </div>
  </details>
</template>
