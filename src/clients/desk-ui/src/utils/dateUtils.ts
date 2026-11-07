/**
 * Returns a Date formatted as a local YYYY-MM-DD ISO date string.
 */
export function formatIsoDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns today's local date in YYYY-MM-DD format.
 */
export function getTodayIsoDate(): string {
  return formatIsoDate(new Date());
}

/**
 * Returns the current year-month prefix in YYYY-MM format.
 */
export function getCurrentYearMonth(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
