export interface URLParamsResult {
  accord: string | null;
  bgcolor: string | null;
  iframe: boolean;
}

export function mergeLocationSearchAndHashSearch(search: string, hash: string): URLSearchParams {
  const merged = new URLSearchParams(search);
  const q = hash.indexOf('?');
  if (q >= 0) {
    new URLSearchParams(hash.slice(q + 1)).forEach((val, key) => {
      merged.set(key, val);
    });
  }
  return merged;
}

function mergeSearchParamsFromLocation(): URLSearchParams {
  return mergeLocationSearchAndHashSearch(window.location.search, window.location.hash);
}

export function extractURLParams(): URLParamsResult {
  const params = mergeSearchParamsFromLocation();
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
