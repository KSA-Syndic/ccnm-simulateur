import { describe, expect, it } from 'vitest';
import {
  mergeLocationSearchAndHashSearch,
  parseBareHexHashAsBgcolor,
} from '../../src/domain/utils/url-params';

describe('mergeLocationSearchAndHashSearch', () => {
  it('lit accord dans la query du hash', () => {
    const m = mergeLocationSearchAndHashSearch('', '#/situation?accord=kuhn');
    expect(m.get('accord')).toBe('kuhn');
  });

  it('fusionne search principal et query du hash (hash prioritaire sur même clé)', () => {
    const m = mergeLocationSearchAndHashSearch('?bgcolor=%23fff', '#/classification?accord=kuhn');
    expect(m.get('accord')).toBe('kuhn');
    expect(m.get('bgcolor')).toBe('#fff');
  });
});

describe('parseBareHexHashAsBgcolor', () => {
  it('accepte #RGB et #RRGGBB seuls (fragment issu de bgcolor=#… non encodé)', () => {
    expect(parseBareHexHashAsBgcolor('#fff')).toBe('#fff');
    expect(parseBareHexHashAsBgcolor('#aBc123')).toBe('#aBc123');
    expect(parseBareHexHashAsBgcolor('#ff')).toBeNull();
    expect(parseBareHexHashAsBgcolor('#fffffff')).toBeNull();
    expect(parseBareHexHashAsBgcolor('#/step')).toBeNull();
    expect(parseBareHexHashAsBgcolor('')).toBeNull();
  });
});
