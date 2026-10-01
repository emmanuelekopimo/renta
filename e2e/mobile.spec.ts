import { expect, test } from '@playwright/test';
import { login } from './helpers';

test('mobile layout uses the bottom tab bar', async ({ page }) => {
  await login(page);
  await expect(page.locator('.sidebar')).toBeHidden();
  const tabs = page.getByRole('navigation', { name: 'Mobile' });
  await expect(tabs).toBeVisible();
  await tabs.getByRole('link', { name: 'Rent' }).click();
  await expect(page.getByTestId('rent-period')).toBeVisible();
});
