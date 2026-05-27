import { describe, expect, it } from 'vitest';
import { mergeLocationSearchAndHashSearch } from '../../src/domain/utils/url-params';

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
