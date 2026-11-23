import { describe, expect, it } from 'vitest';
import { buildDailyShareText, dailyPuzzleNumber, PUBLIC_DAILY_URL } from './share';

describe('dailyPuzzleNumber', () => {
  it('starts at #1 on the epoch day and counts UTC days', () => {
    expect(dailyPuzzleNumber(new Date('2026-05-10T00:00:00Z'))).toBe(1);
    expect(dailyPuzzleNumber(new Date('2026-05-10T23:59:59Z'))).toBe(1);
    expect(dailyPuzzleNumber(new Date('2026-05-11T00:00:00Z'))).toBe(2);
  });
});

describe('buildDailyShareText', () => {
  const base = { date: new Date('2026-05-12T12:00:00Z'), difficulty: 'hard' as const, seconds: 83 };

  it('first try: one green square, time, link — no answer revealed', () => {
    const text = buildDailyShareText({ ...base, wrongAttempts: 0, streak: 1 });
    expect(text).toBe(
      ['Grid Genius #3 · Hard 🔴', '🟩 first try · 1:23', PUBLIC_DAILY_URL].join('\n')
    );
  });

  it('shows a red square per wrong try and the streak when > 1', () => {
    const text = buildDailyShareText({ ...base, wrongAttempts: 2, streak: 5 });
    expect(text).toContain('🟥🟥🟩 3 tries · 1:23');
    expect(text).toContain('🔥 5-day streak');
  });

  it('caps the squares so the message stays short', () => {
    const text = buildDailyShareText({ ...base, wrongAttempts: 20, streak: 0 });
    expect(text).toContain('🟥🟥🟥🟥🟥🟥…🟩 21 tries');
  });
});
