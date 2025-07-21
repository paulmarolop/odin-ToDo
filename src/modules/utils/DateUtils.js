import { 
  format, 
  formatDistanceToNow, 
  isToday, 
  isTomorrow, 
  isYesterday,
  isPast,
  isFuture,
  parseISO,
  isValid,
  startOfDay,
  endOfDay,
  addDays,
  subDays
} from 'date-fns';

/**
 * Date utility functions using date-fns library
 */
export class DateUtils {
  /**
   * Format date for display
   */
  static formatDate(date, formatString = 'MMM dd, yyyy') {
    if (!date) return '';
    
    const dateObj = this.parseDate(date);
    if (!dateObj) return '';
    
    return format(dateObj, formatString);
  }

  /**
   * Format date and time for display
   */
  static formatDateTime(date, formatString = 'MMM dd, yyyy HH:mm') {
    if (!date) return '';
    
    const dateObj = this.parseDate(date);
    if (!dateObj) return '';
    
    return format(dateObj, formatString);
  }

  /**
   * Format date for form inputs (YYYY-MM-DD)
   */
  static formatForInput(date) {
    if (!date) return '';
    
    const dateObj = this.parseDate(date);
    if (!dateObj) return '';
    
    return format(dateObj, 'yyyy-MM-dd');
  }

  /**
   * Get relative time description (e.g., "2 days ago", "in 3 hours")
   */
  static getRelativeTime(date) {
    if (!date) return '';
    
    const dateObj = this.parseDate(date);
    if (!dateObj) return '';
    
    return formatDistanceToNow(dateObj, { addSuffix: true });
  }

  /**
   * Get human-readable date description
   */
  static getDateDescription(date) {
    if (!date) return '';
    
    const dateObj = this.parseDate(date);
    if (!dateObj) return '';
    
    if (isToday(dateObj)) {
      return 'Today';
    } else if (isTomorrow(dateObj)) {
      return 'Tomorrow';
    } else if (isYesterday(dateObj)) {
      return 'Yesterday';
    } else {
      return this.formatDate(dateObj);
    }
  }

  /**
   * Check if date is overdue (past and not today)
   */
  static isOverdue(date) {
    if (!date) return false;
    
    const dateObj = this.parseDate(date);
    if (!dateObj) return false;
    
    return isPast(dateObj) && !isToday(dateObj);
  }

  /**
   * Check if date is due today
   */
  static isDueToday(date) {
    if (!date) return false;
    
    const dateObj = this.parseDate(date);
    if (!dateObj) return false;
    
    return isToday(dateObj);
  }

  /**
   * Check if date is due tomorrow
   */
  static isDueTomorrow(date) {
    if (!date) return false;
    
    const dateObj = this.parseDate(date);
    if (!dateObj) return false;
    
    return isTomorrow(dateObj);
  }

  /**
   * Check if date is in the future
   */
  static isFutureDate(date) {
    if (!date) return false;
    
    const dateObj = this.parseDate(date);
    if (!dateObj) return false;
    
    return isFuture(dateObj);
  }

  /**
   * Parse various date formats into Date object
   */
  static parseDate(date) {
    if (!date) return null;
    
    if (date instanceof Date) {
      return isValid(date) ? date : null;
    }
    
    if (typeof date === 'string') {
      // Try parsing ISO string first
      try {
        const parsed = parseISO(date);
        if (isValid(parsed)) {
          return parsed;
        }
      } catch (error) {
        // Fall through to Date constructor
      }
      
      // Try Date constructor
      try {
        const parsed = new Date(date);
        if (isValid(parsed)) {
          return parsed;
        }
      } catch (error) {
        return null;
      }
    }
    
    return null;
  }

  /**
   * Get start of day for a date
   */
  static getStartOfDay(date) {
    const dateObj = this.parseDate(date);
    if (!dateObj) return null;
    
    return startOfDay(dateObj);
  }

  /**
   * Get end of day for a date
   */
  static getEndOfDay(date) {
    const dateObj = this.parseDate(date);
    if (!dateObj) return null;
    
    return endOfDay(dateObj);
  }

  /**
   * Add days to a date
   */
  static addDays(date, days) {
    const dateObj = this.parseDate(date);
    if (!dateObj) return null;
    
    return addDays(dateObj, days);
  }

  /**
   * Subtract days from a date
   */
  static subtractDays(date, days) {
    const dateObj = this.parseDate(date);
    if (!dateObj) return null;
    
    return subDays(dateObj, days);
  }

  /**
   * Get current date
   */
  static getCurrentDate() {
    return new Date();
  }

  /**
   * Get current date as ISO string
   */
  static getCurrentDateISO() {
    return new Date().toISOString();
  }

  /**
   * Validate if a date string/object is valid
   */
  static isValidDate(date) {
    const dateObj = this.parseDate(date);
    return dateObj !== null;
  }

  /**
   * Get date priority class for styling
   */
  static getDatePriorityClass(date) {
    if (!date) return '';
    
    if (this.isOverdue(date)) {
      return 'date-overdue';
    } else if (this.isDueToday(date)) {
      return 'date-today';
    } else if (this.isDueTomorrow(date)) {
      return 'date-tomorrow';
    } else {
      return 'date-future';
    }
  }

  /**
   * Sort dates in ascending order
   */
  static sortDatesAsc(dates) {
    return dates
      .map(date => this.parseDate(date))
      .filter(date => date !== null)
      .sort((a, b) => a.getTime() - b.getTime());
  }

  /**
   * Sort dates in descending order
   */
  static sortDatesDesc(dates) {
    return dates
      .map(date => this.parseDate(date))
      .filter(date => date !== null)
      .sort((a, b) => b.getTime() - a.getTime());
  }
}