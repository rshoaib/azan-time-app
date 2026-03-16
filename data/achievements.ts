export interface Achievement {
    id: string;
    title: string;
    description: string;
    emoji: string;
    requirement: number; // streak days needed
    tier: 'bronze' | 'silver' | 'gold' | 'diamond';
}

export const ACHIEVEMENTS: Achievement[] = [
    // Streak milestones
    { id: 'streak_3', title: 'First Steps', description: 'Pray all 5 prayers for 3 days', emoji: '🌱', requirement: 3, tier: 'bronze' },
    { id: 'streak_7', title: '7-Day Warrior', description: 'Complete a full week of prayers', emoji: '🔥', requirement: 7, tier: 'bronze' },
    { id: 'streak_14', title: 'Fortnight Fighter', description: '14 days of consistent prayer', emoji: '⚔️', requirement: 14, tier: 'silver' },
    { id: 'streak_30', title: 'Monthly Guardian', description: 'A full month of prayers!', emoji: '🛡️', requirement: 30, tier: 'silver' },
    { id: 'streak_60', title: 'Devoted Worshipper', description: '60 days of unwavering devotion', emoji: '💎', requirement: 60, tier: 'gold' },
    { id: 'streak_90', title: 'Quarter Champion', description: '90 days — a quarter year!', emoji: '🏆', requirement: 90, tier: 'gold' },
    { id: 'streak_180', title: 'Half-Year Hero', description: '180 days of steadfast prayer', emoji: '👑', requirement: 180, tier: 'diamond' },
    { id: 'streak_365', title: 'Golden Year', description: 'A complete year of prayers!', emoji: '🌟', requirement: 365, tier: 'diamond' },
];

export function getUnlockedAchievements(streak: number): Achievement[] {
    return ACHIEVEMENTS.filter(a => streak >= a.requirement);
}

export function getNextAchievement(streak: number): Achievement | null {
    return ACHIEVEMENTS.find(a => streak < a.requirement) || null;
}

export const TIER_COLORS: Record<Achievement['tier'], { bg: string; border: string; text: string }> = {
    bronze: { bg: '#FDF2E9', border: '#E67E22', text: '#A04000' },
    silver: { bg: '#F2F4F4', border: '#95A5A6', text: '#566573' },
    gold: { bg: '#FEF9E7', border: '#F1C40F', text: '#7D6608' },
    diamond: { bg: '#EBF5FB', border: '#3498DB', text: '#1A5276' },
};
