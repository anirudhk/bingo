import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BoardThemeId } from '../constants/boardThemes';

export type ThemeChoice = 'light' | 'dark' | 'system';

export interface PrefsState {
  theme: ThemeChoice;
  /** After the first-run onboarding is dismissed or completed. */
  onboardingDone: boolean;
  /** Learn path: user dismissed the Unit 3 (Mixed +/-) intro once. */
  learnMixedUnitIntroSeen: boolean;
  /** EPIC-33 — allow loading Plausible when domain env is set. */
  analyticsOptIn: boolean;
  /** Game sound effects (synthesised, see utils/feedback). */
  soundEnabled: boolean;
  /** Vibration feedback on supported devices. */
  hapticsEnabled: boolean;
  /** Cosmetic board theme for number tiles (unlocked with XP — see constants/boardThemes). */
  boardTheme: BoardThemeId;
}

export interface PrefsActions {
  setTheme: (t: ThemeChoice) => void;
  markOnboardingDone: () => void;
  markLearnMixedUnitIntroSeen: () => void;
  setAnalyticsOptIn: (v: boolean) => void;
  setSoundEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
  setBoardTheme: (id: BoardThemeId) => void;
  resetPrefs: () => void;
}

export type PrefsStore = PrefsState & PrefsActions;

const initialState: PrefsState = {
  theme: 'system',
  onboardingDone: false,
  learnMixedUnitIntroSeen: false,
  analyticsOptIn: false,
  soundEnabled: true,
  hapticsEnabled: true,
  boardTheme: 'classic',
};

export const usePrefsStore = create<PrefsStore>()(
  persist(
    (set) => ({
      ...initialState,
      setTheme: (theme) => set({ theme }),
      markOnboardingDone: () => set({ onboardingDone: true }),
      markLearnMixedUnitIntroSeen: () => set({ learnMixedUnitIntroSeen: true }),
      setAnalyticsOptIn: (analyticsOptIn) => set({ analyticsOptIn }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setBoardTheme: (boardTheme) => set({ boardTheme }),
      resetPrefs: () => set({ ...initialState }),
    }),
    {
      name: 'gridgenius:prefs:v1',
      storage: createJSONStorage(() => localStorage),
      version: 6,
      migrate: (persisted, version) => {
        if (!persisted || typeof persisted !== 'object') return { ...initialState };
        const p = persisted as Partial<PrefsState> & {
          audience?: unknown;
          zen?: unknown;
        };
        const { audience: _legacyAudience, zen: _legacyZen, ...rest } = p;
        void _legacyAudience;
        void _legacyZen;
        const merged = { ...initialState, ...rest };
        if (version < 2) merged.onboardingDone = p.onboardingDone ?? false;
        if (version < 4)
          merged.learnMixedUnitIntroSeen =
            (p as Partial<{ learnMixedUnitIntroSeen?: boolean }>).learnMixedUnitIntroSeen ?? false;
        if (version < 6) merged.analyticsOptIn = false;
        return merged;
      },
    }
  )
);

/**
 * Resolve `theme` to an effective light/dark value. `system` defers to the OS
 * `prefers-color-scheme`. SSR-safe: returns 'light' if `matchMedia` is missing.
 */
export const resolveTheme = (theme: ThemeChoice): 'light' | 'dark' => {
  if (theme !== 'system') return theme;
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};
