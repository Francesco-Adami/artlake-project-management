import { describe, it, expect } from 'vitest';
import {
  parseTimeString,
  getIsoYearWeek,
  getMondayOfWeek,
  formatAverageHours,
  calculateHistoricalAverage,
  TimeLogLike,
} from '../../src/utils/timeCalculations';

describe('Empirical Adversarial Challenge: Milestone 3 Date Math & Calculation Engine', () => {
  // =========================================================================
  // CATEGORY 1: Week Boundary Precision (Sunday 23:59:59.999 UTC vs Monday 00:00:00.000 UTC)
  // =========================================================================
  describe('Category 1: Week Boundary Precision & Millisecond Ticks', () => {
    const testCases = [
      {
        name: 'Standard November week (2026-W44 to 2026-W45)',
        sunIso: '2026-11-01T23:59:59.999Z',
        expectedSunWeek: '2026-W44',
        expectedSunMonday: '2026-10-26T00:00:00.000Z',
        expectedMonWeek: '2026-W45',
        expectedMonMonday: '2026-11-02T00:00:00.000Z',
      },
      {
        name: 'Leap year 53-week boundary (2020-W53 to 2021-W01)',
        sunIso: '2021-01-03T23:59:59.999Z',
        expectedSunWeek: '2020-W53',
        expectedSunMonday: '2020-12-28T00:00:00.000Z',
        expectedMonWeek: '2021-W01',
        expectedMonMonday: '2021-01-04T00:00:00.000Z',
      },
      {
        name: '52-week year boundary (2025-W52 to 2026-W01)',
        sunIso: '2025-12-28T23:59:59.999Z',
        expectedSunWeek: '2025-W52',
        expectedSunMonday: '2025-12-22T00:00:00.000Z',
        expectedMonWeek: '2026-W01',
        expectedMonMonday: '2025-12-29T00:00:00.000Z',
      },
      {
        name: '53-week boundary (2026-W53 to 2027-W01)',
        sunIso: '2027-01-03T23:59:59.999Z',
        expectedSunWeek: '2026-W53',
        expectedSunMonday: '2026-12-28T00:00:00.000Z',
        expectedMonWeek: '2027-W01',
        expectedMonMonday: '2027-01-04T00:00:00.000Z',
      },
    ];

    for (const tc of testCases) {
      it(`evaluates ${tc.name} with 1ms tick transition`, () => {
        const sunDate = new Date(tc.sunIso);
        const monDate = new Date(sunDate.getTime() + 1);

        expect(getIsoYearWeek(sunDate)).toBe(tc.expectedSunWeek);
        expect(getMondayOfWeek(sunDate).toISOString()).toBe(tc.expectedSunMonday);

        expect(getIsoYearWeek(monDate)).toBe(tc.expectedMonWeek);
        expect(getMondayOfWeek(monDate).toISOString()).toBe(tc.expectedMonMonday);

        // Difference must be exactly 7 calendar days between Mondays
        const delta = getMondayOfWeek(monDate).getTime() - getMondayOfWeek(sunDate).getTime();
        expect(delta).toBe(7 * 24 * 3600 * 1000);
      });
    }
  });

  // =========================================================================
  // CATEGORY 2: Year Transition Boundaries (ISO week 52/53 crossing into week 1)
  // =========================================================================
  describe('Category 2: Year Transition Boundaries', () => {
    it('handles mid-week calendar year crossing without splitting week 1', () => {
      // Wednesday Dec 31, 2025 and Thursday Jan 1, 2026 both belong to 2026-W01
      const dec31 = new Date('2025-12-31T20:00:00.000Z');
      const jan1 = new Date('2026-01-01T08:00:00.000Z');

      expect(getIsoYearWeek(dec31)).toBe('2026-W01');
      expect(getIsoYearWeek(jan1)).toBe('2026-W01');
      expect(getMondayOfWeek(dec31).toISOString()).toBe('2025-12-29T00:00:00.000Z');
      expect(getMondayOfWeek(jan1).toISOString()).toBe('2025-12-29T00:00:00.000Z');
    });

    it('correctly attributes Jan 1, 2, 3 of 2021 to week 53 of 2020', () => {
      const jan1_2021 = new Date('2021-01-01T12:00:00.000Z'); // Friday
      const jan2_2021 = new Date('2021-01-02T12:00:00.000Z'); // Saturday
      const jan3_2021 = new Date('2021-01-03T12:00:00.000Z'); // Sunday
      const jan4_2021 = new Date('2021-01-04T12:00:00.000Z'); // Monday

      expect(getIsoYearWeek(jan1_2021)).toBe('2020-W53');
      expect(getIsoYearWeek(jan2_2021)).toBe('2020-W53');
      expect(getIsoYearWeek(jan3_2021)).toBe('2020-W53');
      expect(getIsoYearWeek(jan4_2021)).toBe('2021-W01');
    });
  });

  // =========================================================================
  // CATEGORY 3: Historical Average Calculation Stress Testing
  // =========================================================================
  describe('Category 3: Historical Average Calculation Engine', () => {
    it('returns 0 when logs array is empty (0 past weeks)', () => {
      expect(calculateHistoricalAverage([], '2026-W45')).toBe(0);
      expect(formatAverageHours(0)).toBe('0h/sett');
    });

    it('returns 0 when only current week logs exist (0 past weeks)', () => {
      const logs: TimeLogLike[] = [
        { year_week: '2026-W45', duration_seconds: 36000 },
        { year_week: '2026-W45', duration_seconds: 18000 },
      ];
      expect(calculateHistoricalAverage(logs, '2026-W45')).toBe(0);
    });

    it('returns 0 when only future logs exist (0 past weeks)', () => {
      const logs: TimeLogLike[] = [
        { year_week: '2026-W46', duration_seconds: 72000 },
        { year_week: '2027-W01', duration_seconds: 36000 },
      ];
      expect(calculateHistoricalAverage(logs, '2026-W45')).toBe(0);
    });

    it('calculates average correctly for exactly 1 past week with single log', () => {
      const logs: TimeLogLike[] = [
        { year_week: '2026-W44', duration_seconds: 36000 }, // 10h
      ];
      expect(calculateHistoricalAverage(logs, '2026-W45')).toBe(36000);
      expect(formatAverageHours(36000)).toBe('10h/sett');
    });

    it('calculates average correctly for exactly 1 past week with multiple logs', () => {
      const logs: TimeLogLike[] = [
        { year_week: '2026-W44', duration_seconds: 14400 }, // 4h
        { year_week: '2026-W44', duration_seconds: 7200 },  // 2h
        { year_week: '2026-W44', duration_seconds: 14400 }, // 4h
      ];
      // Total for W44 = 36000s, 1 distinct week -> 36000s
      expect(calculateHistoricalAverage(logs, '2026-W45')).toBe(36000);
      expect(formatAverageHours(36000)).toBe('10h/sett');
    });

    it('calculates average correctly across multiple past weeks', () => {
      const logs: TimeLogLike[] = [
        { year_week: '2026-W41', duration_seconds: 36000 },  // 10h
        { year_week: '2026-W42', duration_seconds: 72000 },  // 20h
        { year_week: '2026-W43', duration_seconds: 108000 }, // 30h
        { year_week: '2026-W44', duration_seconds: 144000 }, // 40h
      ];
      // (10 + 20 + 30 + 40) / 4 = 25h = 90000s
      expect(calculateHistoricalAverage(logs, '2026-W45')).toBe(90000);
      expect(formatAverageHours(90000)).toBe('25h/sett');
    });

    it('strictly excludes ANY log belonging to current week from historical average', () => {
      const logs: TimeLogLike[] = [
        { year_week: '2026-W43', duration_seconds: 36000 },  // 10h
        { year_week: '2026-W44', duration_seconds: 72000 },  // 20h
        // Current week in progress (huge hours, must not taint average)
        { year_week: '2026-W45', duration_seconds: 9999999 },
      ];
      // Expected: (36000 + 72000) / 2 = 54000s (15h)
      const avg = calculateHistoricalAverage(logs, '2026-W45');
      expect(avg).toBe(54000);
      expect(formatAverageHours(avg)).toBe('15h/sett');
    });

    it('calculates average correctly when past weeks cross calendar year boundaries', () => {
      const logs: TimeLogLike[] = [
        { year_week: '2025-W51', duration_seconds: 36000 }, // 10h
        { year_week: '2025-W52', duration_seconds: 72000 }, // 20h
        { year_week: '2026-W01', duration_seconds: 36000 }, // 10h
        // Current week 2026-W02
        { year_week: '2026-W02', duration_seconds: 50000 },
      ];
      // (36000 + 72000 + 36000) / 3 = 48000s
      expect(calculateHistoricalAverage(logs, '2026-W02')).toBe(48000);
    });
  });

  // =========================================================================
  // CATEGORY 4: parseTimeString Hostile Fuzzing Battery
  // =========================================================================
  describe('Category 4: parseTimeString Hostile Fuzzing Battery', () => {
    const invalidInputs = [
      '-01:00:00',
      '00:-05:00',
      '00:00:-10',
      '-10:-20:-30',
      'abc:def:ghi',
      '01:xx:00',
      'NaN:00:00',
      'Infinity:00:00',
      '-Infinity:00:00',
      '2 hours',
      '12:30',
      '01',
      '::',
      ':::',
      '01:02:03:04',
      '01::03',
      ':01:02',
      '01:02:',
      '',
      '   ',
      '01:60:00',
      '01:00:60',
      '01:99:99',
      '01.5:00:00',
      '00:01.5:00',
      '00:00:01.5',
    ];

    for (const input of invalidInputs) {
      it(`rejects invalid or out-of-bounds input: "${input}"`, () => {
        expect(parseTimeString(input)).toBeNull();
      });
    }

    it('parses valid boundary times correctly', () => {
      expect(parseTimeString('00:00:00')).toBe(0);
      expect(parseTimeString('00:00:59')).toBe(59);
      expect(parseTimeString('00:59:00')).toBe(3540);
      expect(parseTimeString('01:00:00')).toBe(3600);
      expect(parseTimeString('02:45:26')).toBe(9926);
      expect(parseTimeString('100:00:00')).toBe(360000);
    });

    it('safely handles non-string and falsy inputs without throwing exceptions', () => {
      expect(parseTimeString(null as any)).toBeNull();
      expect(parseTimeString(undefined as any)).toBeNull();
      expect(parseTimeString(12345 as any)).toBeNull();
      expect(parseTimeString({} as any)).toBeNull();
      expect(parseTimeString([] as any)).toBeNull();
    });
  });
});
