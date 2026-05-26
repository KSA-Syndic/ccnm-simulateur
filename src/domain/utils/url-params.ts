export interface URLParamsResult {
  accord: string | null;
  bgcolor: string | null;
  iframe: boolean;
}

export function extractURLParams(): URLParamsResult {
  const params = new URLSearchParams(window.location.search);
  return {
    accord: params.get('accord'),
    bgcolor: params.get('bgcolor'),
    iframe: params.get('iframe') === 'true' || window.self !== window.top,
  };
}

export function isIframeMode(): boolean {
  const params = extractURLParams();
  return params.iframe;
}

export function getBackgroundColor(): string | null {
  return extractURLParams().bgcolor;
}
