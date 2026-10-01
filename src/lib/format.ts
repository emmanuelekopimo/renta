const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LONG_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function naira(amount: number): string {
  return '₦' + Math.round(amount).toLocaleString('en-US');
}

/** Short compact money, e.g. ₦1.2M, ₦450K. */
export function nairaShort(amount: number): string {
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`;
  if (amount >= 1_000) return `₦${Math.round(amount / 1_000)}K`;
  return naira(amount);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function formatPeriod(period: string): string {
  const [y, m] = period.split('-').map(Number);
  return `${LONG_MONTHS[m - 1]} ${y}`;
}

export function shortPeriod(period: string): string {
  const [, m] = period.split('-').map(Number);
  return MONTHS[m - 1];
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function lateLabel(daysLate: number): string {
  if (daysLate > 0) return `${daysLate} day${daysLate === 1 ? '' : 's'} late`;
  if (daysLate === 0) return 'Due today';
  const d = -daysLate;
  return `Due in ${d} day${d === 1 ? '' : 's'}`;
}
