import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { Pool } from 'pg';
import type { Db } from '@/db';
import { landlords, payments, properties, reminders, tenants } from '@/db/schema';
import { DEMO_EMAIL, DEMO_PASSWORD } from '@/db/seed';
import * as cmd from '@/services/commands';
import { dashboardStats, loadPortfolio, overdueList, rentRoll } from '@/services/portfolio';
import { freshDb, TODAY } from './setup';

let db: Db;
let pool: Pool;
let landlordId: number;
const landlord = () => ({ id: landlordId, name: 'Adaeze Okafor' });

beforeEach(async () => {
  if (pool) await pool.end();
  ({ db, pool, landlordId } = await freshDb());
});
afterAll(async () => pool?.end());

async function tenantByName(name: string) {
  const [t] = await db.select().from(tenants).where(eq(tenants.fullName, name));
  return t!;
}

describe('seed data', () => {
  it('creates a realistic portfolio', async () => {
    const p = await loadPortfolio(db, landlordId);
    expect(p.properties).toHaveLength(5);
    expect(p.tenants).toHaveLength(13);
    expect(p.payments.length).toBeGreaterThan(100);
    const overdue = overdueList(p, TODAY);
    expect(overdue.map((o) => o.tenant.fullName)).toContain('Emeka Obi');
    expect(overdue.find((o) => o.tenant.fullName === 'Emeka Obi')!.months).toBe(2);
  });
});

describe('authentication', () => {
  it('accepts the demo credentials', async () => {
    const r = await cmd.authenticate(db, { email: DEMO_EMAIL, password: DEMO_PASSWORD });
    expect(r).toMatchObject({ ok: true, name: 'Adaeze Okafor' });
  });
  it('rejects a wrong password without revealing which field', async () => {
    const r = await cmd.authenticate(db, { email: DEMO_EMAIL, password: 'nope' });
    expect(r).toEqual({ ok: false, errors: { form: 'Incorrect email or password' } });
  });
});

describe('properties', () => {
  it('creates, updates and deletes a property', async () => {
    const created = await cmd.createProperty(db, landlordId, { name: 'Surulere Flats', address: '3 Bode Thomas St', city: 'Lagos', type: 'apartment', units: '4', image: 'home-6' });
    expect(created.ok).toBe(true);
    const id = (created as { id: number }).id;

    const updated = await cmd.updateProperty(db, landlordId, id, { name: 'Surulere Heights', address: '3 Bode Thomas St', city: 'Lagos', type: 'apartment', units: '5', image: 'home-6' });
    expect(updated.ok).toBe(true);
    const [row] = await db.select().from(properties).where(eq(properties.id, id));
    expect(row).toMatchObject({ name: 'Surulere Heights', units: 5 });

    expect((await cmd.deleteProperty(db, landlordId, id)).ok).toBe(true);
    expect(await db.select().from(properties).where(eq(properties.id, id))).toHaveLength(0);
  });

  it('returns field errors for invalid input', async () => {
    const r = await cmd.createProperty(db, landlordId, { name: '', address: '', city: '', type: 'apartment', units: '0' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors)).toEqual(expect.arrayContaining(['name', 'address', 'city', 'units']));
  });

  it("cannot touch another landlord's property", async () => {
    const [other] = await db.insert(landlords).values({ name: 'Other', email: 'other@x.com', passwordHash: 'x' }).returning();
    const [theirs] = await db.insert(properties).values({ landlordId: other!.id, name: 'Theirs', address: 'a', city: 'b' }).returning();
    expect((await cmd.deleteProperty(db, landlordId, theirs!.id)).ok).toBe(false);
    expect(await db.select().from(properties).where(eq(properties.id, theirs!.id))).toHaveLength(1);
    const r = await cmd.createTenant(db, landlordId, {
      propertyId: String(theirs!.id), fullName: 'Sneaky Person', email: 's@x.com', phone: '08030000000',
      unitLabel: '1', rentAmount: '1000', dueDay: '1', leaseStart: '2026-01-01',
    });
    expect(r).toEqual({ ok: false, errors: { propertyId: 'Choose a property' } });
  });

  it('cascades deletes to tenants and payments', async () => {
    const t = await tenantByName('Ngozi Eze');
    await cmd.deleteProperty(db, landlordId, t.propertyId);
    expect(await db.select().from(payments).where(eq(payments.tenantId, t.id))).toHaveLength(0);
  });
});

describe('tenants', () => {
  it('adds a tenant who then appears on the rent roll', async () => {
    const [prop] = await db.select().from(properties).where(eq(properties.name, 'Lekki Pearl Residences'));
    const r = await cmd.createTenant(db, landlordId, {
      propertyId: String(prop!.id), fullName: 'Yetunde Afolabi', email: 'yetunde@example.com', phone: '+234 809 555 0101',
      unitLabel: 'Flat 3B', rentAmount: '500000', dueDay: '25', leaseStart: '2026-10-01', leaseEnd: '2027-09-30',
    });
    expect(r.ok).toBe(true);
    const roll = rentRoll(await loadPortfolio(db, landlordId), '2026-10', TODAY);
    const row = roll.find((x) => x.tenant.fullName === 'Yetunde Afolabi')!;
    expect(row.status).toMatchObject({ status: 'due', balance: 500000, dueDate: '2026-10-25', daysLate: -11 });
  });

  it('marks a tenant as moved out, removing them from the overdue list', async () => {
    const t = await tenantByName('David Okon');
    const r = await cmd.updateTenant(db, landlordId, t.id, {
      propertyId: String(t.propertyId), fullName: t.fullName, email: t.email, phone: t.phone, unitLabel: t.unitLabel,
      rentAmount: String(t.rentAmount), dueDay: String(t.dueDay), leaseStart: t.leaseStart, leaseEnd: '2026-09-30', status: 'moved_out',
    });
    expect(r.ok).toBe(true);
    const overdue = overdueList(await loadPortfolio(db, landlordId), TODAY);
    expect(overdue.map((o) => o.tenant.fullName)).not.toContain('David Okon');
  });
});

describe('payments', () => {
  it('records a payment that clears an overdue month', async () => {
    const t = await tenantByName('Amaka Nwosu');
    const before = overdueList(await loadPortfolio(db, landlordId), TODAY).find((o) => o.tenant.id === t.id);
    expect(before?.amount).toBe(450000);

    const r = await cmd.recordPayment(db, landlordId, { tenantId: String(t.id), amount: '450000', period: '2026-10', paidOn: TODAY, method: 'transfer', reference: 'TRF-1' });
    expect(r.ok).toBe(true);
    const after = overdueList(await loadPortfolio(db, landlordId), TODAY).find((o) => o.tenant.id === t.id);
    expect(after).toBeUndefined();
  });

  it('supports part payments and blocks overpaying a month', async () => {
    const t = await tenantByName('Amaka Nwosu');
    const pay = (amount: string) =>
      cmd.recordPayment(db, landlordId, { tenantId: String(t.id), amount, period: '2026-10', paidOn: TODAY, method: 'cash' });
    expect((await pay('200000')).ok).toBe(true);
    const roll = rentRoll(await loadPortfolio(db, landlordId), '2026-10', TODAY);
    expect(roll.find((x) => x.tenant.id === t.id)!.status).toMatchObject({ paid: 200000, balance: 250000, status: 'overdue' });

    const over = await pay('300000');
    expect(over).toEqual({ ok: false, errors: { amount: 'Only ₦250,000 is outstanding for October 2026' } });
    expect((await pay('250000')).ok).toBe(true);
    expect(await pay('1000')).toEqual({ ok: false, errors: { period: 'October 2026 is already fully paid' } });
  });

  it('deletes a payment', async () => {
    const [p] = await db.select().from(payments).limit(1);
    expect((await cmd.deletePayment(db, landlordId, p!.id)).ok).toBe(true);
    expect((await cmd.deletePayment(db, landlordId, p!.id)).ok).toBe(false);
  });
});

describe('reminders', () => {
  it('logs a reminder with the full overdue amount', async () => {
    const t = await tenantByName('Emeka Obi');
    const r = await cmd.sendReminder(db, landlord(), t.id, { channel: 'sms' }, TODAY);
    expect(r.ok).toBe(true);
    const [row] = await db.select().from(reminders).where(eq(reminders.id, (r as { id: number }).id));
    expect(row).toMatchObject({ channel: 'sms', amountDue: 1_500_000, period: '2026-09' });
    expect(row!.message).toContain('₦1,500,000');
    expect(row!.message).toContain('41 days overdue');
  });

  it('refuses to remind a tenant who is up to date', async () => {
    const t = await tenantByName('Chinedu Okeke');
    expect(await cmd.sendReminder(db, landlord(), t.id, {}, TODAY)).toEqual({ ok: false, errors: { form: 'Chinedu Okeke has no overdue rent' } });
  });

  it('reminds everyone overdue in one go', async () => {
    const expected = overdueList(await loadPortfolio(db, landlordId), TODAY).length;
    expect(expected).toBeGreaterThan(0);
    expect(await cmd.sendAllReminders(db, landlord(), TODAY)).toBe(expected);
  });
});

describe('dashboard', () => {
  it('summarises the month consistently', async () => {
    const s = dashboardStats(await loadPortfolio(db, landlordId), TODAY);
    expect(s.period).toBe('2026-10');
    expect(s.propertyCount).toBe(5);
    expect(s.unitCount).toBe(17);
    expect(s.activeTenants).toBe(13);
    expect(s.collected).toBeLessThanOrEqual(s.expected);
    expect(s.chart).toHaveLength(6);
    expect(s.overdueAmount).toBe(s.overdue.reduce((n, o) => n + o.amount, 0));
  });
});
