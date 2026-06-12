/**
 * Date utilities for Jobzon.
 *
 * All dates are stored in UTC in the database. Display formatting uses
 * Australian Eastern time (AEST UTC+10 / AEDT UTC+11). The cron job fires
 * at 8:00 AM UTC which is 6:00 PM AEST / 7:00 PM AEDT — fine for a daily
 * invoice check that doesn't need to hit at exactly midnight local time.
 */

export const AU_LOCALE = "en-AU";
export const AU_TIMEZONE = "Australia/Melbourne"; // handles AEST/AEDT automatically

/**
 * Format a date for display in Australian format: "12 Jun 2026"
 */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString(AU_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: AU_TIMEZONE,
  });
}

/**
 * Format a date as a short Australian date: "12/06/2026"
 */
export function formatDateShort(date: Date | string): string {
  return new Date(date).toLocaleDateString(AU_LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: AU_TIMEZONE,
  });
}

/**
 * Add N days to a date and return a new Date.
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * Return the number of whole days between two dates (b - a).
 * Negative if b is before a.
 */
export function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((b.getTime() - a.getTime()) / msPerDay);
}

/**
 * Return true if the given date is in the past (before today UTC midnight).
 */
export function isPast(date: Date): boolean {
  const today = startOfDayUTC(new Date());
  return date < today;
}

/**
 * Return true if date falls within the next N days from today (inclusive).
 */
export function isWithinDays(date: Date, days: number): boolean {
  const today = startOfDayUTC(new Date());
  const future = addDays(today, days);
  return date >= today && date <= future;
}

/**
 * Return midnight UTC for a given date.
 */
export function startOfDayUTC(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

/**
 * Given a service renewal date, return the date the invoice should be sent
 * (30 days before renewal).
 */
export function invoiceSendDate(renewalDate: Date): Date {
  return addDays(renewalDate, -30);
}

/**
 * Given an invoice send date, return the due date (same as renewal date,
 * i.e. 30 days after the invoice is sent).
 */
export function invoiceDueDate(renewalDate: Date): Date {
  return renewalDate;
}
