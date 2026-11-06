/**
 * Utility functions for time formatting, ISO-8601 week calculations,
 * and weekly statistics for ArtLake Studio.
 */

export interface TimeLogLike {
  year_week: string;
  duration_seconds: number;
  started_at?: string;
}

/**
 * Formats a duration in seconds to "HH:MM:SS" (monospace counter format).
 * Example: 9926 -> "02:45:26"
 */
export function formatSeconds(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const h = String(Math.floor(clamped / 3600)).padStart(2, '0');
  const m = String(Math.floor((clamped % 3600) / 60)).padStart(2, '0');
  const s = String(clamped % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/**
 * Parses a string in "HH:MM:SS" format to total seconds.
 * Returns null if the format is invalid, values are out of bounds, or negative.
 * Example: "02:45:26" -> 9926, "2 hours" -> null
 */
export function parseTimeString(timeStr: string): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.trim().split(':');
  if (parts.length !== 3) return null;

  const [hStr, mStr, sStr] = parts;
  if (hStr.trim() === '' || mStr.trim() === '' || sStr.trim() === '') return null;

  const h = Number(hStr);
  const m = Number(mStr);
  const s = Number(sStr);

  if (isNaN(h) || isNaN(m) || isNaN(s)) return null;
  if (!Number.isInteger(h) || !Number.isInteger(m) || !Number.isInteger(s)) return null;
  if (h < 0 || m < 0 || s < 0) return null;
  if (m >= 60 || s >= 60) return null;

  return h * 3600 + m * 60 + s;
}

/**
 * Returns the ISO-8601 year and week string: "YYYY-Www" (e.g. "2026-W45").
 * Uses UTC date values to ensure consistent cross-client calculations.
 */
export function getIsoYearWeek(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Set to nearest Thursday: current date + 4 - current day number (Sunday = 7)
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const year = d.getUTCFullYear();
  const weekStr = String(weekNo).padStart(2, '0');
  return `${year}-W${weekStr}`;
}

/**
 * Returns Monday 00:00:00.000 UTC for the given date.
 */
export function getMondayOfWeek(date: Date = new Date()): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7; // Sunday = 7
  d.setUTCDate(d.getUTCDate() - day + 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Formats total seconds into "Xh Ym" (e.g. "24h 30m").
 */
export function formatHoursMinutes(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  return `${h}h ${m}m`;
}

/**
 * Formats average hours into "Zh/sett" (e.g. "36h/sett").
 */
export function formatAverageHours(avgSeconds: number): string {
  const clamped = Math.max(0, Math.floor(avgSeconds));
  const h = Math.round(clamped / 3600);
  return `${h}h/sett`;
}

/**
 * Computes weekly logged seconds starting from Monday 00:00 UTC.
 * Includes currently running active seconds.
 */
export function calculateWeeklyTotal(
  logs: TimeLogLike[],
  currentYearWeek: string,
  liveElapsedSeconds: number = 0
): number {
  let totalSeconds = 0;
  for (const log of logs) {
    if (log.year_week === currentYearWeek) {
      totalSeconds += log.duration_seconds || 0;
    }
  }
  return totalSeconds + Math.max(0, Math.floor(liveElapsedSeconds));
}

/**
 * Calculates historical weekly average across completed past weeks.
 * STRICT REQUIREMENT: Strictly excludes the current week in progress.
 * If no past weeks exist, returns 0.
 */
export function calculateHistoricalAverage(
  logs: TimeLogLike[],
  currentYearWeek: string
): number {
  // Strictly filter out logs belonging to current week or future
  const pastLogs = logs.filter((log) => log.year_week < currentYearWeek);
  if (pastLogs.length === 0) return 0;

  // Group by distinct past year_week
  const weekTotals = new Map<string, number>();
  for (const log of pastLogs) {
    const current = weekTotals.get(log.year_week) || 0;
    weekTotals.set(log.year_week, current + (log.duration_seconds || 0));
  }

  const distinctWeeksCount = weekTotals.size;
  if (distinctWeeksCount === 0) return 0;

  let totalPastSeconds = 0;
  for (const sec of weekTotals.values()) {
    totalPastSeconds += sec;
  }

  return Math.round(totalPastSeconds / distinctWeeksCount);
}
