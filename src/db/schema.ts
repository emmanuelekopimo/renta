import { relations } from 'drizzle-orm';
import {
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

export const propertyTypeEnum = pgEnum('property_type', [
  'apartment',
  'house',
  'duplex',
  'studio',
  'shop',
]);

export const tenantStatusEnum = pgEnum('tenant_status', ['active', 'moved_out']);

export const paymentMethodEnum = pgEnum('payment_method', ['transfer', 'cash', 'card', 'pos']);

export const reminderChannelEnum = pgEnum('reminder_channel', ['email', 'sms', 'whatsapp']);

export const landlords = pgTable(
  'landlords',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    email: varchar('email', { length: 160 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('landlords_email_idx').on(t.email)],
);

export const properties = pgTable(
  'properties',
  {
    id: serial('id').primaryKey(),
    landlordId: integer('landlord_id')
      .notNull()
      .references(() => landlords.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 120 }).notNull(),
    address: varchar('address', { length: 200 }).notNull(),
    city: varchar('city', { length: 80 }).notNull(),
    type: propertyTypeEnum('type').notNull().default('apartment'),
    units: integer('units').notNull().default(1),
    image: varchar('image', { length: 40 }).notNull().default('home-1'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('properties_landlord_idx').on(t.landlordId)],
);

export const tenants = pgTable(
  'tenants',
  {
    id: serial('id').primaryKey(),
    propertyId: integer('property_id')
      .notNull()
      .references(() => properties.id, { onDelete: 'cascade' }),
    fullName: varchar('full_name', { length: 120 }).notNull(),
    email: varchar('email', { length: 160 }).notNull(),
    phone: varchar('phone', { length: 30 }).notNull(),
    unitLabel: varchar('unit_label', { length: 40 }).notNull(),
    /** Monthly rent in whole Naira. */
    rentAmount: integer('rent_amount').notNull(),
    /** Day of the month rent is due (1 to 28). */
    dueDay: integer('due_day').notNull().default(1),
    leaseStart: date('lease_start').notNull(),
    leaseEnd: date('lease_end'),
    status: tenantStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('tenants_property_idx').on(t.propertyId)],
);

export const payments = pgTable(
  'payments',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    /** Rent period this payment covers, formatted YYYY-MM. */
    period: varchar('period', { length: 7 }).notNull(),
    paidOn: date('paid_on').notNull(),
    method: paymentMethodEnum('method').notNull().default('transfer'),
    reference: varchar('reference', { length: 80 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('payments_tenant_period_idx').on(t.tenantId, t.period)],
);

export const reminders = pgTable(
  'reminders',
  {
    id: serial('id').primaryKey(),
    tenantId: integer('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    period: varchar('period', { length: 7 }).notNull(),
    channel: reminderChannelEnum('channel').notNull().default('email'),
    message: text('message').notNull(),
    amountDue: integer('amount_due').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('reminders_tenant_idx').on(t.tenantId)],
);

export const landlordsRelations = relations(landlords, ({ many }) => ({ properties: many(properties) }));
export const propertiesRelations = relations(properties, ({ one, many }) => ({
  landlord: one(landlords, { fields: [properties.landlordId], references: [landlords.id] }),
  tenants: many(tenants),
}));
export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  property: one(properties, { fields: [tenants.propertyId], references: [properties.id] }),
  payments: many(payments),
  reminders: many(reminders),
}));
export const paymentsRelations = relations(payments, ({ one }) => ({
  tenant: one(tenants, { fields: [payments.tenantId], references: [tenants.id] }),
}));
export const remindersRelations = relations(reminders, ({ one }) => ({
  tenant: one(tenants, { fields: [reminders.tenantId], references: [tenants.id] }),
}));

export type Landlord = typeof landlords.$inferSelect;
export type Property = typeof properties.$inferSelect;
export type Tenant = typeof tenants.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
export type PropertyType = (typeof propertyTypeEnum.enumValues)[number];
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
export type ReminderChannel = (typeof reminderChannelEnum.enumValues)[number];
