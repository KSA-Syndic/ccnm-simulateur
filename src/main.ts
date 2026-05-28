import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import App from './App.vue';
import './assets/styles/variables.css';
import './assets/styles/tooltips.css';
import './assets/styles/main.css';
import './assets/styles/extensions.css';
import './accords';
import { useUrlBootstrap } from './composables/useUrlBootstrap';

const app = createApp(App);

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

app.use(pinia);
useUrlBootstrap();

app.config.errorHandler = (err, instance, info) => {
  console.error('[Global Error]', err, info);
};

app.mount('#app');
