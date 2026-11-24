// Date utilities built on top of native Date + date-fns

import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDaysInMonth,
  getDay,
  isBefore,
  isAfter,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns';
import type { ISODate, MonthKey } from '../types';

export function todayISO(): ISODate {
  return format(new Date(), 'yyyy-MM-dd');
}

export function currentMonthKey(): MonthKey {
  return format(new Date(), 'yyyy-MM');
}

export function formatDisplayDate(iso: ISODate): string {
  try {
    return format(parseISO(iso), 'dd MMM yyyy');
  } catch {
    return iso;
  }
}

export function formatShortDate(iso: ISODate): string {
  try {
    return format(parseISO(iso), 'dd MMM');
  } catch {
    return iso;
  }
}

export function formatDisplayMonth(month: MonthKey): string {
  try {
    const [year, m] = month.split('-').map(Number);
    const d = new Date(year, m - 1, 1);
    return format(d, 'MMMM yyyy');
  } catch {
    return month;
  }
}

export function getDaysInMonthKey(month: MonthKey): number {
  const [year, m] = month.split('-').map(Number);
  return getDaysInMonth(new Date(year, m - 1, 1));
}

export function getMonthInterval(month: MonthKey): { start: Date; end: Date; days: ISODate[] } {
  const [year, m] = month.split('-').map(Number);
  const start = startOfMonth(new Date(year, m - 1, 1));
  const end = endOfMonth(start);
  const days = eachDayOfInterval({ start, end }).map((d) => format(d, 'yyyy-MM-dd'));
  return { start, end, days };
}

export function isWeeklyOffDay(iso: ISODate, weeklyOffDay: number): boolean {
  const d = parseISO(iso);
  return getDay(d) === weeklyOffDay;
}

export function prevMonthKey(month: MonthKey): MonthKey {
  const [year, m] = month.split('-').map(Number);
  const d = subMonths(new Date(year, m - 1, 1), 1);
  return format(d, 'yyyy-MM');
}

export function nextMonthKey(month: MonthKey): MonthKey {
  const [year, m] = month.split('-').map(Number);
  const d = addMonths(new Date(year, m - 1, 1), 1);
  return format(d, 'yyyy-MM');
}

export function compareISODates(a: ISODate, b: ISODate): number {
  return a.localeCompare(b);
}

export function isDateBefore(a: ISODate, b: ISODate): boolean {
  return isBefore(parseISO(a), parseISO(b));
}

export function isDateAfter(a: ISODate, b: ISODate): boolean {
  return isAfter(parseISO(a), parseISO(b));
}

export function isDateSame(a: ISODate, b: ISODate): boolean {
  return isSameDay(parseISO(a), parseISO(b));
}
