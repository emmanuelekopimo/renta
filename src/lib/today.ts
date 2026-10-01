import { todayISO } from './rent';

/**
 * "Today" for rent calculations. RENTA_TODAY pins the date (YYYY-MM-DD) for
 * deterministic tests, screenshots and demos.
 */
export function getToday(): string {
  const pinned = process.env.RENTA_TODAY;
  return pinned && /^\d{4}-\d{2}-\d{2}$/.test(pinned) ? pinned : todayISO();
}
