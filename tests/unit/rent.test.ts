import { describe, expect, it } from 'vitest';
import {
  addMonths,
  arrears,
  buildReminderMessage,
  daysBetween,
  dueDateFor,
  isValidPeriod,
  periodStatus,
  periodsBetween,
  tenantLedger,
} from '@/lib/rent';
import { formatPeriod, naira } from '@/lib/format';

describe('period helpers', () => {
  it('adds months across year boundaries', () => {
    expect(addMonths('2026-11', 1)).toBe('2026-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-03', -14)).toBe('2025-01');
  });

  it('lists periods inclusively', () => {
    expect(periodsBetween('2026-11', '2027-02')).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
    expect(periodsBetween('2026-05', '2026-04')).toEqual([]);
  });

  it('validates period strings', () => {
    expect(isValidPeriod('2026-10')).toBe(true);
    expect(isValidPeriod('2026-13')).toBe(false);
    expect(isValidPeriod('26-10')).toBe(false);
  });

  it('clamps the due day to the length of the month', () => {
    expect(dueDateFor('2026-02', 31)).toBe('2026-02-28');
    expect(dueDateFor('2028-02', 30)).toBe('2028-02-29');
    expect(dueDateFor('2026-10', 5)).toBe('2026-10-05');
  });

  it('counts days between ISO dates', () => {
    expect(daysBetween('2026-10-01', '2026-10-14')).toBe(13);
    expect(daysBetween('2026-10-14', '2026-10-01')).toBe(-13);
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
  });
});

describe('periodStatus', () => {
  const base = { period: '2026-10', rent: 100_000, dueDay: 5 };

  it('is paid when the full rent is covered', () => {
    expect(periodStatus({ ...base, paid: 100_000, today: '2026-10-20' }).status).toBe('paid');
  });

  it('is upcoming (due) before the due date with nothing paid', () => {
    const s = periodStatus({ ...base, paid: 0, today: '2026-10-02' });
    expect(s.status).toBe('due');
    expect(s.daysLate).toBe(-3);
  });

  it('is not overdue on the due date itself', () => {
    expect(periodStatus({ ...base, paid: 0, today: '2026-10-05' }).status).toBe('due');
  });

  it('is overdue the day after the due date', () => {
    const s = periodStatus({ ...base, paid: 0, today: '2026-10-06' });
    expect(s.status).toBe('overdue');
    expect(s.daysLate).toBe(1);
    expect(s.balance).toBe(100_000);
  });

  it('is partial when part-paid before the due date, overdue after', () => {
    expect(periodStatus({ ...base, paid: 40_000, today: '2026-10-01' }).status).toBe('partial');
    const late = periodStatus({ ...base, paid: 40_000, today: '2026-10-09' });
    expect(late.status).toBe('overdue');
    expect(late.balance).toBe(60_000);
  });

  it('never reports a negative balance', () => {
    expect(periodStatus({ ...base, paid: 150_000, today: '2026-10-09' }).balance).toBe(0);
  });
});

describe('tenantLedger & arrears', () => {
  const tenant = { rentAmount: 200_000, dueDay: 1, leaseStart: '2026-07-15', leaseEnd: null };

  it('builds a month for each period from lease start to today', () => {
    const ledger = tenantLedger(tenant, [], '2026-10-14');
    expect(ledger.map((l) => l.period)).toEqual(['2026-07', '2026-08', '2026-09', '2026-10']);
  });

  it('sums multiple payments in one period and computes arrears', () => {
    const ledger = tenantLedger(
      tenant,
      [
        { period: '2026-07', amount: 200_000 },
        { period: '2026-08', amount: 120_000 },
        { period: '2026-08', amount: 80_000 },
        { period: '2026-09', amount: 50_000 },
      ],
      '2026-10-14',
    );
    expect(ledger.map((l) => l.status)).toEqual(['paid', 'paid', 'overdue', 'overdue']);
    expect(arrears(ledger)).toBe(150_000 + 200_000);
  });

  it('stops at the lease end', () => {
    const ledger = tenantLedger({ ...tenant, leaseEnd: '2026-08-31' }, [], '2026-10-14');
    expect(ledger.map((l) => l.period)).toEqual(['2026-07', '2026-08']);
  });

  it('is empty for a lease that has not started', () => {
    expect(tenantLedger({ ...tenant, leaseStart: '2026-12-01' }, [], '2026-10-14')).toEqual([]);
  });
});

describe('buildReminderMessage', () => {
  it('writes a polite, specific reminder', () => {
    const msg = buildReminderMessage({
      tenantName: 'Amaka Nwosu',
      propertyName: 'Lekki Pearl Residences',
      unitLabel: 'Flat 1B',
      amount: 450_000,
      period: '2026-10',
      daysLate: 1,
      landlordName: 'Adaeze Okafor',
      formatMoney: naira,
      formatPeriod,
    });
    expect(msg).toContain('Hi Amaka');
    expect(msg).toContain('₦450,000');
    expect(msg).toContain('October 2026');
    expect(msg).toContain('1 day overdue');
    expect(msg).toContain('Adaeze Okafor (sent via Renta)');
  });
});
