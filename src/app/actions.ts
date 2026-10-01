'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getDb } from '@/db/client';
import * as cmd from '@/services/commands';
import { createSession, destroySession, requireSession } from '@/lib/session';
import { getToday } from '@/lib/today';
import type { FieldErrors } from '@/lib/validation';

export interface FormState {
  errors: FieldErrors;
  values: Record<string, string>;
}

const values = (fd: FormData) =>
  Object.fromEntries([...fd.entries()].filter(([k]) => !k.startsWith('$')).map(([k, v]) => [k, String(v)]));

const done = (to: string, toast: string): never => {
  revalidatePath('/', 'layout');
  redirect(`${to}${to.includes('?') ? '&' : '?'}toast=${encodeURIComponent(toast)}`);
};

/* ------------------------------------ Auth ------------------------------------ */

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const input = values(fd);
  const res = await cmd.authenticate(getDb(), input);
  if (!res.ok) return { errors: res.errors, values: { email: input.email ?? '' } };
  await createSession({ landlordId: res.id, name: res.name });
  redirect('/');
}

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}

/* --------------------------------- Properties --------------------------------- */

export async function savePropertyAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireSession();
  const input = values(fd);
  const id = Number(input.id);
  const res = id
    ? await cmd.updateProperty(getDb(), s.landlordId, id, input)
    : await cmd.createProperty(getDb(), s.landlordId, input);
  if (!res.ok) return { errors: res.errors, values: input };
  return done(`/properties/${res.id}`, id ? 'Property updated' : 'Property added');
}

export async function deletePropertyAction(fd: FormData) {
  const s = await requireSession();
  await cmd.deleteProperty(getDb(), s.landlordId, Number(fd.get('id')));
  done('/properties', 'Property deleted');
}

/* ----------------------------------- Tenants ---------------------------------- */

export async function saveTenantAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireSession();
  const input = values(fd);
  const id = Number(input.id);
  const res = id
    ? await cmd.updateTenant(getDb(), s.landlordId, id, input)
    : await cmd.createTenant(getDb(), s.landlordId, input);
  if (!res.ok) return { errors: res.errors, values: input };
  return done(`/tenants/${res.id}`, id ? 'Tenant updated' : 'Tenant added');
}

export async function deleteTenantAction(fd: FormData) {
  const s = await requireSession();
  await cmd.deleteTenant(getDb(), s.landlordId, Number(fd.get('id')));
  done('/tenants', 'Tenant removed');
}

/* ---------------------------------- Payments ---------------------------------- */

export async function recordPaymentAction(_: FormState, fd: FormData): Promise<FormState> {
  const s = await requireSession();
  const input = values(fd);
  const res = await cmd.recordPayment(getDb(), s.landlordId, input);
  if (!res.ok) return { errors: res.errors, values: input };
  const back = input.back && input.back.startsWith('/') ? input.back : `/payments/${res.id}/receipt`;
  return done(back, 'Payment recorded');
}

export async function deletePaymentAction(fd: FormData) {
  const s = await requireSession();
  await cmd.deletePayment(getDb(), s.landlordId, Number(fd.get('id')));
  done('/payments', 'Payment deleted');
}

/* --------------------------------- Reminders ---------------------------------- */

export async function sendReminderAction(fd: FormData) {
  const s = await requireSession();
  const back = String(fd.get('back') ?? '/reminders');
  const res = await cmd.sendReminder(
    getDb(),
    { id: s.landlordId, name: s.name },
    Number(fd.get('tenantId')),
    { channel: String(fd.get('channel') ?? 'email') },
    getToday(),
  );
  done(back.startsWith('/') ? back : '/reminders', res.ok ? 'Reminder sent' : (res.errors.form ?? 'Could not send reminder'));
}

export async function sendAllRemindersAction() {
  const s = await requireSession();
  const sent = await cmd.sendAllReminders(getDb(), { id: s.landlordId, name: s.name }, getToday());
  done('/reminders', sent ? `${sent} reminder${sent === 1 ? '' : 's'} sent` : 'Nobody is overdue');
}
