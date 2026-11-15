import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthView } from '../AuthView';
import * as AuthHook from '../../hooks/useAuth';
import * as FirebaseConfig from '../../config/firebase';

vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../config/firebase', () => ({
  resolveFirebaseConfig: vi.fn(() => null),
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

describe('AuthView', () => {
  const mockedUseAuth = vi.mocked(AuthHook.useAuth);
  const mockedResolveFirebaseConfig = vi.mocked(
    FirebaseConfig.resolveFirebaseConfig
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveFirebaseConfig.mockReturnValue(null);
    mockedUseAuth.mockReturnValue(createAuthMock());
  });

  it('renders sign-in form by default and hides Back to Welcome when callback is omitted', () => {
    const html = renderToStaticMarkup(<AuthView initialTab="signin" />);

    expect(html).toContain('Sign in to your workspace');
    expect(html).toContain('id="signin-email"');
    expect(html).toContain('id="current-password"');
    expect(html).toContain('Forgot password?');
    expect(html).toContain('Sign In');
    expect(html).not.toContain('Back to Welcome');
    expect(html).not.toContain('role="alert"');
  });

  it('renders sign-up form with password complexity rules when initialTab="signup"', () => {
    const html = renderToStaticMarkup(<AuthView initialTab="signup" />);

    expect(html).toContain('Create your employee account');
    expect(html).toContain('id="signup-email"');
    expect(html).toContain('id="new-password"');
    expect(html).toContain('id="full-name"');
    expect(html).toContain('At least 8 characters');
    expect(html).toContain('One uppercase letter');
    expect(html).toContain('One number');
    expect(html).toContain('One special character');
  });

  it('renders password reset form when initialTab="reset"', () => {
    const html = renderToStaticMarkup(<AuthView initialTab="reset" />);

    expect(html).toContain('Reset your password');
    expect(html).toContain('id="reset-email"');
    expect(html).toContain('Send Reset Link');
    expect(html).toContain('Back to Sign In');
  });

  it('renders Back to Welcome button when onBackToWelcome is provided and displays error alert banner', () => {
    mockedUseAuth.mockReturnValue(
      createAuthMock({
        error: {
          code: 'auth/invalid-credential',
          message: 'Invalid email address or password.',
        },
      })
    );

    const html = renderToStaticMarkup(
      <AuthView initialTab="signin" onBackToWelcome={vi.fn()} />
    );

    expect(html).toContain('Back to Welcome');
    expect(html).toContain('role="alert"');
    expect(html).toContain('Authentication Error');
    expect(html).toContain('Invalid email address or password.');
  });

  it('displays Firebase SDK Connected vs Firebase Configuration Required status indicator', () => {
    mockedUseAuth.mockReturnValue(
      createAuthMock({ isFirebaseConfigured: true })
    );
    const connectedHtml = renderToStaticMarkup(<AuthView />);
    expect(connectedHtml).toContain('Firebase Auth SDK Connected');
    expect(connectedHtml).not.toContain('Firebase Configuration Required');

    mockedUseAuth.mockReturnValue(
      createAuthMock({ isFirebaseConfigured: false })
    );
    const unconfiguredHtml = renderToStaticMarkup(<AuthView />);
    expect(unconfiguredHtml).toContain('Firebase Configuration Required');
    expect(unconfiguredHtml).toContain('VITE_FIREBASE_*');
  });
});
