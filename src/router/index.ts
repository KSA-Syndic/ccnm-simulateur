import { createRouter, createWebHashHistory } from 'vue-router';

const StepClassification = () => import('../features/wizard/StepClassification.vue');
const StepSituation = () => import('../features/wizard/StepSituation.vue');
const StepResult = () => import('../features/wizard/StepResult.vue');
const StepArretees = () => import('../features/wizard/StepArretees.vue');

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/classification' },
    { path: '/classification', name: 'classification', component: StepClassification },
    { path: '/situation', name: 'situation', component: StepSituation },
    { path: '/result', name: 'result', component: StepResult },
    { path: '/arretees', name: 'arretees', component: StepArretees },
  ],
});
