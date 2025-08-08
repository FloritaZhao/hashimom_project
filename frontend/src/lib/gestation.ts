export type Trimester = 'T1' | 'T2' | 'T3' | '-';

export function classifyTrimester(weeks: number | null | undefined): Trimester {
  if (weeks == null) return '-';
  if (weeks <= 12) return 'T1';
  if (weeks <= 27) return 'T2';
  return 'T3';
}

export function calculateByLmp(lmp: Date, today: Date = new Date()): { weeks: number | null; days: number | null; trimester: Trimester } {
  const days = Math.floor((today.getTime() - lmp.getTime()) / (1000 * 60 * 60 * 24));
  if (isNaN(days) || days < 0) return { weeks: null, days: null, trimester: '-' };
  const weeks = Math.floor(days / 7);
  return { weeks, days: days % 7, trimester: classifyTrimester(weeks) };
}

export function calculateByDue(edd: Date, today: Date = new Date()) {
  const lmp = new Date(edd.getTime() - 280 * 24 * 60 * 60 * 1000);
  return calculateByLmp(lmp, today);
}

export const referenceRanges: Record<string, Record<Exclude<Trimester, '-'>, { low: number; high: number; unit: string }>> = {
  TSH: {
    T1: { low: 0.1, high: 2.5, unit: 'mIU/L' },
    T2: { low: 0.2, high: 3.0, unit: 'mIU/L' },
    T3: { low: 0.3, high: 3.0, unit: 'mIU/L' },
  },
  FT4: {
    T1: { low: 0.8, high: 1.7, unit: 'ng/dL' },
    T2: { low: 0.7, high: 1.6, unit: 'ng/dL' },
    T3: { low: 0.7, high: 1.5, unit: 'ng/dL' },
  },
  TPOAB: {
    T1: { low: 0, high: 35, unit: 'IU/mL' },
    T2: { low: 0, high: 35, unit: 'IU/mL' },
    T3: { low: 0, high: 35, unit: 'IU/mL' },
  },
  TGAB: {
    T1: { low: 0, high: 35, unit: 'IU/mL' },
    T2: { low: 0, high: 35, unit: 'IU/mL' },
    T3: { low: 0, high: 35, unit: 'IU/mL' },
  },
};


