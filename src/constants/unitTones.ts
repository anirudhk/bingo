export type UnitTone = 'emerald' | 'sky' | 'violet' | 'amber' | 'rose';

/** Literal class strings per tone (Tailwind can't see dynamically built names). */
export const UNIT_TONE_CLASSES: Record<
  UnitTone,
  {
    solid: string;
    text: string;
    ring: string;
    soft: string;
    softRing: string;
    rail: string;
    chip: string;
  }
> = {
  emerald: {
    solid: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-500',
    soft: 'bg-emerald-50 dark:bg-emerald-950/40',
    softRing: 'ring-emerald-200 dark:ring-emerald-900',
    rail: 'bg-emerald-400 dark:bg-emerald-600',
    chip: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  },
  sky: {
    solid: 'bg-sky-500',
    text: 'text-sky-600 dark:text-sky-400',
    ring: 'ring-sky-500',
    soft: 'bg-sky-50 dark:bg-sky-950/40',
    softRing: 'ring-sky-200 dark:ring-sky-900',
    rail: 'bg-sky-400 dark:bg-sky-600',
    chip: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  },
  violet: {
    solid: 'bg-violet-500',
    text: 'text-violet-600 dark:text-violet-400',
    ring: 'ring-violet-500',
    soft: 'bg-violet-50 dark:bg-violet-950/40',
    softRing: 'ring-violet-200 dark:ring-violet-900',
    rail: 'bg-violet-400 dark:bg-violet-600',
    chip: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  },
  amber: {
    solid: 'bg-amber-500',
    text: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-500',
    soft: 'bg-amber-50 dark:bg-amber-950/40',
    softRing: 'ring-amber-200 dark:ring-amber-900',
    rail: 'bg-amber-400 dark:bg-amber-600',
    chip: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  },
  rose: {
    solid: 'bg-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    ring: 'ring-rose-500',
    soft: 'bg-rose-50 dark:bg-rose-950/40',
    softRing: 'ring-rose-200 dark:ring-rose-900',
    rail: 'bg-rose-400 dark:bg-rose-600',
    chip: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  },
};
