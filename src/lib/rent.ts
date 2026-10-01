/**
 * Pure rent calculations. Every function takes "today" explicitly so the
 * logic is deterministic and easy to unit test.
 *
 * Dates are ISO strings (YYYY-MM-DD) and rent periods are YYYY-MM.
 */

export type RentStatus = 'paid' | 'partial' | 'due' | 'overdue';

export interface PeriodStatus {
  period: string;
  dueDate: string;
  rent: number;
  paid: number;
  balance: number;
  status: RentStatus;
  /** Positive when overdue, 0 on the due date, negative when still upcoming. */
  daysLate: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function todayISO(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function periodOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function isValidPeriod(period: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
}

export function addMonths(period: string, n: number): string {
  const [y, m] = period.split('-').map(Number);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${pad((idx % 12) + 1)}`;
}

export function daysInMonth(period: string): number {
  const [y, m] = period.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Due date for a period; the due day is clamped to the month's length. */
export function dueDateFor(period: string, dueDay: number): string {
  const day = Math.min(Math.max(1, dueDay), daysInMonth(period));
  return `${period}-${pad(day)}`;
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.parse(`${fromISO}T00:00:00Z`);
  const b = Date.parse(`${toISO}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** Inclusive list of periods from `start` to `end`. */
export function periodsBetween(start: string, end: string): string[] {
  const out: string[] = [];
  for (let p = start; p <= end; p = addMonths(p, 1)) out.push(p);
  return out;
}

export function periodStatus(input: {
  period: string;
  rent: number;
  dueDay: number;
  paid: number;
  today: string;
}): PeriodStatus {
  const dueDate = dueDateFor(input.period, input.dueDay);
  const balance = Math.max(0, input.rent - input.paid);
  const daysLate = daysBetween(dueDate, input.today);
  let status: RentStatus;
  if (balance === 0) status = 'paid';
  else if (daysLate > 0) status = 'overdue';
  else if (input.paid > 0) status = 'partial';
  else status = 'due';
  return { period: input.period, dueDate, rent: input.rent, paid: input.paid, balance, status, daysLate };
}

export interface LedgerTenant {
  rentAmount: number;
  dueDay: number;
  leaseStart: string;
  leaseEnd: string | null;
}

export interface LedgerPayment {
  period: string;
  amount: number;
}

/**
 * Builds a month-by-month ledger from the lease start up to the current
 * period (or the lease end, whichever comes first).
 */
export function tenantLedger(tenant: LedgerTenant, payments: LedgerPayment[], today: string): PeriodStatus[] {
  const first = periodOf(tenant.leaseStart);
  let last = periodOf(today);
  if (tenant.leaseEnd && periodOf(tenant.leaseEnd) < last) last = periodOf(tenant.leaseEnd);
  if (first > last) return [];

  const paidByPeriod = new Map<string, number>();
  for (const p of payments) paidByPeriod.set(p.period, (paidByPeriod.get(p.period) ?? 0) + p.amount);

  return periodsBetween(first, last).map((period) =>
    periodStatus({ period, rent: tenant.rentAmount, dueDay: tenant.dueDay, paid: paidByPeriod.get(period) ?? 0, today }),
  );
}

/** Total of all unpaid balances whose due date has passed. */
export function arrears(ledger: PeriodStatus[]): number {
  return ledger.filter((p) => p.status === 'overdue').reduce((sum, p) => sum + p.balance, 0);
}

export function buildReminderMessage(input: {
  tenantName: string;
  propertyName: string;
  unitLabel: string;
  amount: number;
  period: string;
  daysLate: number;
  landlordName: string;
  formatMoney: (n: number) => string;
  formatPeriod: (p: string) => string;
}): string {
  const first = input.tenantName.split(' ')[0];
  const lateText =
    input.daysLate > 0
      ? `is now ${input.daysLate} day${input.daysLate === 1 ? '' : 's'} overdue`
      : 'is due soon';
  return (
    `Hi ${first}, this is a friendly reminder that your rent of ${input.formatMoney(input.amount)} ` +
    `for ${input.formatPeriod(input.period)} at ${input.propertyName} (${input.unitLabel}) ${lateText}. ` +
    `Please make payment at your earliest convenience and share the receipt once done. ` +
    `Thank you. ${input.landlordName} (sent via Renta)`
  );
}
