import { describe, it, expect } from 'vitest';
import {
  formatSeconds,
  parseTimeString,
  getIsoYearWeek,
  getMondayOfWeek,
  formatHoursMinutes,
  formatAverageHours,
  calculateWeeklyTotal,
  calculateHistoricalAverage,
} from '../../src/utils/timeCalculations';

describe('Unit: timeCalculations & Historical Average Engine', () => {
  describe('formatSeconds', () => {
    it('formats 0 seconds to 00:00:00', () => {
      expect(formatSeconds(0)).toBe('00:00:00');
    });

    it('formats 59 seconds to 00:00:59', () => {
      expect(formatSeconds(59)).toBe('00:00:59');
    });

    it('formats 3600 seconds to 01:00:00', () => {
      expect(formatSeconds(3600)).toBe('01:00:00');
    });

    it('formats 9926 seconds to exact prototype value 02:45:26', () => {
      expect(formatSeconds(9926)).toBe('02:45:26');
    });

    it('handles negative numbers safely by clamping to 0', () => {
      expect(formatSeconds(-10)).toBe('00:00:00');
    });
  });

  describe('parseTimeString', () => {
    it('parses valid HH:MM:SS format into total seconds', () => {
      expect(parseTimeString('02:45:26')).toBe(9926);
      expect(parseTimeString('00:00:00')).toBe(0);
      expect(parseTimeString('01:30:00')).toBe(5400);
    });

    it('rejects invalid inputs according to prototype validation', () => {
      expect(parseTimeString('2 hours')).toBeNull();
      expect(parseTimeString('12:30')).toBeNull();
      expect(parseTimeString('invalid')).toBeNull();
      expect(parseTimeString('')).toBeNull();
      expect(parseTimeString('-01:00:00')).toBeNull();
      expect(parseTimeString('01:60:00')).toBeNull(); // minutes >= 60
      expect(parseTimeString('01:00:60')).toBeNull(); // seconds >= 60
      expect(parseTimeString('01:30:00.5')).toBeNull(); // non-integer
    });
  });

  describe('getIsoYearWeek & getMondayOfWeek', () => {
    it('computes correct ISO week for Friday Nov 6, 2026 (2026-W45)', () => {
      const date = new Date(Date.UTC(2026, 10, 6)); // Nov 6, 2026
      expect(getIsoYearWeek(date)).toBe('2026-W45');
    });

    it('computes Monday 00:00 UTC for Nov 6, 2026', () => {
      const date = new Date(Date.UTC(2026, 10, 6));
      const monday = getMondayOfWeek(date);
      expect(monday.getUTCFullYear()).toBe(2026);
      expect(monday.getUTCMonth()).toBe(10); // Nov
      expect(monday.getUTCDate()).toBe(2); // Monday Nov 2
      expect(monday.getUTCHours()).toBe(0);
    });
  });

  describe('calculateWeeklyTotal', () => {
    it('sums logs matching current week plus live running elapsed seconds', () => {
      const currentWeek = '2026-W45';
      const logs = [
        { year_week: '2026-W44', duration_seconds: 10000 },
        { year_week: '2026-W45', duration_seconds: 3600 },
        { year_week: '2026-W45', duration_seconds: 7200 },
      ];

      const liveElapsed = 600;
      const total = calculateWeeklyTotal(logs, currentWeek, liveElapsed);
      expect(total).toBe(3600 + 7200 + 600); // 11400s
      expect(formatHoursMinutes(total)).toBe('3h 10m');
    });
  });

  describe('calculateHistoricalAverage', () => {
    it('strictly excludes the current week in progress from the average', () => {
      const currentWeek = '2026-W45';
      const logs = [
        // Past week 43: 10h (36000s)
        { year_week: '2026-W43', duration_seconds: 36000 },
        // Past week 44: 20h (72000s)
        { year_week: '2026-W44', duration_seconds: 72000 },
        // Current week 45 (IN PROGRESS): 4h (14400s) - MUST BE EXCLUDED!
        { year_week: '2026-W45', duration_seconds: 14400 },
      ];

      // Average of completed past weeks: (36000 + 72000) / 2 = 54000s (15h)
      const avg = calculateHistoricalAverage(logs, currentWeek);
      expect(avg).toBe(54000);
      expect(formatAverageHours(avg)).toBe('15h/sett');
    });

    it('returns 0 when no prior completed weeks exist', () => {
      const currentWeek = '2026-W45';
      const logs = [{ year_week: '2026-W45', duration_seconds: 14400 }];
      expect(calculateHistoricalAverage(logs, currentWeek)).toBe(0);
      expect(formatAverageHours(0)).toBe('0h/sett');
    });

    it('handles multiple log entries within the same past week correctly', () => {
      const currentWeek = '2026-W45';
      const logs = [
        { year_week: '2026-W44', duration_seconds: 18000 },
        { year_week: '2026-W44', duration_seconds: 18000 },
      ];
      // Total for W44 is 36000, 1 distinct week -> 36000s (10h)
      const avg = calculateHistoricalAverage(logs, currentWeek);
      expect(avg).toBe(36000);
      expect(formatAverageHours(avg)).toBe('10h/sett');
    });
  });
});
