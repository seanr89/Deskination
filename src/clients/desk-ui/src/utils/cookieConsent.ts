export const COOKIE_CONSENT_STORAGE_KEY = 'deskination_cookie_consent_v1';

export type CookieCategory = 'strictlyNecessary' | 'analytics' | 'marketing';

export interface CookieConsentPreferences {
  strictlyNecessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

function isValidConsentRecord(value: unknown): value is CookieConsentPreferences {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    record.strictlyNecessary === true &&
    typeof record.analytics === 'boolean' &&
    typeof record.marketing === 'boolean' &&
    typeof record.updatedAt === 'string' &&
    record.updatedAt.length > 0
  );
}

/**
 * Reads saved cookie consent preferences from localStorage, returning null if unset or malformed.
 */
export function getStoredCookieConsent(): CookieConsentPreferences | null {
  try {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    return isValidConsentRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Persists the user's cookie consent choices with Strictly Necessary always enabled.
 */
export function saveCookieConsent(prefs: {
  analytics: boolean;
  marketing: boolean;
}): CookieConsentPreferences {
  const record: CookieConsentPreferences = {
    strictlyNecessary: true,
    analytics: Boolean(prefs.analytics),
    marketing: Boolean(prefs.marketing),
    updatedAt: new Date().toISOString(),
  };

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));
    }
  } catch {
    // Ignore storage access errors in SSR/restricted environments
  }

  return record;
}

/**
 * Clears saved cookie consent preferences so the consent banner can be prompted again.
 */
export function clearCookieConsent(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
    }
  } catch {
    // Ignore storage access errors in SSR/restricted environments
  }
}

/**
 * Returns whether the given cookie category is permitted under current user consent.
 * Non-essential categories ('analytics', 'marketing') default to false until explicitly opted in.
 */
export function isCookieCategoryAllowed(category: CookieCategory): boolean {
  if (category === 'strictlyNecessary') {
    return true;
  }

  const stored = getStoredCookieConsent();
  if (!stored) {
    return false;
  }

  return Boolean(stored[category]);
}
