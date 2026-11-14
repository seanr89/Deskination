import React, { useEffect, useState } from 'react';
import { Cookie, ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
import {
  getStoredCookieConsent,
  saveCookieConsent,
  type CookieConsentPreferences,
} from '../utils/cookieConsent';

export interface CookieConsentBannerProps {
  isPreferencesOpen: boolean;
  onOpenPreferences: () => void;
  onClosePreferences: () => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  isPreferencesOpen,
  onOpenPreferences,
  onClosePreferences,
}) => {
  const [savedConsent, setSavedConsent] = useState<CookieConsentPreferences | null>(() =>
    getStoredCookieConsent()
  );
  const [analyticsEnabled, setAnalyticsEnabled] = useState<boolean>(
    () => savedConsent?.analytics ?? false
  );
  const [marketingEnabled, setMarketingEnabled] = useState<boolean>(
    () => savedConsent?.marketing ?? false
  );

  // Sync draft checkbox state with the latest stored consent whenever the modal opens
  useEffect(() => {
    if (!isPreferencesOpen) {
      return;
    }

    const latest = getStoredCookieConsent();
    setSavedConsent(latest);
    setAnalyticsEnabled(Boolean(latest?.analytics));
    setMarketingEnabled(Boolean(latest?.marketing));
  }, [isPreferencesOpen]);

  // Allow dismissing the preferences dialog with the Escape key
  useEffect(() => {
    if (!isPreferencesOpen || typeof window === 'undefined') {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClosePreferences();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPreferencesOpen, onClosePreferences]);

  const handleAcceptAll = () => {
    const next = saveCookieConsent({ analytics: true, marketing: true });
    setSavedConsent(next);
    setAnalyticsEnabled(true);
    setMarketingEnabled(true);
    onClosePreferences();
  };

  const handleRejectNonEssential = () => {
    const next = saveCookieConsent({ analytics: false, marketing: false });
    setSavedConsent(next);
    setAnalyticsEnabled(false);
    setMarketingEnabled(false);
    onClosePreferences();
  };

  const handleSaveCustomPreferences = (event: React.FormEvent) => {
    event.preventDefault();
    const next = saveCookieConsent({
      analytics: analyticsEnabled,
      marketing: marketingEnabled,
    });
    setSavedConsent(next);
    onClosePreferences();
  };

  const showBanner = savedConsent === null && !isPreferencesOpen;

  return (
    <>
      {showBanner && (
        <section
          role="region"
          aria-label="Cookie consent banner"
          className="fixed bottom-0 inset-x-0 z-40 p-3 sm:p-4 pointer-events-none"
        >
          <div className="pointer-events-auto max-w-5xl mx-auto bg-white border border-slate-200 rounded-xl shadow-lg p-4 sm:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Cookie className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Cookie &amp; Privacy Preferences
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                    Deskination uses strictly necessary storage to keep your workspace session
                    signed in. Optional analytics and marketing tracking cookies remain disabled
                    unless you choose to accept them, and you can update or withdraw consent anytime
                    via Cookie Preferences.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleRejectNonEssential}
                  className="px-3.5 py-2 min-h-[40px] rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 text-xs font-semibold transition-colors"
                >
                  Reject Non-Essential
                </button>
                <button
                  type="button"
                  onClick={onOpenPreferences}
                  className="px-3.5 py-2 min-h-[40px] rounded-lg border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                  Manage Preferences
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-3.5 py-2 min-h-[40px] rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold transition-colors"
                >
                  Accept All
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {isPreferencesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-preferences-title"
            className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-slate-100">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" aria-hidden="true" />
                <div>
                  <h2 id="cookie-preferences-title" className="text-base font-semibold text-slate-900">
                    Cookie &amp; Privacy Preferences
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review how Deskination uses browser storage and manage optional tracking cookies.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClosePreferences}
                aria-label="Close cookie preferences"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomPreferences}>
              <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
                {/* Category 1: Strictly Necessary */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="cookie-necessary"
                      className="text-xs font-semibold text-slate-900 inline-flex items-center gap-2.5 min-h-[28px]"
                    >
                      <input
                        id="cookie-necessary"
                        type="checkbox"
                        checked
                        disabled
                        className="w-4 h-4 rounded accent-slate-700 cursor-not-allowed opacity-75"
                      />
                      <span>Strictly Necessary Cookies &amp; Storage</span>
                    </label>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Always Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 pl-6.5 leading-relaxed">
                    Required for Firebase authentication tokens, workspace preferences, and booking
                    session security. These cannot be disabled.
                  </p>
                </div>

                {/* Category 2: Analytics & Performance */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1.5">
                  <label
                    htmlFor="cookie-analytics"
                    className="flex items-center justify-between gap-3 min-h-[44px] cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-2.5 text-xs font-semibold text-slate-900">
                      <input
                        id="cookie-analytics"
                        type="checkbox"
                        checked={analyticsEnabled}
                        onChange={e => setAnalyticsEnabled(e.target.checked)}
                        className="w-4 h-4 rounded accent-indigo-600 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                      />
                      <span>Analytics &amp; Performance Cookies</span>
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">
                      {analyticsEnabled ? 'Opted In' : 'Opted Out'}
                    </span>
                  </label>
                  <p className="text-xs text-slate-600 pl-6.5 leading-relaxed">
                    Helps us measure page performance and desk booking workflow reliability using
                    aggregated diagnostics. Disabled unless you opt in.
                  </p>
                </div>

                {/* Category 3: Marketing & Tracking */}
                <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-1.5">
                  <label
                    htmlFor="cookie-marketing"
                    className="flex items-center justify-between gap-3 min-h-[44px] cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-2.5 text-xs font-semibold text-slate-900">
                      <input
                        id="cookie-marketing"
                        type="checkbox"
                        checked={marketingEnabled}
                        onChange={e => setMarketingEnabled(e.target.checked)}
                        className="w-4 h-4 rounded accent-indigo-600 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                      />
                      <span>Marketing &amp; Tracking Cookies</span>
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">
                      {marketingEnabled ? 'Opted In' : 'Opted Out'}
                    </span>
                  </label>
                  <p className="text-xs text-slate-600 pl-6.5 leading-relaxed">
                    Used for campaign attribution, internal adoption announcements, and cross-channel
                    tracking. Remains blocked unless you explicitly opt in.
                  </p>
                </div>

                {savedConsent && (
                  <p className="text-[11px] text-slate-500">
                    Last updated:{' '}
                    <span className="font-mono text-slate-700">{savedConsent.updatedAt}</span>
                  </p>
                )}
              </div>

              <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleRejectNonEssential}
                  className="px-3.5 py-2 min-h-[40px] rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 text-xs font-semibold transition-colors"
                >
                  Reject Non-Essential
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-3.5 py-2 min-h-[40px] rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 text-xs font-semibold transition-colors"
                  >
                    Save Preferences
                  </button>
                  <button
                    type="button"
                    onClick={handleAcceptAll}
                    className="px-3.5 py-2 min-h-[40px] rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold transition-colors"
                  >
                    Accept All
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
