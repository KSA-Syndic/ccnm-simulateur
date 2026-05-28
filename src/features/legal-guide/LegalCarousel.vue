<script setup lang="ts">
import { ref, computed } from 'vue';
import { WIZARD_LEGACY_LABELS } from '../../domain/ui/labels';
import { buildLegalCarouselSteps } from '../../domain/legal/legalCarouselSteps';

const slides = buildLegalCarouselSteps();
const currentIndex = ref(0);
const total = slides.length;
const lastIndex = total - 1;

const isAtFirst = computed(() => currentIndex.value <= 0);
const isAtLast = computed(() => currentIndex.value >= lastIndex);

function prev() {
  if (currentIndex.value > 0) currentIndex.value -= 1;
}

function next() {
  if (currentIndex.value < lastIndex) currentIndex.value += 1;
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft' && !isAtFirst.value) {
    e.preventDefault();
    prev();
  } else if (e.key === 'ArrowRight' && !isAtLast.value) {
    e.preventDefault();
    next();
  }
}
</script>

<template>
  <div
    id="legal-instructions"
    class="legal-guide-section"
    role="region"
    aria-label="Guide juridique"
    tabindex="0"
    @keydown="onKeydown"
  >
    <div class="legal-guide-header">
      <h3 class="legal-guide-title">
        {{ WIZARD_LEGACY_LABELS.legalGuideTitle }}
      </h3>
      <div class="legal-guide-nav">
        <button
          id="legal-carousel-prev"
          type="button"
          class="carousel-btn carousel-btn-prev"
          aria-label="Précédent"
          :disabled="isAtFirst"
          @click.stop.prevent="prev"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span class="carousel-counter"
          ><span id="legal-carousel-current">{{ currentIndex + 1 }}</span> /
          <span id="legal-carousel-total">{{ total }}</span></span
        >
        <button
          id="legal-carousel-next"
          type="button"
          class="carousel-btn carousel-btn-next"
          aria-label="Suivant"
          :disabled="isAtLast"
          @click.stop.prevent="next"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
    <div id="legal-carousel-content" class="legal-guide-content">
      <div
        v-for="(slide, i) in slides"
        :key="i"
        class="carousel-slide legal-step"
        :class="{ active: i === currentIndex }"
        :data-index="i"
      >
        <h4>
          <span class="legal-step-number">{{ i + 1 }}</span> {{ slide.title }}
        </h4>
        <div class="legal-step-content" v-html="slide.contentHtml" />
      </div>
    </div>
  </div>
</template>
