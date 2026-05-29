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

/**
 * When the query contains `bgcolor=#hex` without encoding, the browser puts `#hex` in the
 * fragment and `bgcolor` is empty. If the hash is only `#RGB` or `#RRGGBB`, treat it as the color.
 */
export function parseBareHexHashAsBgcolor(hash: string): string | null {
  if (!hash || hash.length < 2) return null;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hash) ? hash : null;
}

export function extractURLParams(): URLParamsResult {
  const params = mergeSearchParamsFromLocation();
  const rawBg = params.get('bgcolor');
  const bgcolorFromQuery = rawBg && rawBg.trim() !== '' ? rawBg : null;
  const bgcolorFromHash = parseBareHexHashAsBgcolor(window.location.hash);
  const bgcolor = bgcolorFromQuery ?? bgcolorFromHash;

  return {
    accord: params.get('accord'),
    bgcolor,
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
