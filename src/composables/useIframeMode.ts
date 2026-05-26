import { ref, onMounted } from 'vue';
import { extractURLParams, type URLParamsResult } from '../domain/utils/url-params';

const isIframe = ref(false);
const urlParams = ref<URLParamsResult>({ accord: null, bgcolor: null, iframe: false });

export function useIframeMode() {
  onMounted(() => {
    const params = extractURLParams();
    urlParams.value = params;
    isIframe.value = params.iframe;

    if (params.iframe) {
      document.documentElement.classList.add('iframe-mode');
      if (params.bgcolor) {
        document.body.style.backgroundColor = params.bgcolor;
      } else {
        document.body.style.backgroundColor = 'transparent';
      }
    }
  });

  return { isIframe, urlParams };
}
