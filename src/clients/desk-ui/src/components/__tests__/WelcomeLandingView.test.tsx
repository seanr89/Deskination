import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WelcomeLandingView } from '../WelcomeLandingView';
import { AuthView } from '../AuthView';
import * as AuthHook from '../../hooks/useAuth';
import * as FirebaseConfig from '../../config/firebase';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../config/firebase', () => ({
  resolveFirebaseConfig: vi.fn(),
}));

function createAuthMock(
  overrides: Partial<ReturnType<typeof AuthHook.useAuth>> = {}
) {
  return {
    firebaseUser: null,
    workspaceUser: null,
    idToken: null,
    tokenResult: null,
    isLoading: false,
    isAuthenticated: false,
    isFirebaseConfigured: true,
    authMode: 'firebase' as const,
    error: null,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(async () => {}),
    sendPasswordReset: vi.fn(),
    updatePassword: vi.fn(),
    refreshIdToken: vi.fn(async () => null),
    saveRuntimeConfig: vi.fn(() => true),
    clearRuntimeConfig: vi.fn(),
    clearError: vi.fn(),
    ...overrides,
  };
}

describe('WelcomeLandingView & AuthView navigation', () => {
  const mockedUseAuth = vi.mocked(AuthHook.useAuth);
  const mockedResolveFirebaseConfig = vi.mocked(FirebaseConfig.resolveFirebaseConfig);

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAuth.mockReturnValue(createAuthMock());
    mockedResolveFirebaseConfig.mockReturnValue(null);
  });

  it('renders the welcome landing page with overview, core features, hubs, and auth CTAs without enterprise copy', () => {
    const html = renderToStaticMarkup(
      <WelcomeLandingView
        onSignIn={vi.fn()}
        onCreateAccount={vi.fn()}
        onOpenCookiePreferences={vi.fn()}
      />
    );

    expect(html).toContain('Welcome to Deskination');
    expect(html).toContain('Internal Office Desk Booking');
    expect(html).toContain('Interactive Floorplans');
    expect(html).toContain('Availability Calendar');
    expect(html).toContain('Office Directory &amp; Check-In');
    expect(html).toContain('Belfast Hub');
    expect(html).toContain('London Hub');
    expect(html).toContain('Dubai Hub');
    expect(html).toContain('Sign In');
    expect(html).toContain('Create Account');
    expect(html).toContain('Cookie Preferences');
    expect(html.toLowerCase()).not.toContain('enterprise');
  });

  it('renders AuthView with pre-selected signup tab and Back to Welcome button when provided', () => {
    const html = renderToStaticMarkup(
      <AuthView initialTab="signup" onBackToWelcome={vi.fn()} />
    );

    expect(html).toContain('Create your employee account');
    expect(html).toContain('Back to Welcome');
    expect(html).toContain('Work Email Address');
  });
});
