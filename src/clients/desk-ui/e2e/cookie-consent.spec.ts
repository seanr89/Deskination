import { test, expect } from '@playwright/test';

test.describe('Cookie Consent Banner & Preference Management E2E', () => {
  test('allows rejecting non-essential cookies and persists choice', async ({ page }) => {
    await page.goto('/');

    const banner = page.getByRole('region', { name: 'Cookie consent banner' });
    await expect(banner).toBeVisible();
    await expect(banner.getByRole('button', { name: 'Reject Non-Essential' })).toBeVisible();
    await expect(banner.getByRole('button', { name: 'Manage Preferences' })).toBeVisible();
    await expect(banner.getByRole('button', { name: 'Accept All' })).toBeVisible();

    // Should not persist consent before explicit choice
    const beforeChoice = await page.evaluate(() =>
      localStorage.getItem('deskination_cookie_consent_v1')
    );
    expect(beforeChoice).toBeNull();

    await banner.getByRole('button', { name: 'Reject Non-Essential' }).click();
    await expect(banner).toHaveCount(0);

    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('deskination_cookie_consent_v1') || 'null')
    );
    expect(stored).toMatchObject({
      strictlyNecessary: true,
      analytics: false,
      marketing: false,
    });
  });

  test('allows customizing analytics and marketing preferences via dialog', async ({ page }) => {
    await page.goto('/');

    await page
      .getByRole('region', { name: 'Cookie consent banner' })
      .getByRole('button', { name: 'Manage Preferences' })
      .click();

    const dialog = page.getByRole('dialog', { name: /Cookie & Privacy Preferences/i });
    await expect(dialog).toBeVisible();

    const necessaryToggle = dialog.getByLabel(/Strictly Necessary Cookies & Storage/i);
    await expect(necessaryToggle).toBeChecked();
    await expect(necessaryToggle).toBeDisabled();

    const marketingToggle = dialog.getByLabel(/Marketing & Tracking Cookies/i);
    await expect(marketingToggle).not.toBeChecked();
    await marketingToggle.check();
    await expect(marketingToggle).toBeChecked();

    await dialog.getByRole('button', { name: 'Save Preferences' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Cookie consent banner' })).toHaveCount(0);

    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('deskination_cookie_consent_v1') || 'null')
    );
    expect(stored).toMatchObject({
      strictlyNecessary: true,
      analytics: false,
      marketing: true,
    });
  });

  test('allows accepting all cookies via Accept All button', async ({ page }) => {
    await page.goto('/');

    await page
      .getByRole('region', { name: 'Cookie consent banner' })
      .getByRole('button', { name: 'Accept All' })
      .click();

    await expect(page.getByRole('region', { name: 'Cookie consent banner' })).toHaveCount(0);

    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('deskination_cookie_consent_v1') || 'null')
    );
    expect(stored).toMatchObject({
      strictlyNecessary: true,
      analytics: true,
      marketing: true,
    });
  });
});
