/**
 * Captures annotated screenshots of Renta for the PDF documentation.
 *
 *   npm run build && npm run docs:screens
 *
 * Re-seeds the database pinned to 14 Oct 2026, starts the production server,
 * drives it with Playwright and draws numbered callouts on key elements.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, devices, type Page } from '@playwright/test';
import { createDb } from '../src/db';
import { runMigrations } from '../src/db/migrate';
import { seed } from '../src/db/seed';
import { todayISO } from '../src/lib/rent';

const TODAY = '2026-10-14';
const PORT = 3300;
const BASE = `http://localhost:${PORT}`;
const OUT = path.join(process.cwd(), 'docs', 'screenshots');
const DB_URL = process.env.DATABASE_URL ?? 'postgresql://renta:renta@localhost:5432/renta';
const LOCAL_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

interface Mark {
  sel: string;
  /** Where to pin the badge relative to the element. */
  at?: 'tl' | 'tr' | 'l' | 'r';
  nth?: number;
}

/** Draws numbered green badges + outlines over the given elements. */
async function annotate(page: Page, marks: Mark[]) {
  await page.evaluate((marks) => {
    document.querySelectorAll('.doc-mark').forEach((n) => n.remove());
    marks.forEach((m, i) => {
      const el = document.querySelectorAll(m.sel)[m.nth ?? 0] as HTMLElement | undefined;
      if (!el) throw new Error(`Annotation target not found: ${m.sel}`);
      const r = el.getBoundingClientRect();
      const x = window.scrollX;
      const y = window.scrollY;
      const box = document.createElement('div');
      box.className = 'doc-mark';
      Object.assign(box.style, {
        position: 'absolute', left: `${r.left + x - 4}px`, top: `${r.top + y - 4}px`,
        width: `${r.width + 8}px`, height: `${r.height + 8}px`, border: '2.5px dashed #ff3d7f',
        borderRadius: '14px', zIndex: '9998', pointerEvents: 'none',
      });
      const b = document.createElement('div');
      b.className = 'doc-mark';
      b.textContent = String(i + 1);
      const at = m.at ?? 'tl';
      const left = at === 'tr' || at === 'r' ? r.right + x - 14 : r.left + x - 14;
      const top = at === 'l' || at === 'r' ? r.top + y + r.height / 2 - 14 : r.top + y - 14;
      Object.assign(b.style, {
        position: 'absolute', left: `${left}px`, top: `${top}px`, width: '28px', height: '28px',
        borderRadius: '50%', background: '#ff3d7f', color: '#fff', font: '800 14px Inter, sans-serif',
        display: 'grid', placeItems: 'center', zIndex: '9999', boxShadow: '0 4px 10px rgba(0,0,0,.25)',
        border: '2px solid #fff',
      });
      document.body.appendChild(box);
      document.body.appendChild(b);
    });
  }, marks);
}

async function shot(page: Page, name: string, marks: Mark[] = [], fullPage = false) {
  await page.waitForLoadState('networkidle');
  if (marks.length) await annotate(page, marks);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage });
  console.log('  captured', name);
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Server did not start');
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  await runMigrations(DB_URL);
  const { db, pool } = createDb(DB_URL);
  await seed(db, TODAY);
  await pool.end();

  const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    env: { ...process.env, DATABASE_URL: DB_URL, RENTA_TODAY: TODAY, INSECURE_COOKIES: '1' },
    stdio: 'ignore',
    detached: true,
  });
  try {
    await waitForServer();
    const browser = await chromium.launch(fs.existsSync(LOCAL_CHROMIUM) ? { executablePath: LOCAL_CHROMIUM } : {});
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
    const page = await ctx.newPage();

    // 1. Login
    await page.goto(`${BASE}/login`);
    await shot(page, '01-login', [{ sel: '.demo-hint', at: 'tr' }, { sel: '.form .field', at: 'tr' }, { sel: '[data-testid=submit]', at: 'tr' }]);
    await page.click('[data-testid=submit]');
    await page.waitForURL(`${BASE}/`);

    // 2. Dashboard
    await shot(page, '02-dashboard', [
      { sel: '.sidebar .nav' , at: 'tr' },
      { sel: '[data-testid=cta-record-payment]' },
      { sel: '[data-testid=stat-collected]' },
      { sel: '[data-testid=stat-overdue]' },
      { sel: '.chart' },
      { sel: '[data-testid=upcoming-card]' },
      { sel: '[data-testid=overdue-card] .list-item form', at: 'tr' },
    ], true);

    // 3. Properties
    await page.goto(`${BASE}/properties`);
    await shot(page, '03-properties', [
      { sel: '[data-testid=add-property]' },
      { sel: '.prop-card .badge-overdue', at: 'tr', nth: 0 },
      { sel: '.prop-card .meta', nth: 0 },
      { sel: '.prop-card .occ', nth: 1, at: 'r' },
    ]);

    // 4. Property detail
    await page.click('text=Lekki Pearl Residences');
    await page.waitForURL(/\/properties\/\d+$/);
    await shot(page, '04-property-detail', [
      { sel: '.topbar .actions', at: 'tr' },
      { sel: '.grid-3' },
      { sel: '.table' },
    ], true);

    // 5. Add property form (with a validation error)
    await page.goto(`${BASE}/properties/new`);
    await page.fill('#name', 'S');
    await page.click('[data-testid=submit]');
    await page.waitForSelector('[data-testid=err-name]');
    await page.fill('#name', 'Surulere Heights');
    await page.fill('#address', '3 Bode Thomas Street, Surulere');
    await page.fill('#city', 'Lagos');
    await page.fill('#units', '4');
    await shot(page, '05-add-property', [
      { sel: '.field.error', at: 'tr' },
      { sel: '#type', at: 'tr' },
      { sel: '.image-picker', at: 'tr' },
    ], true);

    // 6. Tenants list
    await page.goto(`${BASE}/tenants`);
    await shot(page, '06-tenants', [
      { sel: '.filters input[name=q]' },
      { sel: '.segmented' },
      { sel: '.table tbody tr td:nth-child(5)', at: 'tr' },
      { sel: '.table tbody tr td.red', at: 'tr' },
    ], true);

    // 7. Tenant profile
    await page.goto(`${BASE}/tenants?q=Emeka`);
    await page.click('text=Emeka Obi');
    await page.waitForURL(/\/tenants\/\d+$/);
    await shot(page, '07-tenant-profile', [
      { sel: '[data-testid=month-strip]' },
      { sel: '.table' },
      { sel: '.kv', at: 'tr' },
      { sel: '[data-testid=send-reminder]', at: 'tr' },
      { sel: '.message-box', at: 'tr' },
    ], true);

    // 8. Add tenant
    await page.goto(`${BASE}/tenants/new?propertyId=1`);
    await page.fill('#fullName', 'Yetunde Afolabi');
    await page.fill('#email', 'yetunde@example.com');
    await page.fill('#phone', '+234 809 555 0101');
    await page.fill('#unitLabel', 'Flat 3B');
    await page.fill('#rentAmount', '500000');
    await page.fill('#dueDay', '25');
    await shot(page, '08-add-tenant', [{ sel: '#rentAmount', at: 'tr' }, { sel: '#dueDay', at: 'tr' }, { sel: '#leaseEnd', at: 'tr' }], true);

    // 9. Rent roll
    await page.goto(`${BASE}/rent`);
    await shot(page, '09-rent-roll', [
      { sel: '.topbar .segmented', at: 'tr' },
      { sel: '.grid-3' },
      { sel: '.badge-overdue', nth: 0, at: 'tr' },
      { sel: '.table .btn-dark', nth: 0, at: 'tr' },
      { sel: '.table a.btn', nth: 0, at: 'tr' },
    ], true);

    // 10. Record payment (with overpayment validation)
    await page.goto(`${BASE}/tenants?q=Amaka`);
    await page.click('text=Amaka Nwosu');
    await page.click('text=Record payment');
    await page.waitForURL(/payments\/new/);
    await page.fill('#amount', '500000');
    await page.click('[data-testid=submit]');
    await page.waitForSelector('[data-testid=err-amount]');
    await shot(page, '10-record-payment', [{ sel: '#tenantId', at: 'tr' }, { sel: '.field.error', at: 'tr' }, { sel: '#period', at: 'tr' }, { sel: '#method', at: 'tr' }], true);

    // 11. Receipt
    await page.fill('#amount', '450000');
    await page.fill('#reference', 'TRF-20261014-AMK');
    await page.click('[data-testid=submit]');
    await page.waitForSelector('[data-testid=receipt]');
    await page.waitForTimeout(300);
    await shot(page, '11-receipt', [{ sel: '.paid-stamp', at: 'tr' }, { sel: '.kv', at: 'tr' }, { sel: '.no-print .btn-dark' }], true);

    // 12. Payments
    await page.goto(`${BASE}/payments`);
    await shot(page, '12-payments', [
      { sel: '.grid-3' },
      { sel: '.filters select[name=tenantId]' },
      { sel: '.filters a[href="/api/payments.csv"]', at: 'tr' },
      { sel: '.table a.icon-btn', nth: 0, at: 'tr' },
    ]);

    // 13. Reminders
    await page.goto(`${BASE}/reminders`);
    await shot(page, '13-reminders', [
      { sel: '[data-testid=remind-all]', at: 'tr' },
      { sel: '[data-testid=overdue-item] .badge-overdue', at: 'tr' },
      { sel: '[data-testid=overdue-item] .message-box' },
      { sel: '[data-testid=overdue-item] select' },
      { sel: '[data-testid=reminder-history]', at: 'tr' },
    ], true);

    // 14. Mobile
    const mctx = await browser.newContext({ ...devices['Pixel 7'], storageState: await ctx.storageState() });
    const m = await mctx.newPage();
    await m.goto(`${BASE}/`);
    await shot(m, '14-mobile-dashboard');
    await m.goto(`${BASE}/properties`);
    await shot(m, '15-mobile-properties');

    await browser.close();
  } finally {
    if (server.pid) process.kill(-server.pid);
  }
  // Leave the demo database freshly seeded relative to the real date.
  const again = createDb(DB_URL);
  await seed(again.db, process.env.RENTA_TODAY ?? todayISO());
  await again.pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
