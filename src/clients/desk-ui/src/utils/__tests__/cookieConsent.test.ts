import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  COOKIE_CONSENT_STORAGE_KEY,
  getStoredCookieConsent,
  saveCookieConsent,
  clearCookieConsent,
  isCookieCategoryAllowed,
} from '../cookieConsent';

function createStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

describe('cookieConsent', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null when no consent has been stored', () => {
    expect(getStoredCookieConsent()).toBeNull();
  });

  it('returns null when stored JSON is malformed or invalid', () => {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, '{not-valid-json');
    expect(getStoredCookieConsent()).toBeNull();

    localStorage.setItem(
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify({ strictlyNecessary: false, analytics: 'yes' })
    );
    expect(getStoredCookieConsent()).toBeNull();
  });

  it('persists and retrieves valid cookie consent preferences', () => {
    const saved = saveCookieConsent({ analytics: true, marketing: false });

    expect(saved.strictlyNecessary).toBe(true);
    expect(saved.analytics).toBe(true);
    expect(saved.marketing).toBe(false);
    expect(saved.updatedAt).toBeTruthy();

    const loaded = getStoredCookieConsent();
    expect(loaded).toEqual(saved);
  });

  it('clears saved cookie consent preferences', () => {
    saveCookieConsent({ analytics: true, marketing: true });
    expect(getStoredCookieConsent()).not.toBeNull();

    clearCookieConsent();
    expect(getStoredCookieConsent()).toBeNull();
  });

  it('allows strictlyNecessary always and gates analytics/marketing until explicit opt-in', () => {
    expect(isCookieCategoryAllowed('strictlyNecessary')).toBe(true);
    expect(isCookieCategoryAllowed('analytics')).toBe(false);
    expect(isCookieCategoryAllowed('marketing')).toBe(false);

    saveCookieConsent({ analytics: false, marketing: true });
    expect(isCookieCategoryAllowed('strictlyNecessary')).toBe(true);
    expect(isCookieCategoryAllowed('analytics')).toBe(false);
    expect(isCookieCategoryAllowed('marketing')).toBe(true);
  });
});
