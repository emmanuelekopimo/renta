import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date');
const money = z.coerce.number().int('Whole Naira only').positive('Must be greater than 0').max(1_000_000_000);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const PROPERTY_IMAGES = ['home-1', 'home-2', 'home-3', 'home-4', 'home-5', 'home-6'] as const;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

export const propertySchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(120),
  address: z.string().trim().min(3, 'Address is required').max(200),
  city: z.string().trim().min(2, 'City is required').max(80),
  type: z.enum(['apartment', 'house', 'duplex', 'studio', 'shop']),
  units: z.coerce.number().int().min(1, 'At least 1 unit').max(500),
  image: z.enum(PROPERTY_IMAGES).default('home-1'),
});

export const tenantSchema = z
  .object({
    propertyId: z.coerce.number().int().positive('Choose a property'),
    fullName: z.string().trim().min(3, 'Full name is required').max(120),
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
    phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, 'Enter a valid phone number'),
    unitLabel: z.string().trim().min(1, 'Unit is required').max(40),
    rentAmount: money,
    dueDay: z.coerce.number().int().min(1, 'Between 1 and 28').max(28, 'Between 1 and 28'),
    leaseStart: isoDate,
    leaseEnd: z
      .union([isoDate, z.literal('')])
      .optional()
      .transform((v) => (v ? v : null)),
    status: z.enum(['active', 'moved_out']).default('active'),
  })
  .refine((t) => !t.leaseEnd || t.leaseEnd > t.leaseStart, {
    message: 'Lease end must be after lease start',
    path: ['leaseEnd'],
  });

export const paymentSchema = z.object({
  tenantId: z.coerce.number().int().positive('Choose a tenant'),
  amount: money,
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Choose a rent month'),
  paidOn: isoDate,
  method: z.enum(['transfer', 'cash', 'card', 'pos']),
  reference: optionalText(80),
});

export const reminderSchema = z.object({
  channel: z.enum(['email', 'sms', 'whatsapp']).default('email'),
});

export type FieldErrors = Record<string, string>;

export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
