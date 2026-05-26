<script setup lang="ts">
import { ref, computed } from 'vue';

const slides = [
  {
    title: "Qu'est-ce que le SMH ?",
    content:
      'Le Salaire Minimum Hiérarchique (SMH) est le salaire plancher fixé par la Convention Collective Nationale de la Métallurgie pour chaque classification. Il constitue le minimum garanti pour votre poste.',
  },
  {
    title: 'Classification',
    content:
      'La nouvelle convention métallurgie (CCNM 2024) classe les postes selon 6 critères cotés de 1 à 10 : complexité, connaissances, autonomie, contribution, encadrement/coopération et communication.',
  },
  {
    title: 'Principe de faveur',
    content:
      "Quand un accord d'entreprise et la convention prévoient des dispositions différentes, c'est la plus avantageuse pour le salarié qui s'applique, sauf disposition légale contraire.",
  },
  {
    title: 'Arriérés de salaire',
    content:
      'Si votre salaire versé est inférieur au SMH applicable, vous pouvez réclamer la différence (arriérés) sur les 3 dernières années (prescription triennale, Code du travail).',
  },
  {
    title: "Accord d'entreprise",
    content:
      "Un accord d'entreprise peut compléter ou se substituer à certaines dispositions de la convention. Les primes, majorations et conditions peuvent être spécifiques à votre entreprise.",
  },
  {
    title: 'Limites du simulateur',
    content:
      'Ce simulateur fournit une estimation indicative basée sur les données saisies. Il ne remplace pas un conseil juridique. Les montants réels peuvent varier selon votre situation individuelle.',
  },
] as const;

const currentIndex = ref(0);
const total = slides.length;
const currentSlide = computed(() => slides[currentIndex.value]!);

function prev() {
  currentIndex.value = (currentIndex.value - 1 + total) % total;
}

function next() {
  currentIndex.value = (currentIndex.value + 1) % total;
}
</script>

<template>
  <div class="legal-carousel" role="region" aria-label="Guide juridique">
    <div class="carousel-header">
      <button class="carousel-btn" aria-label="Précédent" @click="prev">‹</button>
      <span class="carousel-counter">{{ currentIndex + 1 }} / {{ total }}</span>
      <button class="carousel-btn" aria-label="Suivant" @click="next">›</button>
    </div>
    <div class="legal-guide-content">
      <h4>{{ currentSlide.title }}</h4>
      <p>{{ currentSlide.content }}</p>
    </div>
  </div>
</template>
