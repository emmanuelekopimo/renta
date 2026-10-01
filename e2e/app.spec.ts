import { expect, test } from '@playwright/test';
import { login } from './helpers';

test.describe.configure({ mode: 'serial' });

test('redirects to login when signed out', async ({ page }) => {
  await page.goto('/tenants');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible();
});

test('shows an error for a wrong password', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByTestId('submit').click();
  await expect(page.getByText('Incorrect email or password')).toBeVisible();
});

test('dashboard shows key numbers', async ({ page }) => {
  await login(page);
  await expect(page.getByRole('heading', { name: /Adaeze/ })).toBeVisible();
  await expect(page.getByTestId('stat-properties')).toContainText('5');
  await expect(page.getByTestId('stat-occupancy')).toContainText('76%');
  await expect(page.getByTestId('overdue-card')).toContainText('Emeka Obi');
  await expect(page.getByTestId('nav-reminders')).toContainText('5');
});

test('adds a property', async ({ page }) => {
  await login(page);
  await page.getByTestId('nav-properties').click();
  await page.getByTestId('add-property').click();
  await page.getByTestId('submit').click();
  await expect(page.getByTestId('err-name')).toBeVisible();

  await page.getByLabel('Property name').fill('Surulere Heights');
  await page.getByLabel('Street address').fill('3 Bode Thomas Street, Surulere');
  await page.getByLabel('City').fill('Lagos');
  await page.getByLabel('Number of units').fill('4');
  await page.getByAltText('Cover home-6').click();
  await page.getByTestId('submit').click();
  await expect(page.getByRole('heading', { name: 'Surulere Heights', level: 1 })).toBeVisible();
  await expect(page.getByTestId('toast')).toContainText('Property added');
});

test('adds a tenant to the new property', async ({ page }) => {
  await login(page);
  await page.goto('/properties');
  await page.getByTestId('property-card').filter({ hasText: 'Surulere Heights' }).click();
  await page.getByRole('link', { name: 'Add tenant' }).click();
  await page.getByLabel('Full name').fill('Yetunde Afolabi');
  await page.getByLabel('Email').fill('yetunde@example.com');
  await page.getByLabel('Phone').fill('+234 809 555 0101');
  await page.getByLabel('Unit / Flat').fill('Flat 1');
  await page.getByLabel('Monthly rent (₦)').fill('350000');
  await page.getByLabel('Rent due day').fill('1');
  await page.getByLabel('Lease start').fill('2026-10-01');
  await page.getByTestId('submit').click();
  await expect(page.getByRole('heading', { name: 'Yetunde Afolabi', level: 1 })).toBeVisible();
  // Due on the 1st, today is the 14th, nothing paid → overdue.
  await expect(page.getByTestId('tenant-arrears')).toHaveText('₦350,000');
});

test('records a payment and blocks overpayment', async ({ page }) => {
  await login(page);
  await page.goto('/tenants?q=Yetunde');
  await page.getByRole('link', { name: /Yetunde Afolabi/ }).click();
  await page.getByRole('link', { name: 'Record payment' }).click();
  await page.getByLabel('Amount (₦)').fill('400000');
  await page.getByTestId('submit').click();
  await expect(page.getByTestId('err-amount')).toHaveText('Only ₦350,000 is outstanding for October 2026');

  await page.getByLabel('Amount (₦)').fill('350000');
  await page.getByLabel('Reference (optional)').fill('TRF-E2E-001');
  await page.getByTestId('submit').click();
  await expect(page.getByTestId('receipt')).toContainText('₦350,000');
  await expect(page.getByTestId('receipt')).toContainText('Yetunde Afolabi');

  await page.goto('/payments');
  await expect(page.getByTestId('payments-table')).toContainText('TRF-E2E-001');
});

test('rent roll navigates between months', async ({ page }) => {
  await login(page);
  await page.getByTestId('nav-rent-roll').click();
  await expect(page.getByTestId('rent-period')).toHaveText('October 2026');
  await expect(page.getByTestId('rent-table')).toContainText('Yetunde Afolabi');
  await page.getByLabel('Previous month').click();
  await expect(page.getByTestId('rent-period')).toHaveText('September 2026');
  await expect(page.getByTestId('rent-table')).not.toContainText('Yetunde Afolabi');
});

test('sends an overdue reminder from a tenant profile', async ({ page }) => {
  await login(page);
  await page.goto('/tenants?q=Emeka');
  await page.getByRole('link', { name: /Emeka Obi/ }).click();
  await page.getByLabel('Channel').selectOption('sms');
  await page.getByTestId('send-reminder').click();
  await expect(page.getByTestId('toast')).toContainText('Reminder sent');
  await expect(page.getByText(/^SMS · /).first()).toBeVisible();
});

test('reminds all overdue tenants at once', async ({ page }) => {
  await login(page);
  await page.getByTestId('nav-reminders').click();
  await expect(page.getByRole('heading', { name: 'Overdue reminders' })).toBeVisible();
  await expect(page.getByTestId('overdue-item').first()).toBeVisible();
  const count = await page.getByTestId('overdue-item').count();
  expect(count).toBeGreaterThan(0);
  await page.getByTestId('remind-all').click();
  await expect(page.getByTestId('toast')).toContainText(`${count} reminder`);
});

test('summary API requires auth and returns numbers', async ({ page, request }) => {
  expect((await request.get('/api/summary')).status()).toBe(401);
  await login(page);
  const res = await page.request.get('/api/summary');
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(body).toMatchObject({ period: '2026-10', properties: 6 });
});

test('deletes the property created in this run', async ({ page }) => {
  await login(page);
  await page.goto('/properties');
  await page.getByTestId('property-card').filter({ hasText: 'Surulere Heights' }).click();
  page.once('dialog', (d) => d.accept());
  await page.getByTestId('delete').click();
  await expect(page).toHaveURL(/\/properties/);
  await expect(page.getByTestId('property-card')).toHaveCount(5);
});

test('signs out', async ({ page }) => {
  await login(page);
  await page.getByTestId('logout').click();
  await expect(page).toHaveURL(/\/login$/);
});
