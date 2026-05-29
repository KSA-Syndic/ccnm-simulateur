import { ref } from 'vue';
import { extractURLParams, type URLParamsResult } from '../domain/utils/url-params';

const isIframe = ref(false);
const urlParams = ref<URLParamsResult>({ accord: null, bgcolor: null, iframe: false });

function applyUrlParamsToDocument(params: URLParamsResult): void {
  urlParams.value = params;
  isIframe.value = params.iframe;

  if (params.iframe) {
    document.body.classList.add('iframe-mode');
    if (params.bgcolor) {
      document.body.style.backgroundColor = params.bgcolor;
    } else {
      document.body.style.backgroundColor = 'transparent';
    }
  } else {
    document.body.classList.remove('iframe-mode');
    if (params.bgcolor) {
      document.body.style.backgroundColor = params.bgcolor;
    } else {
      document.body.style.removeProperty('background-color');
    }
  }
}

/** Read `iframe` / `bgcolor` from the URL and apply `body.iframe-mode` + background. Call once from `App.vue` setup (runs during mount, before paint). */
export function useIframeMode() {
  applyUrlParamsToDocument(extractURLParams());
  return { isIframe, urlParams };
}
