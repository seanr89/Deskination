import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatIsoDate, getTodayIsoDate, getCurrentYearMonth } from '../dateUtils';

describe('dateUtils', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatIsoDate', () => {
    it('formats a Date with single-digit month and day with leading zeros', () => {
      const date = new Date(2026, 2, 5, 14, 30, 0); // March 5, 2026
      expect(formatIsoDate(date)).toBe('2026-03-05');
    });

    it('formats a Date with double-digit month and day', () => {
      const date = new Date(2026, 10, 25, 9, 0, 0); // November 25, 2026
      expect(formatIsoDate(date)).toBe('2026-11-25');
    });

    it('defaults to the current date when no argument is provided', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 6, 19, 12, 0, 0)); // July 19, 2026
      expect(formatIsoDate()).toBe('2026-07-19');
    });
  });

  describe('getTodayIsoDate', () => {
    it('returns the current system date formatted as YYYY-MM-DD', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 0, 9, 8, 15, 0)); // January 9, 2026
      expect(getTodayIsoDate()).toBe('2026-01-09');
    });
  });

  describe('getCurrentYearMonth', () => {
    it('returns the YYYY-MM prefix for a provided Date', () => {
      const date = new Date(2026, 3, 12, 10, 0, 0); // April 12, 2026
      expect(getCurrentYearMonth(date)).toBe('2026-04');
    });

    it('defaults to the current system year and month when no argument is provided', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 11, 1, 16, 45, 0)); // December 1, 2026
      expect(getCurrentYearMonth()).toBe('2026-12');
    });
  });
});
