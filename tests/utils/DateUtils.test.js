import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateUtils } from '../../src/modules/utils/DateUtils.js';

describe('DateUtils', () => {
  beforeEach(() => {
    // Mock current date to ensure consistent test results
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatDate', () => {
    it('should format date with default format', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const result = DateUtils.formatDate(date);
      
      expect(result).toBe('Jan 01, 2024');
    });

    it('should format date with custom format', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const result = DateUtils.formatDate(date, 'yyyy-MM-dd');
      
      expect(result).toBe('2024-01-01');
    });

    it('should handle null date', () => {
      const result = DateUtils.formatDate(null);
      expect(result).toBe('');
    });

    it('should handle invalid date', () => {
      const result = DateUtils.formatDate('invalid-date');
      expect(result).toBe('');
    });

    it('should handle date string input', () => {
      const result = DateUtils.formatDate('2024-01-01T00:00:00.000Z');
      expect(result).toBe('Jan 01, 2024');
    });
  });

  describe('formatDateTime', () => {
    it('should format date and time with default format', () => {
      const date = new Date('2024-01-01T15:30:00.000Z');
      const result = DateUtils.formatDateTime(date);
      
      expect(result).toBe('Jan 01, 2024 15:30');
    });

    it('should format date and time with custom format', () => {
      const date = new Date('2024-01-01T15:30:00.000Z');
      const result = DateUtils.formatDateTime(date, 'dd/MM/yyyy HH:mm:ss');
      
      expect(result).toBe('01/01/2024 15:30:00');
    });

    it('should handle null date', () => {
      const result = DateUtils.formatDateTime(null);
      expect(result).toBe('');
    });
  });

  describe('formatForInput', () => {
    it('should format date for HTML input', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const result = DateUtils.formatForInput(date);
      
      expect(result).toBe('2024-01-01');
    });

    it('should handle null date', () => {
      const result = DateUtils.formatForInput(null);
      expect(result).toBe('');
    });
  });

  describe('getRelativeTime', () => {
    it('should return relative time for past date', () => {
      const pastDate = new Date('2024-01-10T12:00:00.000Z'); // 5 days ago
      const result = DateUtils.getRelativeTime(pastDate);
      
      expect(result).toBe('5 days ago');
    });

    it('should return relative time for future date', () => {
      const futureDate = new Date('2024-01-20T12:00:00.000Z'); // 5 days from now
      const result = DateUtils.getRelativeTime(futureDate);
      
      expect(result).toBe('in 5 days');
    });

    it('should handle null date', () => {
      const result = DateUtils.getRelativeTime(null);
      expect(result).toBe('');
    });
  });

  describe('getDateDescription', () => {
    it('should return "Today" for today\'s date', () => {
      const today = new Date('2024-01-15T12:00:00.000Z');
      const result = DateUtils.getDateDescription(today);
      
      expect(result).toBe('Today');
    });

    it('should return "Tomorrow" for tomorrow\'s date', () => {
      const tomorrow = new Date('2024-01-16T12:00:00.000Z');
      const result = DateUtils.getDateDescription(tomorrow);
      
      expect(result).toBe('Tomorrow');
    });

    it('should return "Yesterday" for yesterday\'s date', () => {
      const yesterday = new Date('2024-01-14T12:00:00.000Z');
      const result = DateUtils.getDateDescription(yesterday);
      
      expect(result).toBe('Yesterday');
    });

    it('should return formatted date for other dates', () => {
      const otherDate = new Date('2024-01-01T12:00:00.000Z');
      const result = DateUtils.getDateDescription(otherDate);
      
      expect(result).toBe('Jan 01, 2024');
    });

    it('should handle null date', () => {
      const result = DateUtils.getDateDescription(null);
      expect(result).toBe('');
    });
  });

  describe('isOverdue', () => {
    it('should return false for null date', () => {
      const result = DateUtils.isOverdue(null);
      expect(result).toBe(false);
    });

    it('should return false for today\'s date', () => {
      const today = new Date('2024-01-15T12:00:00.000Z');
      const result = DateUtils.isOverdue(today);
      
      expect(result).toBe(false);
    });

    it('should return true for past date', () => {
      const pastDate = new Date('2024-01-10T12:00:00.000Z');
      const result = DateUtils.isOverdue(pastDate);
      
      expect(result).toBe(true);
    });

    it('should return false for future date', () => {
      const futureDate = new Date('2024-01-20T12:00:00.000Z');
      const result = DateUtils.isOverdue(futureDate);
      
      expect(result).toBe(false);
    });

    it('should handle invalid date', () => {
      const result = DateUtils.isOverdue('invalid-date');
      expect(result).toBe(false);
    });
  });

  describe('isDueToday', () => {
    it('should return true for today\'s date', () => {
      const today = new Date('2024-01-15T12:00:00.000Z');
      const result = DateUtils.isDueToday(today);
      
      expect(result).toBe(true);
    });

    it('should return false for other dates', () => {
      const otherDate = new Date('2024-01-16T12:00:00.000Z');
      const result = DateUtils.isDueToday(otherDate);
      
      expect(result).toBe(false);
    });

    it('should return false for null date', () => {
      const result = DateUtils.isDueToday(null);
      expect(result).toBe(false);
    });
  });

  describe('isDueTomorrow', () => {
    it('should return true for tomorrow\'s date', () => {
      const tomorrow = new Date('2024-01-16T12:00:00.000Z');
      const result = DateUtils.isDueTomorrow(tomorrow);
      
      expect(result).toBe(true);
    });

    it('should return false for other dates', () => {
      const today = new Date('2024-01-15T12:00:00.000Z');
      const result = DateUtils.isDueTomorrow(today);
      
      expect(result).toBe(false);
    });

    it('should return false for null date', () => {
      const result = DateUtils.isDueTomorrow(null);
      expect(result).toBe(false);
    });
  });

  describe('isFutureDate', () => {
    it('should return true for future date', () => {
      const futureDate = new Date('2024-01-20T12:00:00.000Z');
      const result = DateUtils.isFutureDate(futureDate);
      
      expect(result).toBe(true);
    });

    it('should return false for past date', () => {
      const pastDate = new Date('2024-01-10T12:00:00.000Z');
      const result = DateUtils.isFutureDate(pastDate);
      
      expect(result).toBe(false);
    });

    it('should return false for null date', () => {
      const result = DateUtils.isFutureDate(null);
      expect(result).toBe(false);
    });
  });

  describe('parseDate', () => {
    it('should parse Date object', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const result = DateUtils.parseDate(date);
      
      expect(result).toBe(date);
    });

    it('should parse ISO string', () => {
      const result = DateUtils.parseDate('2024-01-01T00:00:00.000Z');
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
    });

    it('should parse date string', () => {
      const result = DateUtils.parseDate('2024-01-01');
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
    });

    it('should return null for invalid date', () => {
      const result = DateUtils.parseDate('invalid-date');
      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      const result = DateUtils.parseDate(null);
      expect(result).toBeNull();
    });

    it('should return null for invalid Date object', () => {
      const result = DateUtils.parseDate(new Date('invalid'));
      expect(result).toBeNull();
    });
  });

  describe('getStartOfDay', () => {
    it('should return start of day', () => {
      const date = new Date('2024-01-01T15:30:45.123Z');
      const result = DateUtils.getStartOfDay(date);
      
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it('should return null for invalid date', () => {
      const result = DateUtils.getStartOfDay('invalid-date');
      expect(result).toBeNull();
    });
  });

  describe('getEndOfDay', () => {
    it('should return end of day', () => {
      const date = new Date('2024-01-01T15:30:45.123Z');
      const result = DateUtils.getEndOfDay(date);
      
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
    });

    it('should return null for invalid date', () => {
      const result = DateUtils.getEndOfDay('invalid-date');
      expect(result).toBeNull();
    });
  });

  describe('addDays', () => {
    it('should add days to date', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const result = DateUtils.addDays(date, 5);
      
      expect(result.getDate()).toBe(6);
    });

    it('should return null for invalid date', () => {
      const result = DateUtils.addDays('invalid-date', 5);
      expect(result).toBeNull();
    });
  });

  describe('subtractDays', () => {
    it('should subtract days from date', () => {
      const date = new Date('2024-01-10T00:00:00.000Z');
      const result = DateUtils.subtractDays(date, 5);
      
      expect(result.getDate()).toBe(5);
    });

    it('should return null for invalid date', () => {
      const result = DateUtils.subtractDays('invalid-date', 5);
      expect(result).toBeNull();
    });
  });

  describe('getCurrentDate', () => {
    it('should return current date', () => {
      const result = DateUtils.getCurrentDate();
      
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(new Date('2024-01-15T12:00:00.000Z').getTime());
    });
  });

  describe('getCurrentDateISO', () => {
    it('should return current date as ISO string', () => {
      const result = DateUtils.getCurrentDateISO();
      
      expect(result).toBe('2024-01-15T12:00:00.000Z');
    });
  });

  describe('isValidDate', () => {
    it('should return true for valid date', () => {
      expect(DateUtils.isValidDate(new Date('2024-01-01'))).toBe(true);
      expect(DateUtils.isValidDate('2024-01-01T00:00:00.000Z')).toBe(true);
    });

    it('should return false for invalid date', () => {
      expect(DateUtils.isValidDate('invalid-date')).toBe(false);
      expect(DateUtils.isValidDate(new Date('invalid'))).toBe(false);
      expect(DateUtils.isValidDate(null)).toBe(false);
    });
  });

  describe('getDatePriorityClass', () => {
    it('should return overdue class for past date', () => {
      const pastDate = new Date('2024-01-10T12:00:00.000Z');
      const result = DateUtils.getDatePriorityClass(pastDate);
      
      expect(result).toBe('date-overdue');
    });

    it('should return today class for today\'s date', () => {
      const today = new Date('2024-01-15T12:00:00.000Z');
      const result = DateUtils.getDatePriorityClass(today);
      
      expect(result).toBe('date-today');
    });

    it('should return tomorrow class for tomorrow\'s date', () => {
      const tomorrow = new Date('2024-01-16T12:00:00.000Z');
      const result = DateUtils.getDatePriorityClass(tomorrow);
      
      expect(result).toBe('date-tomorrow');
    });

    it('should return future class for future date', () => {
      const futureDate = new Date('2024-01-20T12:00:00.000Z');
      const result = DateUtils.getDatePriorityClass(futureDate);
      
      expect(result).toBe('date-future');
    });

    it('should return empty string for null date', () => {
      const result = DateUtils.getDatePriorityClass(null);
      expect(result).toBe('');
    });
  });

  describe('sortDatesAsc', () => {
    it('should sort dates in ascending order', () => {
      const dates = [
        '2024-01-03T00:00:00.000Z',
        '2024-01-01T00:00:00.000Z',
        '2024-01-02T00:00:00.000Z'
      ];
      
      const result = DateUtils.sortDatesAsc(dates);
      
      expect(result[0].getDate()).toBe(1);
      expect(result[1].getDate()).toBe(2);
      expect(result[2].getDate()).toBe(3);
    });

    it('should filter out invalid dates', () => {
      const dates = [
        '2024-01-01T00:00:00.000Z',
        'invalid-date',
        '2024-01-02T00:00:00.000Z'
      ];
      
      const result = DateUtils.sortDatesAsc(dates);
      
      expect(result).toHaveLength(2);
    });
  });

  describe('sortDatesDesc', () => {
    it('should sort dates in descending order', () => {
      const dates = [
        '2024-01-01T00:00:00.000Z',
        '2024-01-03T00:00:00.000Z',
        '2024-01-02T00:00:00.000Z'
      ];
      
      const result = DateUtils.sortDatesDesc(dates);
      
      expect(result[0].getDate()).toBe(3);
      expect(result[1].getDate()).toBe(2);
      expect(result[2].getDate()).toBe(1);
    });

    it('should filter out invalid dates', () => {
      const dates = [
        '2024-01-01T00:00:00.000Z',
        'invalid-date',
        '2024-01-02T00:00:00.000Z'
      ];
      
      const result = DateUtils.sortDatesDesc(dates);
      
      expect(result).toHaveLength(2);
    });
  });
});