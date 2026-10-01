import { and, desc, eq, inArray } from 'drizzle-orm';
import type { Db } from '../db';
import { payments, properties, reminders, tenants, type Payment, type Property, type Reminder, type Tenant } from '../db/schema';
import { addMonths, arrears, periodOf, periodStatus, tenantLedger, type PeriodStatus } from '../lib/rent';

export type TenantWithProperty = Tenant & { property: Property };

export interface Portfolio {
  properties: Property[];
  tenants: TenantWithProperty[];
  payments: Payment[];
  reminders: Reminder[];
}

/** Loads everything a landlord owns. Portfolios are small, so we compute in memory. */
export async function loadPortfolio(db: Db, landlordId: number): Promise<Portfolio> {
  const props = await db.select().from(properties).where(eq(properties.landlordId, landlordId)).orderBy(properties.name);
  const propIds = props.map((p) => p.id);
  if (propIds.length === 0) return { properties: [], tenants: [], payments: [], reminders: [] };

  const tenantRows = await db.select().from(tenants).where(inArray(tenants.propertyId, propIds)).orderBy(tenants.fullName);
  const byId = new Map(props.map((p) => [p.id, p]));
  const tenantList = tenantRows.map((t) => ({ ...t, property: byId.get(t.propertyId)! }));
  const tenantIds = tenantList.map((t) => t.id);
  if (tenantIds.length === 0) return { properties: props, tenants: [], payments: [], reminders: [] };

  const [paymentRows, reminderRows] = await Promise.all([
    db.select().from(payments).where(inArray(payments.tenantId, tenantIds)).orderBy(desc(payments.paidOn), desc(payments.id)),
    db.select().from(reminders).where(inArray(reminders.tenantId, tenantIds)).orderBy(desc(reminders.sentAt)),
  ]);
  return { properties: props, tenants: tenantList, payments: paymentRows, reminders: reminderRows };
}

/** Is the tenant's lease active during the given period? */
export function leaseCovers(t: Tenant, period: string): boolean {
  if (periodOf(t.leaseStart) > period) return false;
  if (t.leaseEnd && periodOf(t.leaseEnd) < period) return false;
  return t.status === 'active' || (t.leaseEnd !== null && periodOf(t.leaseEnd) >= period);
}

export interface RentRollRow {
  tenant: TenantWithProperty;
  status: PeriodStatus;
  lastReminder: Reminder | null;
}

export function rentRoll(p: Portfolio, period: string, today: string): RentRollRow[] {
  return p.tenants
    .filter((t) => leaseCovers(t, period))
    .map((t) => {
      const paid = p.payments
        .filter((x) => x.tenantId === t.id && x.period === period)
        .reduce((s, x) => s + x.amount, 0);
      return {
        tenant: t,
        status: periodStatus({ period, rent: t.rentAmount, dueDay: t.dueDay, paid, today }),
        lastReminder: p.reminders.find((r) => r.tenantId === t.id && r.period === period) ?? null,
      };
    })
    .sort((a, b) => a.status.dueDate.localeCompare(b.status.dueDate) || a.tenant.fullName.localeCompare(b.tenant.fullName));
}

export interface OverdueItem {
  tenant: TenantWithProperty;
  /** Total unpaid across all overdue months. */
  amount: number;
  /** The oldest overdue month, used for the reminder. */
  oldest: PeriodStatus;
  months: number;
  lastReminder: Reminder | null;
}

export function overdueList(p: Portfolio, today: string): OverdueItem[] {
  const out: OverdueItem[] = [];
  for (const t of p.tenants) {
    if (t.status !== 'active') continue;
    const ledger = tenantLedger(t, p.payments.filter((x) => x.tenantId === t.id), today);
    const overdue = ledger.filter((l) => l.status === 'overdue');
    if (overdue.length === 0) continue;
    out.push({
      tenant: t,
      amount: arrears(ledger),
      oldest: overdue[0]!,
      months: overdue.length,
      lastReminder: p.reminders.find((r) => r.tenantId === t.id) ?? null,
    });
  }
  return out.sort((a, b) => b.oldest.daysLate - a.oldest.daysLate);
}

export interface DashboardStats {
  period: string;
  propertyCount: number;
  unitCount: number;
  activeTenants: number;
  occupancy: number;
  expected: number;
  collected: number;
  collectionRate: number;
  overdueAmount: number;
  overdue: OverdueItem[];
  upcoming: RentRollRow[];
  chart: { period: string; expected: number; collected: number }[];
  recentPayments: (Payment & { tenant: TenantWithProperty })[];
}

export function dashboardStats(p: Portfolio, today: string): DashboardStats {
  const period = periodOf(today);
  const roll = rentRoll(p, period, today);
  const unitCount = p.properties.reduce((s, x) => s + x.units, 0);
  const activeTenants = p.tenants.filter((t) => t.status === 'active').length;
  const expected = roll.reduce((s, r) => s + r.tenant.rentAmount, 0);
  const collected = roll.reduce((s, r) => s + Math.min(r.status.paid, r.tenant.rentAmount), 0);
  const overdue = overdueList(p, today);

  const chart = [];
  for (let i = 5; i >= 0; i--) {
    const per = addMonths(period, -i);
    const r = rentRoll(p, per, today);
    chart.push({
      period: per,
      expected: r.reduce((s, x) => s + x.tenant.rentAmount, 0),
      collected: r.reduce((s, x) => s + Math.min(x.status.paid, x.tenant.rentAmount), 0),
    });
  }

  const tenantById = new Map(p.tenants.map((t) => [t.id, t]));
  return {
    period,
    propertyCount: p.properties.length,
    unitCount,
    activeTenants,
    occupancy: unitCount ? Math.round((activeTenants / unitCount) * 100) : 0,
    expected,
    collected,
    collectionRate: expected ? Math.round((collected / expected) * 100) : 0,
    overdueAmount: overdue.reduce((s, o) => s + o.amount, 0),
    overdue,
    upcoming: roll.filter((r) => r.status.status !== 'paid' && r.status.daysLate <= 0 && r.status.daysLate >= -10),
    chart,
    recentPayments: p.payments.slice(0, 6).map((x) => ({ ...x, tenant: tenantById.get(x.tenantId)! })),
  };
}

/** Ownership guards: every lookup is scoped to the signed-in landlord. */
export async function findProperty(db: Db, landlordId: number, id: number) {
  const [row] = await db
    .select()
    .from(properties)
    .where(and(eq(properties.id, id), eq(properties.landlordId, landlordId)));
  return row ?? null;
}

export async function findTenant(db: Db, landlordId: number, id: number): Promise<TenantWithProperty | null> {
  const [row] = await db
    .select({ tenant: tenants, property: properties })
    .from(tenants)
    .innerJoin(properties, eq(tenants.propertyId, properties.id))
    .where(and(eq(tenants.id, id), eq(properties.landlordId, landlordId)));
  return row ? { ...row.tenant, property: row.property } : null;
}
