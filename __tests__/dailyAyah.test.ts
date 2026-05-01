import { getDailyAyah, DAILY_AYAHS } from '@/data/dailyAyah';

describe('dailyAyah', () => {
  describe('DAILY_AYAHS data', () => {
    it('contains exactly 30 ayahs', () => {
      expect(DAILY_AYAHS).toHaveLength(30);
    });

    it('each ayah has required fields', () => {
      for (const ayah of DAILY_AYAHS) {
        expect(ayah.id).toBeDefined();
        expect(typeof ayah.arabic).toBe('string');
        expect(ayah.arabic.length).toBeGreaterThan(0);
        expect(typeof ayah.translation).toBe('string');
        expect(ayah.translation.length).toBeGreaterThan(0);
        expect(typeof ayah.reference).toBe('string');
        expect(ayah.reference.length).toBeGreaterThan(0);
      }
    });

    it('all IDs are unique', () => {
      const ids = DAILY_AYAHS.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('getDailyAyah', () => {
    it('returns an ayah from the list', () => {
      const ayah = getDailyAyah();
      expect(DAILY_AYAHS).toContainEqual(ayah);
    });

    it('returns the same ayah when called twice on the same day', () => {
      const a = getDailyAyah();
      const b = getDailyAyah();
      expect(a).toEqual(b);
    });
  });
});
