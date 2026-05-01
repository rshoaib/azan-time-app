import {
  ACHIEVEMENTS,
  getUnlockedAchievements,
  getNextAchievement,
  TIER_COLORS,
} from '@/data/achievements';

describe('achievements', () => {
  describe('ACHIEVEMENTS data', () => {
    it('is sorted by requirement ascending', () => {
      for (let i = 1; i < ACHIEVEMENTS.length; i++) {
        expect(ACHIEVEMENTS[i].requirement).toBeGreaterThanOrEqual(
          ACHIEVEMENTS[i - 1].requirement
        );
      }
    });

    it('all IDs are unique', () => {
      const ids = ACHIEVEMENTS.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('every tier has a color definition', () => {
      const tiers = new Set(ACHIEVEMENTS.map((a) => a.tier));
      for (const tier of tiers) {
        expect(TIER_COLORS[tier]).toBeDefined();
        expect(TIER_COLORS[tier].bg).toBeDefined();
        expect(TIER_COLORS[tier].border).toBeDefined();
        expect(TIER_COLORS[tier].text).toBeDefined();
      }
    });
  });

  describe('getUnlockedAchievements', () => {
    it('returns empty array for 0 streak', () => {
      expect(getUnlockedAchievements(0)).toEqual([]);
    });

    it('returns first achievement at 3 day streak', () => {
      const unlocked = getUnlockedAchievements(3);
      expect(unlocked.length).toBe(1);
      expect(unlocked[0].id).toBe('streak_3');
    });

    it('returns multiple achievements at 30 day streak', () => {
      const unlocked = getUnlockedAchievements(30);
      expect(unlocked.length).toBeGreaterThan(1);
      // Should include streak_3, streak_7, streak_14, streak_30
      const ids = unlocked.map((a) => a.id);
      expect(ids).toContain('streak_3');
      expect(ids).toContain('streak_30');
    });

    it('returns all achievements at 365+ streak', () => {
      const unlocked = getUnlockedAchievements(365);
      expect(unlocked.length).toBe(ACHIEVEMENTS.length);
    });
  });

  describe('getNextAchievement', () => {
    it('returns first achievement for 0 streak', () => {
      const next = getNextAchievement(0);
      expect(next).not.toBeNull();
      expect(next!.id).toBe('streak_3');
    });

    it('returns streak_7 when at 3 days', () => {
      const next = getNextAchievement(3);
      expect(next!.requirement).toBe(7);
    });

    it('returns null when all achievements are unlocked', () => {
      const next = getNextAchievement(365);
      expect(next).toBeNull();
    });
  });
});
