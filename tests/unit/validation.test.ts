import { describe, expect, it } from 'vitest';
import { fieldErrors, paymentSchema, propertySchema, tenantSchema } from '@/lib/validation';

const tenant = {
  propertyId: '1',
  fullName: 'Chinedu Okeke',
  email: 'CHINEDU@Example.com ',
  phone: '+234 803 123 4567',
  unitLabel: 'Flat 1A',
  rentAmount: '450000',
  dueDay: '5',
  leaseStart: '2026-01-01',
  leaseEnd: '',
};

describe('validation', () => {
  it('coerces and normalises a valid tenant', () => {
    const r = tenantSchema.parse(tenant);
    expect(r.rentAmount).toBe(450000);
    expect(r.email).toBe('chinedu@example.com');
    expect(r.leaseEnd).toBeNull();
    expect(r.status).toBe('active');
  });

  it('rejects a due day outside 1 to 28 and a bad phone', () => {
    const r = tenantSchema.safeParse({ ...tenant, dueDay: '31', phone: 'abc' });
    expect(r.success).toBe(false);
    const errs = fieldErrors(r.error!);
    expect(errs.dueDay).toMatch(/1 and 28/);
    expect(errs.phone).toBeDefined();
  });

  it('rejects a lease end before the start', () => {
    const r = tenantSchema.safeParse({ ...tenant, leaseEnd: '2025-12-01' });
    expect(fieldErrors(r.error!).leaseEnd).toMatch(/after lease start/);
  });

  it('requires property basics', () => {
    const r = propertySchema.safeParse({ name: 'A', address: '', city: 'Lagos', type: 'castle', units: '0' });
    const errs = fieldErrors(r.error!);
    expect(Object.keys(errs).sort()).toEqual(['address', 'name', 'type', 'units']);
  });

  it('validates payments', () => {
    expect(paymentSchema.safeParse({ tenantId: '1', amount: '1000', period: '2026-10', paidOn: '2026-10-02', method: 'pos', reference: '' }).success).toBe(true);
    const bad = paymentSchema.safeParse({ tenantId: '1', amount: '-5', period: '2026-13', paidOn: 'x', method: 'cheque' });
    expect(Object.keys(fieldErrors(bad.error!)).sort()).toEqual(['amount', 'method', 'paidOn', 'period']);
  });
});
