import { expect, type Page } from '@playwright/test';

export async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill('demo@renta.app');
  await page.getByLabel('Password').fill('renta123');
  await page.getByTestId('submit').click();
  await expect(page).toHaveURL('/');
}
