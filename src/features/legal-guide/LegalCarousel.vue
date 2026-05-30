<script setup lang="ts">
import { ref, computed } from 'vue';
import { WIZARD_LABELS } from '../../domain/ui/labels';
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
        {{ WIZARD_LABELS.legalGuideTitle }}
      </h3>
      <div class="legal-guide-nav">
        <button
          id="legal-carousel-prev"
          type="button"
          class="carousel-btn carousel-btn-prev"
          aria-label="Précédent"
          :disabled="isAtFirst"
          @click="prev"
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
          @click="next"
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

<style scoped>
.legal-guide-section {
  margin: 32px 0;
  padding: 28px;
  background: var(--gray-100);
  border-radius: 0;
  border: 1px solid var(--gray-200);
  box-shadow: none;
}

.legal-guide-section.hidden {
  display: none;
}

.legal-guide-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 2px solid var(--color-link);
}

.legal-guide-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--body-font-color);
  display: flex;
  align-items: center;
  gap: 10px;
}

.legal-guide-title::before {
  content: '📚';
  font-size: 1.3rem;
}

.legal-guide-nav {
  display: flex;
  align-items: center;
  gap: 12px;
}

.legal-guide-content {
  padding: 8px 0;
  min-height: 280px;
  position: relative;
}

.legal-guide-content .carousel-slide {
  border-radius: 0;
  padding: 24px 28px;
}

.legal-guide-content .legal-step {
  margin: 0;
}

.legal-guide-content .legal-step h4 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 16px 0;
  font-size: 1.05rem;
  color: var(--color-link);
}

.legal-guide-content .legal-step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--color-primary);
  color: white;
  border-radius: 50%;
  font-size: 0.9rem;
  font-weight: 700;
}

.legal-guide-content .legal-step-content {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--gray-700);
}

.legal-guide-content .legal-step-content p {
  margin: 0 0 12px 0;
}

.legal-guide-content .legal-step-content ul {
  margin: 10px 0;
  padding-left: 22px;
}

.legal-guide-content .legal-step-content li {
  margin: 6px 0;
}

@media (max-width: 768px) {
  #step-4 .legal-guide-section {
    margin-top: 16px;
    padding: 14px 12px 16px;
  }

  #step-4 .legal-guide-header {
    margin-bottom: 14px;
    padding: 0 4px 12px;
    flex-wrap: wrap;
    gap: 8px;
  }

  #step-4 .legal-guide-title {
    font-size: 1rem;
  }

  #step-4 .legal-guide-content {
    min-height: 0;
    padding: 0;
  }

  #step-4 .legal-guide-content .carousel-slide {
    padding: 14px 16px 16px;
  }

  #step-4 .legal-guide-content .legal-step h4 {
    font-size: 1rem;
    margin-bottom: 12px;
  }

  #step-4 .legal-guide-content .legal-step-content {
    font-size: 0.9rem;
    line-height: 1.55;
  }

  #step-4 .legal-guide-content .legal-step-content ul {
    padding-left: 1.15rem;
  }
}
</style>
