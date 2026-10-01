import bcrypt from 'bcryptjs';
import { and, eq, sum } from 'drizzle-orm';
import type { Db } from '../db';
import { landlords, payments, properties, reminders, tenants } from '../db/schema';
import { formatPeriod, naira } from '../lib/format';
import { buildReminderMessage, tenantLedger } from '../lib/rent';
import {
  fieldErrors,
  loginSchema,
  paymentSchema,
  propertySchema,
  reminderSchema,
  tenantSchema,
  type FieldErrors,
} from '../lib/validation';
import { findProperty, findTenant, loadPortfolio, overdueList } from './portfolio';

export type Result<T = { id: number }> = ({ ok: true } & T) | { ok: false; errors: FieldErrors };

const fail = (errors: FieldErrors): { ok: false; errors: FieldErrors } => ({ ok: false, errors });

export async function authenticate(db: Db, input: unknown): Promise<Result<{ id: number; name: string }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fail(fieldErrors(parsed.error));
  const [user] = await db.select().from(landlords).where(eq(landlords.email, parsed.data.email));
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return fail({ form: 'Incorrect email or password' });
  }
  return { ok: true, id: user.id, name: user.name };
}

/* ---------------------------------- Properties ---------------------------------- */

export async function createProperty(db: Db, landlordId: number, input: unknown): Promise<Result> {
  const parsed = propertySchema.safeParse(input);
  if (!parsed.success) return fail(fieldErrors(parsed.error));
  const [row] = await db
    .insert(properties)
    .values({ ...parsed.data, landlordId })
    .returning({ id: properties.id });
  return { ok: true, id: row!.id };
}

export async function updateProperty(db: Db, landlordId: number, id: number, input: unknown): Promise<Result> {
  if (!(await findProperty(db, landlordId, id))) return fail({ form: 'Property not found' });
  const parsed = propertySchema.safeParse(input);
  if (!parsed.success) return fail(fieldErrors(parsed.error));
  await db.update(properties).set(parsed.data).where(eq(properties.id, id));
  return { ok: true, id };
}

export async function deleteProperty(db: Db, landlordId: number, id: number): Promise<Result> {
  if (!(await findProperty(db, landlordId, id))) return fail({ form: 'Property not found' });
  await db.delete(properties).where(eq(properties.id, id));
  return { ok: true, id };
}

/* ----------------------------------- Tenants ------------------------------------ */

export async function createTenant(db: Db, landlordId: number, input: unknown): Promise<Result> {
  const parsed = tenantSchema.safeParse(input);
  if (!parsed.success) return fail(fieldErrors(parsed.error));
  if (!(await findProperty(db, landlordId, parsed.data.propertyId))) return fail({ propertyId: 'Choose a property' });
  const [row] = await db.insert(tenants).values(parsed.data).returning({ id: tenants.id });
  return { ok: true, id: row!.id };
}

export async function updateTenant(db: Db, landlordId: number, id: number, input: unknown): Promise<Result> {
  if (!(await findTenant(db, landlordId, id))) return fail({ form: 'Tenant not found' });
  const parsed = tenantSchema.safeParse(input);
  if (!parsed.success) return fail(fieldErrors(parsed.error));
  if (!(await findProperty(db, landlordId, parsed.data.propertyId))) return fail({ propertyId: 'Choose a property' });
  await db.update(tenants).set(parsed.data).where(eq(tenants.id, id));
  return { ok: true, id };
}

export async function deleteTenant(db: Db, landlordId: number, id: number): Promise<Result> {
  if (!(await findTenant(db, landlordId, id))) return fail({ form: 'Tenant not found' });
  await db.delete(tenants).where(eq(tenants.id, id));
  return { ok: true, id };
}

/* ----------------------------------- Payments ----------------------------------- */

export async function recordPayment(db: Db, landlordId: number, input: unknown): Promise<Result> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return fail(fieldErrors(parsed.error));
  const data = parsed.data;
  const tenant = await findTenant(db, landlordId, data.tenantId);
  if (!tenant) return fail({ tenantId: 'Choose a tenant' });

  const [{ total }] = await db
    .select({ total: sum(payments.amount) })
    .from(payments)
    .where(and(eq(payments.tenantId, tenant.id), eq(payments.period, data.period)));
  const balance = tenant.rentAmount - Number(total ?? 0);
  if (balance <= 0) return fail({ period: `${formatPeriod(data.period)} is already fully paid` });
  if (data.amount > balance) return fail({ amount: `Only ${naira(balance)} is outstanding for ${formatPeriod(data.period)}` });

  const [row] = await db.insert(payments).values(data).returning({ id: payments.id });
  return { ok: true, id: row!.id };
}

export async function deletePayment(db: Db, landlordId: number, id: number): Promise<Result> {
  const [row] = await db.select().from(payments).where(eq(payments.id, id));
  if (!row || !(await findTenant(db, landlordId, row.tenantId))) return fail({ form: 'Payment not found' });
  await db.delete(payments).where(eq(payments.id, id));
  return { ok: true, id };
}

/* ---------------------------------- Reminders ----------------------------------- */

export async function sendReminder(
  db: Db,
  landlord: { id: number; name: string },
  tenantId: number,
  input: unknown,
  today: string,
): Promise<Result> {
  const parsed = reminderSchema.safeParse(input ?? {});
  if (!parsed.success) return fail(fieldErrors(parsed.error));
  const tenant = await findTenant(db, landlord.id, tenantId);
  if (!tenant) return fail({ form: 'Tenant not found' });

  const tenantPayments = await db.select().from(payments).where(eq(payments.tenantId, tenant.id));
  const ledger = tenantLedger(tenant, tenantPayments, today);
  const overdue = ledger.filter((l) => l.status === 'overdue');
  if (overdue.length === 0) return fail({ form: `${tenant.fullName} has no overdue rent` });

  const oldest = overdue[0]!;
  const amount = overdue.reduce((s, l) => s + l.balance, 0);
  const message = buildReminderMessage({
    tenantName: tenant.fullName,
    propertyName: tenant.property.name,
    unitLabel: tenant.unitLabel,
    amount,
    period: oldest.period,
    daysLate: oldest.daysLate,
    landlordName: landlord.name,
    formatMoney: naira,
    formatPeriod,
  });
  const [row] = await db
    .insert(reminders)
    .values({ tenantId: tenant.id, period: oldest.period, channel: parsed.data.channel, message, amountDue: amount })
    .returning({ id: reminders.id });
  return { ok: true, id: row!.id };
}

/** Reminds every tenant with overdue rent. Returns how many reminders were logged. */
export async function sendAllReminders(db: Db, landlord: { id: number; name: string }, today: string) {
  const overdue = overdueList(await loadPortfolio(db, landlord.id), today);
  let sent = 0;
  for (const o of overdue) {
    const r = await sendReminder(db, landlord, o.tenant.id, { channel: 'email' }, today);
    if (r.ok) sent++;
  }
  return sent;
}
