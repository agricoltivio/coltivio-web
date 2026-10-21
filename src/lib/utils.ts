import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Local calendar date as "YYYY-MM-DD", for date-only API fields. toISOString()
// would shift dates picked around local midnight onto the previous day in UTC.
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const MS_PER_DAY = 86_400_000;

// Date-only API values ("2025-05-16" or "2025-05-16T00:00:00.000Z") mean a calendar day.
// These read the date part only, so the day doesn't shift with the browser timezone.

// Local midnight of that calendar day
export function parseDateOnly(isoDate: string): Date {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

// Days since 1970-01-01 for that calendar day, for day arithmetic
export function toDayNumber(isoDate: string): number {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

export function formatDateOnly(isoDate: string, locale: string): string {
  return parseDateOnly(isoDate).toLocaleDateString(locale);
}
