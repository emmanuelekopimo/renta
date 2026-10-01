/**
 * Builds docs/Renta-Documentation.pdf from the annotated screenshots.
 *
 *   npm run docs:screens   # capture docs/screenshots/*.png
 *   npm run docs:pdf       # render this guide to PDF with Chromium
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const DOCS = path.join(process.cwd(), 'docs');
const SHOTS = path.join(DOCS, 'screenshots');
const LOCAL_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const img = (name: string) => `data:image/png;base64,${fs.readFileSync(path.join(SHOTS, `${name}.png`)).toString('base64')}`;
const svg = (p: string) => `data:image/svg+xml;base64,${fs.readFileSync(path.join(process.cwd(), p)).toString('base64')}`;

interface Screen {
  shot: string;
  title: string;
  route: string;
  intro: string;
  notes: string[];
  steps?: string[];
  mobile?: boolean;
}

const SCREENS: Screen[] = [
  {
    shot: '01-login', title: 'Sign in', route: '/login',
    intro: 'Every page is private to the signed-in landlord. Sessions are stored in a signed, HTTP-only cookie that lasts 7 days.',
    notes: [
      'Demo credentials are shown here and pre-filled, so a presenter can sign in with one click.',
      'Email and password fields. Wrong details show “Incorrect email or password” without revealing which one was wrong.',
      'Sign in takes you to the dashboard.',
    ],
  },
  {
    shot: '02-dashboard', title: 'Dashboard', route: '/',
    intro: 'The home screen answers the landlord’s three daily questions: how much came in, who is late, and what is due next.',
    notes: [
      'Main navigation. The red badge on Reminders counts tenants who are overdue right now.',
      'Record payment: the most common action, always one tap away.',
      'Collected this month against expected rent, with a progress bar.',
      'Total overdue rent across all tenants and months.',
      'Six-month chart of expected (light) vs collected (green) rent.',
      'Due soon: unpaid rent due in the next 10 days.',
      'Overdue tenants, oldest debt first, each with a one-tap Remind button.',
    ],
  },
  {
    shot: '03-properties', title: 'Properties', route: '/properties',
    intro: 'Each property shows as a card with a cover illustration, its occupancy and the rent it brings in each month.',
    notes: [
      'Add a new property.',
      'Red badge: how many tenants in this property are late.',
      'Property type and occupied units (active tenants / units).',
      'Occupancy bar and total monthly rent for the property.',
    ],
    steps: ['Click Add property.', 'Fill in name, address, city, units and type, then pick a cover.', 'Click Add property. You land on the new property’s page and see a confirmation toast.'],
  },
  {
    shot: '04-property-detail', title: 'Property details', route: '/properties/:id',
    intro: 'Shows one building and everyone living in it.',
    notes: [
      'Edit the property, or add a tenant who is pre-assigned to it.',
      'Unit count, occupancy and the monthly/annual rent roll.',
      'Tenants with rent, due day, lease end and this month’s status. Click a tenant to open their profile.',
    ],
  },
  {
    shot: '05-add-property', title: 'Add / edit property form', route: '/properties/new',
    intro: 'All forms are checked on the server with Zod. Errors appear inline next to the field and your input is kept.',
    notes: ['Inline validation error (name too short).', 'Property type: apartment, house, duplex, studio or shop.', 'Cover illustration picker with six built-in images.'],
  },
  {
    shot: '06-tenants', title: 'Tenants', route: '/tenants',
    intro: 'All tenants across every property, with their current rent status and total arrears.',
    notes: [
      'Search by name, email, unit or property.',
      'Filter: Active, Moved out or All.',
      'This month’s status: Paid, Part-paid, Upcoming or Overdue.',
      'Arrears: unpaid rent from every overdue month added together.',
    ],
  },
  {
    shot: '07-tenant-profile', title: 'Tenant profile & ledger', route: '/tenants/:id',
    intro: 'A full month-by-month history from the start of the lease. This is where a landlord settles a dispute about who paid what.',
    notes: [
      'Month strip: each month coloured by status (green paid, red overdue, amber part-paid, blue upcoming).',
      'Ledger: due date, amount paid and balance for each month.',
      'Key facts: rent, due day, lease dates, total paid and arrears.',
      'Choose WhatsApp, SMS or Email and send an overdue reminder.',
      'Reminder history with the exact message that was sent.',
    ],
  },
  {
    shot: '08-add-tenant', title: 'Add tenant', route: '/tenants/new',
    intro: 'A tenant belongs to a property and has a monthly rent and a due day. These two values drive every rent calculation.',
    notes: ['Monthly rent in whole Naira.', 'Due day (1–28), the day of the month rent is due. Using 28 or less means every month has that day.', 'Optional lease end. Renta stops charging after this month.'],
  },
  {
    shot: '09-rent-roll', title: 'Rent roll (due dates)', route: '/rent',
    intro: 'The rent roll lists every tenant’s due date and payment status for one month. Use the arrows to move between months.',
    notes: [
      'Month switcher (previous / next).',
      'Expected, collected and overdue totals for the month.',
      'Status per tenant, with how many days late or until due.',
      'Remind button (only shown for overdue rent).',
      'Pay: opens the payment form with tenant, month and balance already filled in.',
    ],
  },
  {
    shot: '10-record-payment', title: 'Record a payment', route: '/payments/new',
    intro: 'Payments are always linked to a rent month, so part-payments and late payments are tracked correctly.',
    notes: [
      'Tenant (pre-selected when you come from a profile or the rent roll).',
      'Over-payment guard: you can’t record more than the balance outstanding for that month.',
      'Rent month this payment covers.',
      'Method: bank transfer, POS, cash or card, plus an optional reference.',
    ],
    steps: ['Pick the tenant and the rent month.', 'Enter the amount and date paid.', 'Click Record payment. A receipt opens straight away.'],
  },
  {
    shot: '11-receipt', title: 'Receipt', route: '/payments/:id/receipt',
    intro: 'Every payment gets a receipt with its own number (RNT-000123) that can be printed or saved as PDF.',
    notes: ['PAID stamp and the amount.', 'Who paid, which unit, which month, and the method and reference.', 'Print receipt (navigation is hidden when printing).'],
  },
  {
    shot: '12-payments', title: 'Payments', route: '/payments',
    intro: 'The full payment log for bookkeeping.',
    notes: ['Received this month, all-time total and most-used payment method.', 'Filter by tenant and/or month.', 'Export every payment to CSV for Excel or Google Sheets.', 'Open the receipt for any payment.'],
  },
  {
    shot: '13-reminders', title: 'Overdue reminders', route: '/reminders',
    intro: 'Every tenant with overdue rent, with a personalised message ready to send.',
    notes: [
      'Remind all: sends a reminder to every overdue tenant at once.',
      'How late, and how many months are unpaid.',
      'Message preview, written from the tenant’s name, amount, month and days late.',
      'Channel: WhatsApp, SMS or Email.',
      'Sent history (each reminder is saved with its channel, amount and time).',
    ],
  },
];

const font = (w: number) =>
  `@font-face { font-family: Inter; font-weight: ${w}; src: url(data:font/woff2;base64,${fs
    .readFileSync(path.join(process.cwd(), `node_modules/@fontsource/inter/files/inter-latin-${w}-normal.woff2`))
    .toString('base64')}) format('woff2'); }`;

const css = [400, 600, 700, 800].map(font).join('\n') + `
@page { size: A4; margin: 16mm 14mm 18mm; }
* { box-sizing: border-box; }
body { font-family: Inter, 'Segoe UI', Roboto, sans-serif; color: #101814; font-size: 10.5pt; line-height: 1.55; margin: 0; }
h1, h2, h3 { letter-spacing: -0.02em; margin: 0; }
h1 { font-size: 24pt; font-weight: 800; }
h2 { font-size: 17pt; font-weight: 800; margin-bottom: 8px; }
h3 { font-size: 12pt; font-weight: 700; margin: 14px 0 6px; }
p { margin: 0 0 8px; }
code { background: #eef3f0; padding: 1px 5px; border-radius: 4px; font-size: 9pt; font-family: 'JetBrains Mono', Menlo, monospace; }
pre { background: #101814; color: #d3f5e3; padding: 12px 14px; border-radius: 10px; font-size: 8.8pt; white-space: pre-wrap; margin: 6px 0 10px; }
.page { page-break-after: always; }
.page:last-child { page-break-after: auto; }
.cover { height: 260mm; display: flex; flex-direction: column; justify-content: space-between; background: radial-gradient(circle at 20% 10%, #4be39a 0%, #34d186 45%, #18a865 100%); margin: -16mm -14mm 0; padding: 22mm 18mm; color: #101814; }
.cover .brand { display: flex; align-items: center; gap: 12px; font-weight: 800; font-size: 22pt; }
.cover .brand img { width: 52px; }
.cover h1 { font-size: 40pt; line-height: 1.05; max-width: 150mm; }
.cover .sub { font-size: 14pt; color: #0f3d27; max-width: 140mm; margin-top: 10px; }
.cover .hero { width: 100%; border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,.25); }
.cover .meta { display: flex; gap: 10px; flex-wrap: wrap; }
.pill { background: rgba(255,255,255,.75); border-radius: 999px; padding: 4px 12px; font-weight: 700; font-size: 9.5pt; }
.eyebrow { color: #1f9a5e; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; font-size: 8.5pt; margin-bottom: 4px; }
.lead { font-size: 11.5pt; color: #3c4a43; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0; }
.grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin: 10px 0; }
.card { border: 1px solid #e7ecea; border-radius: 12px; padding: 12px 14px; break-inside: avoid; }
.card b { display: block; margin-bottom: 2px; }
.card.green { background: #e9faf1; border-color: #d3f5e3; }
table { width: 100%; border-collapse: collapse; margin: 6px 0 12px; font-size: 9.5pt; }
th { text-align: left; background: #f5f7f6; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .04em; color: #6b7a72; }
th, td { padding: 6px 8px; border-bottom: 1px solid #e7ecea; vertical-align: top; }
.shot { width: 100%; border-radius: 10px; border: 1px solid #e7ecea; box-shadow: 0 6px 18px rgba(16,24,20,.08); display: block; margin: 8px 0 10px; }
.shot.mobile { width: 48%; display: inline-block; margin-right: 2%; }
.route { font-family: Menlo, monospace; font-size: 9pt; color: #1f9a5e; background: #e9faf1; padding: 2px 8px; border-radius: 999px; margin-left: 8px; vertical-align: middle; }
ol.notes { list-style: none; padding: 0; margin: 4px 0 0; counter-reset: n; columns: 2; column-gap: 18px; }
ol.notes li { counter-increment: n; position: relative; padding-left: 30px; margin-bottom: 7px; break-inside: avoid; }
ol.notes li::before { content: counter(n); position: absolute; left: 0; top: 0; width: 21px; height: 21px; border-radius: 50%; background: #ff3d7f; color: #fff; font-weight: 800; font-size: 9pt; display: grid; place-items: center; }
.steps { background: #f5f7f6; border-radius: 10px; padding: 8px 12px 8px 30px; margin-top: 8px; }
.steps li { margin-bottom: 3px; }
.badge { display: inline-block; padding: 1px 8px; border-radius: 999px; font-weight: 700; font-size: 8.5pt; }
.b-paid { background: #e9faf1; color: #1f9a5e; } .b-overdue { background: #fdecec; color: #ef4b4b; } .b-partial { background: #fff5e0; color: #b26b00; } .b-due { background: #e8f0fe; color: #3b82f6; }
.arch { display: grid; grid-template-columns: 1fr 22px 1fr 22px 1fr; align-items: center; margin: 12px 0; }
.arch .box { border-radius: 12px; padding: 10px 12px; font-size: 9.5pt; min-height: 92px; }
.arch .arrow { text-align: center; font-weight: 800; color: #1f9a5e; font-size: 14pt; }
.b1 { background: #101814; color: #fff; } .b2 { background: #e9faf1; border: 1px solid #d3f5e3; } .b3 { background: #e8f0fe; border: 1px solid #cddcfb; }
.timeline { border-left: 3px solid #34d186; padding-left: 14px; margin-left: 6px; }
.timeline .t { margin-bottom: 10px; break-inside: avoid; }
.timeline .t b { color: #1f9a5e; }
.toc li { margin-bottom: 4px; }
.footer-note { color: #6b7a72; font-size: 9pt; }
`;

function screenPage(s: Screen, idx: number) {
  return `<section class="page">
    <div class="eyebrow">Walkthrough · ${idx + 1} of ${SCREENS.length}</div>
    <h2>${s.title}<span class="route">${s.route}</span></h2>
    <p class="lead">${s.intro}</p>
    <img class="shot" src="${img(s.shot)}" />
    <ol class="notes">${s.notes.map((n) => `<li>${n}</li>`).join('')}</ol>
    ${s.steps ? `<h3>How to</h3><ol class="steps">${s.steps.map((x) => `<li>${x}</li>`).join('')}</ol>` : ''}
  </section>`;
}

const html = `<!doctype html><html><head><meta charset="utf-8"><title>Renta — Documentation</title><style>${css}</style></head><body>

<section class="page cover">
  <div class="brand"><img src="${svg('public/img/logo.svg')}" />Renta</div>
  <div>
    <h1>Rent collection, minus the stress.</h1>
    <p class="sub">A property & rent manager for landlords: properties, tenants, rent due dates, payment records and overdue reminders.</p>
  </div>
  <img class="hero" src="${img('02-dashboard')}" />
  <div>
    <div class="meta"><span class="pill">User guide</span><span class="pill">Technical documentation</span><span class="pill">5-minute demo script</span></div>
    <p style="margin-top:12px;font-weight:600">Built with Next.js · TypeScript · Drizzle ORM · PostgreSQL · deployed on Railway</p>
  </div>
</section>

<section class="page">
  <div class="eyebrow">Contents</div>
  <h2>What’s inside</h2>
  <ol class="toc">
    <li><b>Overview</b>: the problem, the solution and the features</li>
    <li><b>How rent is calculated</b>: due dates, statuses, arrears and reminders</li>
    <li><b>Architecture</b>: stack, folder structure and data model</li>
    <li><b>Walkthrough</b>: every screen, with numbered annotations</li>
    <li><b>Mobile</b>: the Bolt-style bottom tab bar</li>
    <li><b>Running locally</b>: setup commands and the demo account</li>
    <li><b>Testing</b>: unit, integration and end-to-end suites</li>
    <li><b>Deployment</b>: Railway and PostgreSQL</li>
    <li><b>5-minute presentation script</b></li>
  </ol>

  <h2 style="margin-top:18px">1 · Overview</h2>
  <p class="lead">Small landlords often track rent in notebooks, WhatsApp chats and memory. They forget who has paid, miss due dates and feel awkward chasing late tenants. <b>Renta</b> puts every property, tenant and payment in one place, works out who owes what automatically, and writes the polite reminder for you.</p>
  <div class="grid3">
    <div class="card green"><b>🏢 Properties</b>Buildings with units, type, address and occupancy.</div>
    <div class="card green"><b>👥 Tenants</b>Contact details, unit, monthly rent, due day and lease dates.</div>
    <div class="card green"><b>📅 Rent due dates</b>A monthly rent roll showing every due date and status.</div>
    <div class="card green"><b>💳 Payment records</b>Full and part payments, linked to a rent month, with receipts.</div>
    <div class="card green"><b>🔔 Overdue reminders</b>Personalised messages by WhatsApp, SMS or email, with history.</div>
    <div class="card green"><b>📊 Dashboard</b>Collection rate, arrears, 6-month chart, CSV export.</div>
  </div>
  <h3>Design</h3>
  <p>The look is based on the <b>Bolt</b> app: bright green (<code>#34D186</code>) for main actions, near-black text, soft white cards with large rounded corners, pill-shaped buttons and a bottom tab bar on mobile. The logo combines a roof and the letter “R”. Icons come from <b>Lucide</b>, tenant avatars are generated with <b>DiceBear</b> (Personas), and the property images are custom SVG illustrations that ship with the app.</p>
</section>

<section class="page">
  <div class="eyebrow">Core logic</div>
  <h2>2 · How rent is calculated</h2>
  <p class="lead">All rent maths lives in one pure module, <code>src/lib/rent.ts</code>, which never touches the database. That makes it easy to unit test and easy to explain.</p>
  <h3>Rent periods & due dates</h3>
  <p>Rent is charged per <b>period</b> (a calendar month, <code>YYYY-MM</code>). For each tenant, Renta creates one period for every month from the lease start up to today, or up to the lease end if that comes first. Each period’s due date is the tenant’s <b>due day</b> in that month (for example, the 5th → <code>2026-10-05</code>).</p>
  <h3>Status of a month</h3>
  <table>
    <tr><th>Status</th><th>Rule</th><th>Example (rent ₦100k, due 5 Oct)</th></tr>
    <tr><td><span class="badge b-paid">Paid</span></td><td>Payments for the month ≥ rent</td><td>₦100k recorded for October</td></tr>
    <tr><td><span class="badge b-due">Upcoming</span></td><td>Nothing paid and the due date hasn’t passed</td><td>Today is 2 Oct, nothing paid</td></tr>
    <tr><td><span class="badge b-partial">Part-paid</span></td><td>Some paid, balance left, not yet past due</td><td>₦40k paid on 1 Oct</td></tr>
    <tr><td><span class="badge b-overdue">Overdue</span></td><td>A balance is left <i>after</i> the due date</td><td>Today is 6 Oct, ₦60k still owed</td></tr>
  </table>
  <p><b>Arrears</b> is the total of the balances on every overdue month. A tenant who missed September and October owes both, and the reminder quotes the full amount and the oldest month.</p>
  <h3>Business rules</h3>
  <ul>
    <li>A payment always belongs to a tenant <i>and</i> a rent month. One month can have several payments (part-payments).</li>
    <li>You can’t record more than the balance left for a month, so “₦500,000 for a ₦450,000 month” is rejected.</li>
    <li>Reminders can only be sent to tenants with overdue rent. Each one is saved with its message, channel and the amount due.</li>
    <li>Marking a tenant <i>Moved out</i> with an end date takes them out of the rent roll and reminders from the following month.</li>
    <li>Every query is limited to the signed-in landlord, so one landlord can never see or change another’s data.</li>
  </ul>
  <h3>Reminder message (generated)</h3>
  <pre>Hi Emeka, this is a friendly reminder that your rent of ₦1,500,000 for September 2026 at
Maitama Court (Wing B) is now 41 days overdue. Please make payment at your earliest
convenience and share the receipt once done. Thank you! — Adaeze Okafor via Renta</pre>
</section>

<section class="page">
  <div class="eyebrow">Under the hood</div>
  <h2>3 · Architecture</h2>
  <div class="arch">
    <div class="box b1"><b>Browser</b>React Server Components render HTML. Small client pieces handle forms, toasts and the active nav link.</div>
    <div class="arrow">→</div>
    <div class="box b2"><b>Next.js 16 (App Router)</b>Pages read data on the server. <b>Server Actions</b> handle form posts: validate with Zod, then run a command.</div>
    <div class="arrow">→</div>
    <div class="box b3"><b>PostgreSQL</b>Accessed through <b>Drizzle ORM</b> with type-safe queries. Schema changes are versioned SQL migrations.</div>
  </div>
  <table>
    <tr><th>Layer</th><th>Files</th><th>Responsibility</th></tr>
    <tr><td>Schema</td><td><code>src/db/schema.ts</code>, <code>drizzle/</code></td><td>Tables, enums, relations, generated SQL migrations</td></tr>
    <tr><td>Domain logic</td><td><code>src/lib/rent.ts</code></td><td>Pure rent maths: periods, statuses, ledger, arrears, reminder text</td></tr>
    <tr><td>Validation</td><td><code>src/lib/validation.ts</code></td><td>Zod schemas for every form, returning field-level errors</td></tr>
    <tr><td>Queries</td><td><code>src/services/portfolio.ts</code></td><td>Load a landlord’s portfolio; rent roll, overdue list, dashboard stats</td></tr>
    <tr><td>Commands</td><td><code>src/services/commands.ts</code></td><td>Create/update/delete with ownership checks; payments; reminders</td></tr>
    <tr><td>Web</td><td><code>src/app/**</code>, <code>src/components/**</code></td><td>Pages, server actions, API routes (<code>/api/health</code>, <code>/api/summary</code>, <code>/api/payments.csv</code>)</td></tr>
    <tr><td>Auth</td><td><code>src/lib/session.ts</code></td><td>Signed JWT (jose) in an HTTP-only cookie; passwords hashed with bcrypt</td></tr>
  </table>
  <h3>Data model</h3>
  <table>
    <tr><th>Table</th><th>Key columns</th><th>Relationships</th></tr>
    <tr><td><b>landlords</b></td><td>name, email (unique), password_hash</td><td>has many properties</td></tr>
    <tr><td><b>properties</b></td><td>name, address, city, type (enum), units, image</td><td>belongs to landlord · has many tenants</td></tr>
    <tr><td><b>tenants</b></td><td>full_name, email, phone, unit_label, rent_amount, due_day, lease_start, lease_end, status</td><td>belongs to property · has many payments & reminders</td></tr>
    <tr><td><b>payments</b></td><td>amount, period (YYYY-MM), paid_on, method (enum), reference</td><td>belongs to tenant</td></tr>
    <tr><td><b>reminders</b></td><td>period, channel (enum), message, amount_due, sent_at</td><td>belongs to tenant</td></tr>
  </table>
  <p class="footer-note">Foreign keys use <code>ON DELETE CASCADE</code>, so deleting a property also removes its tenants, payments and reminders. Money is stored as whole Naira (integers) to avoid floating-point rounding.</p>
</section>

${SCREENS.map(screenPage).join('\n')}

<section class="page">
  <div class="eyebrow">Responsive</div>
  <h2>Mobile</h2>
  <p class="lead">On phones the sidebar turns into a Bolt-style bottom tab bar, cards stack into one column and wide tables scroll sideways inside their card.</p>
  <img class="shot mobile" src="${img('14-mobile-dashboard')}" /><img class="shot mobile" src="${img('15-mobile-properties')}" />
</section>

<section class="page">
  <div class="eyebrow">Getting started</div>
  <h2>6 · Running locally</h2>
  <p>You need Node.js 20.9+ and PostgreSQL 14+. If you have Docker, <code>docker compose up -d</code> starts a matching database.</p>
<pre>git clone https://github.com/emmanuelekopimo/renta && cd renta
npm install
cp .env.example .env          # DATABASE_URL, SESSION_SECRET
npm run db:setup              # run migrations and load demo data
npm run dev                   # http://localhost:3000</pre>
  <div class="card green"><b>Demo account</b>Email <code>demo@renta.app</code> · Password <code>renta123</code>. The demo data has 5 properties, 13 tenants, ~130 payments and a mix of paid, part-paid, upcoming and overdue rent. It is dated relative to today, so the demo always looks current.</div>
  <h3>Useful scripts</h3>
  <table>
    <tr><th>Command</th><th>What it does</th></tr>
    <tr><td><code>npm run dev</code> / <code>build</code> / <code>start</code></td><td>Develop, build and serve the Next.js app</td></tr>
    <tr><td><code>npm run db:generate</code></td><td>Generate a new SQL migration after editing the schema</td></tr>
    <tr><td><code>npm run db:migrate</code> · <code>db:seed</code></td><td>Apply migrations · reset demo data (<code>-- --if-empty</code> only seeds an empty database)</td></tr>
    <tr><td><code>RENTA_TODAY=2026-10-14</code></td><td>Optional: fix “today” to a date, for repeatable demos and tests</td></tr>
    <tr><td><code>npm run docs:screens</code> · <code>docs:pdf</code></td><td>Retake the annotated screenshots · rebuild this PDF</td></tr>
  </table>

  <h2 style="margin-top:16px">7 · Testing</h2>
  <div class="grid3">
    <div class="card"><b>Unit · Vitest</b>27 tests: rent maths (month boundaries, clamped due days, statuses, ledger, arrears), formatting and Zod validation.</div>
    <div class="card"><b>Integration · Vitest + Postgres</b>16 tests against a real <code>renta_test</code> database: CRUD, ownership checks, cascades, part-payments, over-payment guard, reminders, dashboard totals.</div>
    <div class="card"><b>End-to-end · Playwright</b>13 browser tests: login, add property and tenant, record payment, rent-roll navigation, reminders, CSV/API auth, delete, sign out, mobile tab bar.</div>
  </div>
<pre>npm test                 # unit + integration (needs renta_test database)
npm run test:e2e         # builds the app, then runs Playwright on desktop and mobile</pre>
  <p class="footer-note">Result at time of writing: <b>56 / 56 tests passing</b> (27 unit, 16 integration, 13 end-to-end).</p>
</section>

<section class="page">
  <div class="eyebrow">Going live</div>
  <h2>8 · Deployment (Railway + PostgreSQL)</h2>
  <p>Renta deploys to the <b>school-projects</b> project on <a href="https://railway.com">Railway</a>, with a managed PostgreSQL database alongside it. <code>railway.json</code> sets how it builds and starts:</p>
  <ul>
    <li><b>Build:</b> <code>npm run build</code></li>
    <li><b>Start:</b> <code>npm run start:railway</code>: apply migrations → load demo data <i>only if the database is empty</i> → <code>next start</code></li>
    <li><b>Health check:</b> <code>/api/health</code> (also checks the database connection)</li>
  </ul>
<pre># one-time
npm i -g @railway/cli && railway login
# deploy (links project "school-projects", adds Postgres, sets variables, deploys)
./scripts/deploy-railway.sh</pre>
  <table>
    <tr><th>Variable</th><th>Value</th></tr>
    <tr><td><code>DATABASE_URL</code></td><td><code>\${{Postgres.DATABASE_URL}}</code> (Railway fills this in from the Postgres service)</td></tr>
    <tr><td><code>SESSION_SECRET</code></td><td>A long random string used to sign session cookies</td></tr>
  </table>

  <h2 style="margin-top:16px">9 · 5-minute presentation script</h2>
  <div class="timeline">
    <div class="t"><b>0:00 – 0:40 · Problem.</b> “Landlords track rent in notebooks and WhatsApp, so they forget who paid and feel awkward chasing late tenants.” Show the login page and sign in with the pre-filled demo account.</div>
    <div class="t"><b>0:40 – 1:40 · Dashboard.</b> Point out collected vs expected, total overdue, the 6-month chart, <i>Due soon</i> and the overdue list. Point to the red badge on Reminders.</div>
    <div class="t"><b>1:40 – 2:20 · Properties & tenants.</b> Open the property cards (occupancy, late badges), then Emeka Obi’s profile: the coloured month strip shows September and October unpaid.</div>
    <div class="t"><b>2:20 – 3:20 · Record a payment.</b> On the Rent roll, click <i>Pay</i> for Amaka. Try ₦500,000 to show the over-payment check, then pay ₦450,000 and show the receipt. Back on the dashboard, she has left the overdue list.</div>
    <div class="t"><b>3:20 – 4:10 · Reminders.</b> Show the generated message, pick WhatsApp and send it, then click <i>Remind all</i>. The history updates straight away.</div>
    <div class="t"><b>4:10 – 5:00 · Tech & quality.</b> Next.js + TypeScript, Drizzle + PostgreSQL on Railway; the rent rules are pure functions; 56 automated tests. Close on the phone layout.</div>
  </div>
</section>

</body></html>`;

async function main() {
  const browser = await chromium.launch(fs.existsSync(LOCAL_CHROMIUM) ? { executablePath: LOCAL_CHROMIUM } : {});
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  const out = path.join(DOCS, 'Renta-Documentation.pdf');
  await page.pdf({
    path: out,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate:
      '<div style="width:100%;font-size:8px;color:#6b7a72;padding:0 14mm;display:flex;justify-content:space-between;font-family:Inter,sans-serif"><span>Renta · Documentation</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
    margin: { top: '16mm', bottom: '18mm', left: '14mm', right: '14mm' },
  });
  await browser.close();
  console.log(`✔ Wrote ${path.relative(process.cwd(), out)} (${(fs.statSync(out).size / 1024 / 1024).toFixed(1)} MB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
