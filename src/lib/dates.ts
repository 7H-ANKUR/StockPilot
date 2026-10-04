/**
 * Centralized Date Utility
 *
 * Per spec: Use one centralized date utility. Business timezone: Asia/Kolkata.
 *
 * The retail datasets (Supermart 2014-2018, Indian Superstore 2018) have
 * historical dates. Analytics queries must anchor on the actual data range
 * (latest sale in DB), NOT on `new Date()` (current system time = 2026).
 */

import { db } from '@/lib/db';

/**
 * Get the latest sale timestamp from the database.
 * Used to anchor all "last N days" queries to the actual data range.
 * Cached for 60 seconds to avoid repeated DB hits.
 */
let cachedLatestSale: Date | null = null;
let cachedAt = 0;

export async function getLatestSaleDate(): Promise<Date> {
  const now = Date.now();
  if (cachedLatestSale && (now - cachedAt) < 60000) {
    return cachedLatestSale;
  }
  const latest = await db.sale.findFirst({
    orderBy: { saleTimestamp: 'desc' },
    select: { saleTimestamp: true },
  });
  cachedLatestSale = latest ? new Date(latest.saleTimestamp) : new Date();
  cachedAt = now;
  return cachedLatestSale;
}

/**
 * Compute the start date for a "last N days" query, anchored on the
 * latest sale date (not on today).
 */
export async function getRangeStart(days: number): Promise<{ start: Date; end: Date }> {
  const end = await getLatestSaleDate();
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  return { start, end };
}

/**
 * Format a date for display in the UI (Asia/Kolkata timezone).
 */
export function formatDateIST(d: Date, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...opts,
  }).format(d);
}

/**
 * Format a date+time for display.
 */
export function formatDateTimeIST(d: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Get the date key (YYYY-MM-DD) for grouping.
 */
export function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}
