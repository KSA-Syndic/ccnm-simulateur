<script setup lang="ts">
import { ref } from 'vue';
import { AppModal } from '../../components/ui';
import type { ExportDocumentsPayload } from '../../domain/pdf/exportDocumentsPayload';

const open = ref(false);
const nom = ref('');
const employeur = ref('');
const lieu = ref('');
const adresseSalarie = ref('');
const cpVilleSalarie = ref('');
const representant = ref('');
const fonction = ref('');
const adresseEmployeur = ref('');
const cpVilleEmployeur = ref('');
const showLetterFields = ref(false);

const emit = defineEmits<{
  (e: 'generate', data: ExportDocumentsPayload): void;
}>();

function show() {
  open.value = true;
}

function submit() {
  const payload: ExportDocumentsPayload = {
    nom: nom.value,
    employeur: employeur.value,
  };
  const t = (s: string) => s.trim();
  if (t(lieu.value)) payload.lieu = t(lieu.value);
  if (t(adresseSalarie.value)) payload.adresseSalarie = t(adresseSalarie.value);
  if (t(cpVilleSalarie.value)) payload.cpVilleSalarie = t(cpVilleSalarie.value);
  if (t(representant.value)) payload.representant = t(representant.value);
  if (t(fonction.value)) payload.fonction = t(fonction.value);
  if (t(adresseEmployeur.value)) payload.adresseEmployeur = t(adresseEmployeur.value);
  if (t(cpVilleEmployeur.value)) payload.cpVilleEmployeur = t(cpVilleEmployeur.value);
  emit('generate', payload);
  open.value = false;
}

defineExpose({ show });
</script>

<template>
  <AppModal :open="open" title="Export PDF et lettre Word" @close="open = false">
    <div class="pdf-infos-body">
      <p class="pdf-infos-lead">
        Ces informations enrichissent l’annexe PDF et la lettre de mise en demeure (.doc). Les
        champs vides conservent des mentions modèle dans le Word.
      </p>
      <div class="form-group">
        <label for="pdf-nom">Votre nom (optionnel)</label>
        <input id="pdf-nom" v-model="nom" type="text" class="book-input" placeholder="Prénom Nom" />
      </div>
      <div class="form-group">
        <label for="pdf-employeur">Employeur (optionnel)</label>
        <input
          id="pdf-employeur"
          v-model="employeur"
          type="text"
          class="book-input"
          placeholder="Nom de l'entreprise"
        />
      </div>
      <div class="form-group">
        <label for="pdf-lieu">Lieu (en-tête date, optionnel)</label>
        <input id="pdf-lieu" v-model="lieu" type="text" class="book-input" placeholder="ex. Lyon" />
      </div>

      <button
        type="button"
        class="book-btn btn-secondary letter-toggle"
        @click="showLetterFields = !showLetterFields"
      >
        {{ showLetterFields ? 'Masquer' : 'Afficher' }} les champs lettre LRAR (adresses,
        destinataire)
      </button>

      <div
        v-show="showLetterFields"
        class="letter-fields"
        aria-label="Champs optionnels lettre Word"
      >
        <div class="form-group">
          <label for="pdf-adr-sal">Adresse salarié (optionnel)</label>
          <input id="pdf-adr-sal" v-model="adresseSalarie" type="text" class="book-input" />
        </div>
        <div class="form-group">
          <label for="pdf-cp-sal">Code postal et ville salarié (optionnel)</label>
          <input id="pdf-cp-sal" v-model="cpVilleSalarie" type="text" class="book-input" />
        </div>
        <div class="form-group">
          <label for="pdf-rep">Représentant employeur (optionnel)</label>
          <input id="pdf-rep" v-model="representant" type="text" class="book-input" />
        </div>
        <div class="form-group">
          <label for="pdf-fonction">Fonction (optionnel)</label>
          <input
            id="pdf-fonction"
            v-model="fonction"
            type="text"
            class="book-input"
            placeholder="DRH, …"
          />
        </div>
        <div class="form-group">
          <label for="pdf-adr-emp">Adresse employeur (optionnel)</label>
          <input id="pdf-adr-emp" v-model="adresseEmployeur" type="text" class="book-input" />
        </div>
        <div class="form-group">
          <label for="pdf-cp-emp">Code postal et ville employeur (optionnel)</label>
          <input id="pdf-cp-emp" v-model="cpVilleEmployeur" type="text" class="book-input" />
        </div>
      </div>
    </div>
    <template #footer>
      <button class="book-btn btn-secondary" @click="open = false">Annuler</button>
      <button class="book-btn btn-primary" @click="submit">Générer Word + PDF</button>
    </template>
  </AppModal>
</template>

<style scoped>
.pdf-infos-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.pdf-infos-lead {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary, #555);
}
.letter-toggle {
  align-self: flex-start;
}
.letter-fields {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 0.25rem;
  border-top: 1px solid var(--border-subtle, #e5e5e5);
}
</style>
