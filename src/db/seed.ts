import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { createDb, type Db } from './index';
import { landlords, payments, properties, reminders, tenants } from './schema';
import { addMonths, daysBetween, dueDateFor, periodOf, periodsBetween, todayISO } from '../lib/rent';

export const DEMO_EMAIL = 'demo@renta.app';
export const DEMO_PASSWORD = 'renta123';

type Behaviour = 'onTime' | 'late' | 'partial' | 'behind' | 'early';

const PROPERTIES = [
  { name: 'Lekki Pearl Residences', address: '14 Admiralty Way, Lekki Phase 1', city: 'Lagos', type: 'apartment', units: 6, image: 'home-1' },
  { name: 'Maitama Court', address: '7 Aguiyi Ironsi Street, Maitama', city: 'Abuja', type: 'duplex', units: 3, image: 'home-2' },
  { name: 'Ikeja GRA Villa', address: '22 Isaac John Street, GRA Ikeja', city: 'Lagos', type: 'house', units: 1, image: 'home-3' },
  { name: 'Yaba Studio Lofts', address: '5 Herbert Macaulay Way, Yaba', city: 'Lagos', type: 'studio', units: 4, image: 'home-4' },
  { name: 'Wuse Market Shops', address: 'Plot 112 Wuse Zone 5', city: 'Abuja', type: 'shop', units: 3, image: 'home-5' },
] as const;

// [propertyIndex, name, unit, rent, dueDay, monthsAgo, behaviour]
const TENANTS: [number, string, string, number, number, number, Behaviour][] = [
  [0, 'Chinedu Okeke', 'Flat 1A', 450_000, 1, 14, 'onTime'],
  [0, 'Amaka Nwosu', 'Flat 1B', 450_000, 5, 9, 'late'],
  [0, 'Tunde Bakare', 'Flat 2A', 480_000, 1, 11, 'onTime'],
  [0, 'Funmilayo Adeyemi', 'Flat 2B', 480_000, 10, 7, 'partial'],
  [0, 'Ibrahim Musa', 'Flat 3A', 520_000, 15, 6, 'early'],
  [1, 'Ngozi Eze', 'Wing A', 750_000, 1, 12, 'onTime'],
  [1, 'Emeka Obi', 'Wing B', 750_000, 3, 8, 'behind'],
  [2, 'Bola & Seun Ajayi', 'Main House', 1_200_000, 1, 18, 'onTime'],
  [3, 'Zainab Bello', 'Loft 1', 180_000, 7, 5, 'early'],
  [3, 'David Okon', 'Loft 2', 180_000, 1, 10, 'late'],
  [3, 'Kemi Oladipo', 'Loft 3', 185_000, 20, 4, 'onTime'],
  [4, 'Aisha Lawal Stores', 'Shop 1', 300_000, 1, 16, 'onTime'],
  [4, 'Peter Ibe Pharmacy', 'Shop 2', 320_000, 10, 13, 'partial'],
];

const METHODS = ['transfer', 'transfer', 'transfer', 'pos', 'cash', 'card'] as const;

/** Deterministic pseudo-random so the demo data is stable. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function seed(db: Db, today: string) {
  await db.execute(sql`TRUNCATE reminders, payments, tenants, properties, landlords RESTART IDENTITY CASCADE`);
  const rand = rng(42);
  const current = periodOf(today);

  const [landlord] = await db
    .insert(landlords)
    .values({ name: 'Adaeze Okafor', email: DEMO_EMAIL, passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10) })
    .returning();

  const props = await db
    .insert(properties)
    .values(PROPERTIES.map((p) => ({ ...p, landlordId: landlord!.id })))
    .returning();

  for (const [pi, fullName, unitLabel, rentAmount, dueDay, monthsAgo, behaviour] of TENANTS) {
    const first = fullName.split(' ')[0]!.toLowerCase();
    const leaseStart = `${addMonths(current, -monthsAgo)}-01`;
    const [tenant] = await db
      .insert(tenants)
      .values({
        propertyId: props[pi]!.id,
        fullName,
        email: `${first}@example.com`,
        phone: `+234 80${Math.floor(10000000 + rand() * 89999999)}`,
        unitLabel,
        rentAmount,
        dueDay,
        leaseStart,
        leaseEnd: `${addMonths(current, 12 - monthsAgo + 6)}-01`,
      })
      .returning();

    const rows: (typeof payments.$inferInsert)[] = [];
    for (const period of periodsBetween(periodOf(leaseStart), current)) {
      const due = dueDateFor(period, dueDay);
      const monthsBack = periodsBetween(period, current).length - 1;
      const dueInPast = daysBetween(due, today) > 0;
      const pay = (amount: number, offset: number) => {
        const paidOn = addDays(due, offset);
        if (paidOn > today) return;
        rows.push({
          tenantId: tenant!.id,
          amount,
          period,
          paidOn,
          method: METHODS[Math.floor(rand() * METHODS.length)]!,
          reference: `TRF-${period.replace('-', '')}-${String(tenant!.id).padStart(3, '0')}`,
        });
      };

      if (behaviour === 'behind' && monthsBack <= 1) continue; // two months unpaid
      if (behaviour === 'late' && monthsBack === 0) continue; // current month unpaid
      if (behaviour === 'partial' && monthsBack === 0) {
        pay(Math.round(rentAmount * 0.5), -2);
        continue;
      }
      if (behaviour === 'early') pay(rentAmount, -Math.ceil(rand() * 6) - 3);
      else if (behaviour === 'late') pay(rentAmount, Math.ceil(rand() * 8) + 2);
      else if (monthsBack === 0 && !dueInPast && rand() < 0.5) continue; // not paid yet, not due yet
      else pay(rentAmount, -Math.floor(rand() * 3));
    }
    if (rows.length) await db.insert(payments).values(rows);
  }

  // A couple of reminders already sent, so the history isn't empty.
  const emeka = await db.query.tenants.findFirst({ where: (t, { eq }) => eq(t.fullName, 'Emeka Obi') });
  if (emeka) {
    const period = addMonths(current, -1);
    await db.insert(reminders).values({
      tenantId: emeka.id,
      period,
      channel: 'whatsapp',
      amountDue: emeka.rentAmount,
      message: `Hi Emeka, this is a friendly reminder that your rent for last month at Maitama Court (Wing B) is overdue. Thank you! — Adaeze Okafor via Renta`,
      sentAt: new Date(`${addDays(dueDateFor(period, emeka.dueDay), 5)}T09:30:00Z`),
    });
  }

  return { landlordId: landlord!.id };
}

if (require.main === module) {
  const { db, pool } = createDb();
  const today = process.env.RENTA_TODAY ?? todayISO();
  seed(db, today)
    .then(() => {
      console.log(`✔ Seeded demo data relative to ${today}`);
      console.log(`  Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
    })
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
