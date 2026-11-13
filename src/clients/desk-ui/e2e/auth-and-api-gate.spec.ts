import { test, expect } from '@playwright/test';

test.describe('Deskination UI — Mock Removal & Firebase Auth Gate E2E', () => {
  test('renders Firebase Auth gate without Demo Mode personas or localStorage mock data', async ({
    page,
  }) => {
    await page.goto('/');

    // 1. Verify AuthView renders for unauthenticated sessions with internal single-company copy
    await expect(page).toHaveTitle('Deskination - Internal Office Desk Booking');
    await expect(page.getByText('Internal Office Desk Booking')).toBeVisible();
    await expect(page.getByText(/enterprise/i)).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Sign in to your workspace' })
    ).toBeVisible();

    const metaDescription = await page
      .locator('meta[name="description"]')
      .getAttribute('content');
    expect(metaDescription).toBeTruthy();
    expect(metaDescription?.toLowerCase()).not.toContain('enterprise');

    // 2. Verify Demo Mode quick-launch personas and fallback badges have been removed
    await expect(page.getByText('Quick Demo Personas')).toHaveCount(0);
    await expect(page.getByText('Demo Fallback Ready')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^Demo$/ })).toHaveCount(0);

    // 3. Verify no domain mock data is seeded in localStorage on boot
    const localStorageKeys = await page.evaluate(() => Object.keys(localStorage));
    expect(localStorageKeys).not.toContain('deskination_users_v1');
    expect(localStorageKeys).not.toContain('deskination_locations_v1');
    expect(localStorageKeys).not.toContain('deskination_desks_v1');
    expect(localStorageKeys).not.toContain('deskination_bookings_v1');
    expect(localStorageKeys).not.toContain('deskination_current_user_v1');
    expect(localStorageKeys).not.toContain('flexdesk_users_v1');
    expect(localStorageKeys).not.toContain('flexdesk_locations_v1');
    expect(localStorageKeys).not.toContain('flexdesk_desks_v1');
    expect(localStorageKeys).not.toContain('flexdesk_bookings_v1');
    expect(localStorageKeys).not.toContain('flexdesk_current_user_v1');
  });

  test('allows toggling between Sign In, Create Account, and Password Reset tabs and opening Firebase Config', async ({
    page,
  }) => {
    await page.goto('/');

    // Switch to Create Account tab
    await page.getByRole('button', { name: 'Create Account' }).first().click();
    await expect(
      page.getByRole('heading', { name: 'Create your employee account' })
    ).toBeVisible();

    // Switch back to Sign In and open Password Reset tab
    await page.getByRole('button', { name: 'Sign In' }).first().click();
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await expect(
      page.getByRole('heading', { name: 'Reset your password' })
    ).toBeVisible();

    // Toggle Runtime Firebase Config panel
    await page.getByRole('button', { name: /Firebase Config/i }).click();
    await expect(
      page.getByText('Runtime Firebase Project Settings')
    ).toBeVisible();
  });
});
