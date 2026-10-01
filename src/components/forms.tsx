'use client';

import { useActionState, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2, LogIn, Save, Trash2, Wallet } from 'lucide-react';
import {
  loginAction,
  recordPaymentAction,
  savePropertyAction,
  saveTenantAction,
  type FormState,
} from '@/app/actions';

const initial: FormState = { errors: {}, values: {} };

function Submit({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-block" type="submit" disabled={pending} data-testid="submit">
      {pending ? <Loader2 className="icon spin" /> : icon}
      {children}
    </button>
  );
}

function Field(props: {
  name: string;
  label: string;
  state: FormState;
  defaultValue?: string | number | null;
  type?: string;
  full?: boolean;
  hint?: string;
  children?: ReactNode;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  const err = props.state.errors[props.name];
  const value = props.state.values[props.name] ?? props.defaultValue ?? '';
  return (
    <div className={`field ${props.full ? 'full' : ''} ${err ? 'error' : ''}`}>
      <label htmlFor={props.name}>{props.label}</label>
      {props.children ?? (
        <input
          id={props.name}
          name={props.name}
          className="input"
          type={props.type ?? 'text'}
          defaultValue={value}
          key={String(value)}
          {...props.inputProps}
        />
      )}
      {err ? <span className="err" data-testid={`err-${props.name}`}>{err}</span> : props.hint && <span className="hint">{props.hint}</span>}
    </div>
  );
}

function Select(props: {
  name: string;
  state: FormState;
  defaultValue?: string | number | null;
  options: { value: string | number; label: string }[];
  placeholder?: string;
}) {
  const value = props.state.values[props.name] ?? props.defaultValue ?? '';
  return (
    <select id={props.name} name={props.name} className="input" defaultValue={String(value)} key={String(value)}>
      {props.placeholder && <option value="">{props.placeholder}</option>}
      {props.options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function FormError({ state }: { state: FormState }) {
  return state.errors.form ? <div className="form-error">{state.errors.form}</div> : null;
}

/* ------------------------------------ Login ----------------------------------- */

export function LoginForm() {
  const [state, action] = useActionState(loginAction, initial);
  return (
    <form action={action} className="form">
      <FormError state={state} />
      <Field name="email" label="Email" type="email" state={state} defaultValue="demo@renta.app" inputProps={{ autoComplete: 'email' }} />
      <Field name="password" label="Password" type="password" state={state} defaultValue="renta123" inputProps={{ autoComplete: 'current-password' }} />
      <Submit icon={<LogIn className="icon" />}>Sign in</Submit>
    </form>
  );
}

/* ---------------------------------- Property ---------------------------------- */

const TYPES = [
  { value: 'apartment', label: 'Apartment block' },
  { value: 'house', label: 'House / Villa' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'studio', label: 'Studio / Lofts' },
  { value: 'shop', label: 'Shop / Commercial' },
];

export interface PropertyDefaults {
  id?: number;
  name?: string;
  address?: string;
  city?: string;
  type?: string;
  units?: number;
  image?: string;
}

export function PropertyForm({ property }: { property?: PropertyDefaults }) {
  const [state, action] = useActionState(savePropertyAction, initial);
  const p = property ?? {};
  const image = state.values.image ?? p.image ?? 'home-1';
  return (
    <form action={action} className="form">
      <FormError state={state} />
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <div className="form-grid">
        <Field name="name" label="Property name" state={state} defaultValue={p.name} full inputProps={{ placeholder: 'e.g. Lekki Pearl Residences' }} />
        <Field name="address" label="Street address" state={state} defaultValue={p.address} full />
        <Field name="city" label="City" state={state} defaultValue={p.city} />
        <Field name="units" label="Number of units" type="number" state={state} defaultValue={p.units ?? 1} inputProps={{ min: 1 }} />
        <Field name="type" label="Property type" state={state} full>
          <Select name="type" state={state} defaultValue={p.type ?? 'apartment'} options={TYPES} />
        </Field>
        <Field name="image" label="Cover illustration" state={state} full>
          <div className="image-picker" key={image}>
            {['home-1', 'home-2', 'home-3', 'home-4', 'home-5', 'home-6'].map((k) => (
              <label key={k}>
                <input type="radio" name="image" value={k} defaultChecked={k === image} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/img/properties/${k}.svg`} alt={`Cover ${k}`} />
              </label>
            ))}
          </div>
        </Field>
      </div>
      <Submit icon={<Save className="icon" />}>{p.id ? 'Save changes' : 'Add property'}</Submit>
    </form>
  );
}

/* ----------------------------------- Tenant ----------------------------------- */

export interface TenantDefaults {
  id?: number;
  propertyId?: number;
  fullName?: string;
  email?: string;
  phone?: string;
  unitLabel?: string;
  rentAmount?: number;
  dueDay?: number;
  leaseStart?: string;
  leaseEnd?: string | null;
  status?: string;
}

export function TenantForm(props: { tenant?: TenantDefaults; properties: { id: number; name: string }[]; today: string }) {
  const [state, action] = useActionState(saveTenantAction, initial);
  const t = props.tenant ?? {};
  return (
    <form action={action} className="form">
      <FormError state={state} />
      {t.id && <input type="hidden" name="id" value={t.id} />}
      <div className="form-grid">
        <Field name="fullName" label="Full name" state={state} defaultValue={t.fullName} full />
        <Field name="email" label="Email" type="email" state={state} defaultValue={t.email} />
        <Field name="phone" label="Phone" type="tel" state={state} defaultValue={t.phone} inputProps={{ placeholder: '+234 803 000 0000' }} />
        <Field name="propertyId" label="Property" state={state}>
          <Select
            name="propertyId"
            state={state}
            defaultValue={t.propertyId}
            placeholder="Choose a property"
            options={props.properties.map((p) => ({ value: p.id, label: p.name }))}
          />
        </Field>
        <Field name="unitLabel" label="Unit / Flat" state={state} defaultValue={t.unitLabel} inputProps={{ placeholder: 'e.g. Flat 2B' }} />
        <Field name="rentAmount" label="Monthly rent (₦)" type="number" state={state} defaultValue={t.rentAmount} inputProps={{ min: 1 }} />
        <Field name="dueDay" label="Rent due day" type="number" state={state} defaultValue={t.dueDay ?? 1} hint="Day of each month (1 to 28)" inputProps={{ min: 1, max: 28 }} />
        <Field name="leaseStart" label="Lease start" type="date" state={state} defaultValue={t.leaseStart ?? props.today} />
        <Field name="leaseEnd" label="Lease end (optional)" type="date" state={state} defaultValue={t.leaseEnd} />
        {t.id && (
          <Field name="status" label="Status" state={state} full>
            <Select
              name="status"
              state={state}
              defaultValue={t.status}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'moved_out', label: 'Moved out' },
              ]}
            />
          </Field>
        )}
      </div>
      <Submit icon={<Save className="icon" />}>{t.id ? 'Save changes' : 'Add tenant'}</Submit>
    </form>
  );
}

/* ----------------------------------- Payment ---------------------------------- */

export interface PaymentTenantOption {
  id: number;
  label: string;
  rent: number;
}

export function PaymentForm(props: {
  tenants: PaymentTenantOption[];
  tenantId?: number;
  period: string;
  amount?: number;
  today: string;
  back?: string;
}) {
  const [state, action] = useActionState(recordPaymentAction, initial);
  const [tenantId, setTenantId] = useState(String(state.values.tenantId ?? props.tenantId ?? ''));
  const selected = props.tenants.find((t) => String(t.id) === tenantId);
  return (
    <form action={action} className="form">
      <FormError state={state} />
      {props.back && <input type="hidden" name="back" value={props.back} />}
      <div className="form-grid">
        <Field name="tenantId" label="Tenant" state={state} full>
          <select
            id="tenantId"
            name="tenantId"
            className="input"
            defaultValue={tenantId}
            key={`${tenantId}-${Object.keys(state.errors).join()}`}
            onChange={(e) => setTenantId(e.target.value)}
          >
            <option value="">Choose a tenant</option>
            {props.tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          name="amount"
          label="Amount (₦)"
          type="number"
          state={state}
          defaultValue={props.amount ?? selected?.rent}
          hint={selected ? `Monthly rent: ₦${selected.rent.toLocaleString('en-US')}` : undefined}
          inputProps={{ min: 1 }}
        />
        <Field name="period" label="Rent month" type="month" state={state} defaultValue={props.period} />
        <Field name="paidOn" label="Date paid" type="date" state={state} defaultValue={props.today} />
        <Field name="method" label="Method" state={state}>
          <Select
            name="method"
            state={state}
            defaultValue="transfer"
            options={[
              { value: 'transfer', label: 'Bank transfer' },
              { value: 'pos', label: 'POS' },
              { value: 'cash', label: 'Cash' },
              { value: 'card', label: 'Card' },
            ]}
          />
        </Field>
        <Field name="reference" label="Reference (optional)" state={state} full inputProps={{ placeholder: 'e.g. TRF-20261005' }} />
      </div>
      <Submit icon={<Wallet className="icon" />}>Record payment</Submit>
    </form>
  );
}

/* ----------------------------------- Delete ----------------------------------- */

export function DeleteButton({ action, id, label, confirmText }: { action: (fd: FormData) => Promise<void>; id: number; label: string; confirmText: string }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="btn btn-danger btn-sm" type="submit" data-testid="delete">
        <Trash2 className="icon" />
        {label}
      </button>
    </form>
  );
}
