import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CookieConsentBanner } from '../CookieConsentBanner';
import * as cookieConsentUtils from '../../utils/cookieConsent';

vi.mock('../../utils/cookieConsent', () => ({
  getStoredCookieConsent: vi.fn(),
  saveCookieConsent: vi.fn(),
}));

describe('CookieConsentBanner', () => {
  const mockedGetStoredCookieConsent = vi.mocked(cookieConsentUtils.getStoredCookieConsent);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the cookie consent banner with equal action controls when no consent is saved', () => {
    mockedGetStoredCookieConsent.mockReturnValue(null);

    const html = renderToStaticMarkup(
      <CookieConsentBanner
        isPreferencesOpen={false}
        onOpenPreferences={vi.fn()}
        onClosePreferences={vi.fn()}
      />
    );

    expect(html).toContain('Cookie &amp; Privacy Preferences');
    expect(html).toContain('Reject Non-Essential');
    expect(html).toContain('Manage Preferences');
    expect(html).toContain('Accept All');
    expect(html).not.toContain('role="dialog"');
  });

  it('hides the banner once consent has been recorded and modal is closed', () => {
    mockedGetStoredCookieConsent.mockReturnValue({
      strictlyNecessary: true,
      analytics: false,
      marketing: false,
      updatedAt: '2026-11-13T20:00:00.000Z',
    });

    const html = renderToStaticMarkup(
      <CookieConsentBanner
        isPreferencesOpen={false}
        onOpenPreferences={vi.fn()}
        onClosePreferences={vi.fn()}
      />
    );

    expect(html).toBe('');
  });

  it('renders the preferences dialog with Strictly Necessary, Analytics, and Marketing controls', () => {
    mockedGetStoredCookieConsent.mockReturnValue({
      strictlyNecessary: true,
      analytics: true,
      marketing: false,
      updatedAt: '2026-11-13T20:00:00.000Z',
    });

    const html = renderToStaticMarkup(
      <CookieConsentBanner
        isPreferencesOpen={true}
        onOpenPreferences={vi.fn()}
        onClosePreferences={vi.fn()}
      />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('Strictly Necessary Cookies &amp; Storage');
    expect(html).toContain('Always Active');
    expect(html).toContain('Analytics &amp; Performance Cookies');
    expect(html).toContain('Marketing &amp; Tracking Cookies');
    expect(html).toContain('Save Preferences');
    expect(html).toContain('Reject Non-Essential');
    expect(html).toContain('Accept All');
  });
});
