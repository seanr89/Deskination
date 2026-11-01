import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useDeskBooking } from '../context/DeskBookingContext';
import { resolveFirebaseConfig } from '../config/firebase';
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Building2,
  Sliders,
  Sparkles,
  ArrowRight,
  UserPlus,
  LogIn,
} from 'lucide-react';

type AuthScreenTab = 'signin' | 'signup' | 'reset';

export const AuthView: React.FC = () => {
  const {
    signIn,
    signUp,
    sendPasswordReset,
    enterDemoMode,
    isFirebaseConfigured,
    saveRuntimeConfig,
    clearRuntimeConfig,
    error,
    clearError,
  } = useAuth();
  const { users } = useDeskBooking();

  const [activeTab, setActiveTab] = useState<AuthScreenTab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('Frontend Engineering');
  const [jobTitle, setJobTitle] = useState('Software Engineer');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSentTo, setResetSentTo] = useState<string | null>(null);

  // Runtime Firebase Config Panel state
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const existingConfig = resolveFirebaseConfig();
  const [cfgApiKey, setCfgApiKey] = useState(existingConfig?.apiKey || '');
  const [cfgAuthDomain, setCfgAuthDomain] = useState(existingConfig?.authDomain || '');
  const [cfgProjectId, setCfgProjectId] = useState(existingConfig?.projectId || '');
  const [cfgAppId, setCfgAppId] = useState(existingConfig?.appId || '');
  const [cfgUseEmulator, setCfgUseEmulator] = useState(Boolean(existingConfig?.useEmulator));
  const [cfgEmulatorUrl, setCfgEmulatorUrl] = useState(
    existingConfig?.emulatorUrl || 'http://localhost:9099'
  );
  const [configSavedNotice, setConfigSavedNotice] = useState(false);

  const formContainerRef = useRef<HTMLDivElement>(null);

  // Sync aria-invalid with CSS :user-invalid state & provide WeakMap fallback
  useEffect(() => {
    const root = formContainerRef.current;
    if (!root) return;

    const dirtyState = new WeakMap<
      HTMLInputElement,
      { hasInteracted: boolean; hasBlurred: boolean }
    >();
    const supportsUserInvalid =
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('selector(:user-invalid)');

    const syncInputAriaAndFallback = (input: HTMLInputElement) => {
      if (!supportsUserInvalid) {
        const isValid = input.checkValidity();
        input.classList.toggle('user-invalid-fallback', !isValid);
        input.classList.toggle('user-valid-fallback', isValid);
        if (!isValid) {
          input.setAttribute('aria-invalid', 'true');
        } else {
          input.removeAttribute('aria-invalid');
        }
        return;
      }

      try {
        const matchesInvalid = input.matches(':user-invalid');
        input.setAttribute('aria-invalid', matchesInvalid ? 'true' : 'false');
      } catch {
        // Ignore selector errors
      }
    };

    const handleBlur = (e: Event) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;
      const state = dirtyState.get(target) || { hasInteracted: false, hasBlurred: false };
      state.hasBlurred = true;
      dirtyState.set(target, state);
      if (state.hasInteracted || supportsUserInvalid) {
        syncInputAriaAndFallback(target);
      }
    };

    const handleInput = (e: Event) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;
      const state = dirtyState.get(target) || { hasInteracted: false, hasBlurred: false };
      state.hasInteracted = true;
      dirtyState.set(target, state);
      if (state.hasBlurred || target.hasAttribute('aria-invalid')) {
        syncInputAriaAndFallback(target);
      }
    };

    root.addEventListener('blur', handleBlur, true);
    root.addEventListener('input', handleInput);
    return () => {
      root.removeEventListener('blur', handleBlur, true);
      root.removeEventListener('input', handleInput);
    };
  }, [activeTab]);

  const switchTab = (tab: AuthScreenTab) => {
    clearError();
    setResetSentTo(null);
    setShowPassword(false);
    setActiveTab(tab);
  };

  const handleSignInSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await signIn({ email, password });
    } catch {
      // Error state is managed in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await signUp({
        email,
        password,
        displayName: fullName,
        department,
        jobTitle,
      });
    } catch {
      // Error state is managed in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setResetSentTo(null);
    try {
      await sendPasswordReset(email);
      setResetSentTo(email.trim());
    } catch {
      // Error state is managed in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveRuntimeConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    saveRuntimeConfig({
      apiKey: cfgApiKey,
      authDomain: cfgAuthDomain,
      projectId: cfgProjectId,
      appId: cfgAppId,
      useEmulator: cfgUseEmulator,
      emulatorUrl: cfgEmulatorUrl,
    });
    setConfigSavedNotice(true);
    setTimeout(() => setConfigSavedNotice(false), 3000);
  };

  return (
    <div
      ref={formContainerRef}
      className="min-h-screen bg-slate-50 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 text-slate-900"
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex items-center justify-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-xs">
            FD
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              FlexDesk
            </span>
            <span className="block text-xs text-slate-500">
              Deskination Hybrid Workplace Platform
            </span>
          </div>
        </div>

        <h1 className="mt-6 text-center text-2xl font-bold tracking-tight text-slate-900">
          {activeTab === 'signin' && 'Sign in to your workspace'}
          {activeTab === 'signup' && 'Create your employee account'}
          {activeTab === 'reset' && 'Reset your password'}
        </h1>
        <p className="mt-1.5 text-center text-xs text-slate-600">
          {activeTab === 'signin' &&
            'Authenticate with Firebase Email & Password to book desks and manage office reservations.'}
          {activeTab === 'signup' &&
            'Register with your company email to match your workspace profile or join as an employee.'}
          {activeTab === 'reset' &&
            'Enter your registered email address and we will send a password reset link.'}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md space-y-5">
        {/* Primary Auth Card: Inputs and Submit button kept at top so mobile keyboards never obstruct */}
        <div className="bg-white py-6 px-6 shadow-sm rounded-2xl border border-slate-200/90 sm:px-8">
          {/* Mode Tabs */}
          {activeTab !== 'reset' && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg mb-6">
              <button
                type="button"
                onClick={() => switchTab('signin')}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'signin'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchTab('signup')}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-md transition-all ${
                  activeTab === 'signup'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Create Account
              </button>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold">Authentication Error</div>
                <p className="mt-0.5 text-rose-700 leading-relaxed">{error.message}</p>
              </div>
            </div>
          )}

          {/* Password Reset Confirmation */}
          {resetSentTo && (
            <div
              role="status"
              aria-live="polite"
              className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Password reset email sent</div>
                <p className="mt-0.5 text-emerald-700">
                  Check <strong>{resetSentTo}</strong> for instructions to reset your password.
                </p>
              </div>
            </div>
          )}

          {/* SIGN IN FORM */}
          {activeTab === 'signin' && (
            <form method="post" onSubmit={handleSignInSubmit} className="space-y-4">
              <div className="auth-field">
                <label
                  htmlFor="signin-email"
                  className="block text-xs font-semibold text-slate-800 mb-1"
                >
                  Work Email Address
                </label>
                <span id="signin-email-hint" className="block text-[11px] text-slate-500 mb-1.5">
                  Format: name@acme-corp.internal
                </span>
                <div className="relative">
                  <input
                    type="email"
                    id="signin-email"
                    name="email"
                    required
                    autoComplete="username"
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    enterKeyHint="next"
                    aria-describedby="signin-email-hint"
                    aria-errormessage="signin-email-error"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="sarah.chen@acme-corp.internal"
                    className="w-full text-base sm:text-sm px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 min-h-[44px]"
                  />
                  <div
                    id="signin-email-error"
                    className="error-msg items-center gap-1.5 text-xs text-rose-700 mt-1.5 font-medium"
                  >
                    <span aria-hidden="true">❌</span> Please enter a valid work email address.
                  </div>
                </div>
              </div>

              <div className="auth-field">
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="current-password"
                    className="block text-xs font-semibold text-slate-800"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => switchTab('reset')}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="current-password"
                    name="password"
                    required
                    autoComplete="current-password"
                    enterKeyHint="done"
                    aria-errormessage="signin-password-error"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full text-base sm:text-sm pl-3.5 pr-11 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-describedby="signin-toggle-warning"
                    className="absolute right-2.5 top-2.5 p-1 text-slate-500 hover:text-slate-800 rounded-md"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                  <span id="signin-toggle-warning" className="visually-hidden">
                    Warning: this will display your password on the screen.
                  </span>
                  <div
                    id="signin-password-error"
                    className="error-msg items-center gap-1.5 text-xs text-rose-700 mt-1.5 font-medium"
                  >
                    <span aria-hidden="true">❌</span> Please enter your password.
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold shadow-xs transition-colors min-h-[44px]"
              >
                <Lock className="w-4 h-4" />
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* SIGN UP FORM */}
          {activeTab === 'signup' && (
            <form method="post" onSubmit={handleSignUpSubmit} className="space-y-4">
              <div className="auth-field">
                <label
                  htmlFor="signup-email"
                  className="block text-xs font-semibold text-slate-800 mb-1"
                >
                  Work Email Address
                </label>
                <span id="signup-email-hint" className="block text-[11px] text-slate-500 mb-1.5">
                  Use your company email (matches existing employee/admin profile if listed)
                </span>
                <input
                  type="email"
                  id="signup-email"
                  name="email"
                  required
                  autoComplete="username"
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  enterKeyHint="next"
                  aria-describedby="signup-email-hint"
                  aria-errormessage="signup-email-error"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jordan.smith@acme-corp.internal"
                  className="w-full text-base sm:text-sm px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 min-h-[44px]"
                />
                <div
                  id="signup-email-error"
                  className="error-msg items-center gap-1.5 text-xs text-rose-700 mt-1.5 font-medium"
                >
                  <span aria-hidden="true">❌</span> Please enter a valid email address.
                </div>
              </div>

              <div className="auth-field">
                <label
                  htmlFor="new-password"
                  className="block text-xs font-semibold text-slate-800 mb-1"
                >
                  New Password
                </label>
                {/* Hints and rules placed above the input so mobile keyboards do not obscure them */}
                <ul
                  id="password-rules"
                  className="rules-list text-[11px] text-slate-500 mb-2 grid grid-cols-2 gap-x-2 gap-y-0.5 list-disc list-inside"
                >
                  <li>At least 8 characters</li>
                  <li>One uppercase letter</li>
                  <li>One number</li>
                  <li>One special character</li>
                </ul>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="new-password"
                    name="new-password"
                    required
                    autoComplete="new-password"
                    minLength={8}
                    pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}"
                    enterKeyHint="next"
                    aria-describedby="password-rules"
                    aria-errormessage="signup-password-error"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full text-base sm:text-sm pl-3.5 pr-11 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-describedby="signup-toggle-warning"
                    className="absolute right-2.5 top-2.5 p-1 text-slate-500 hover:text-slate-800 rounded-md"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                  <span id="signup-toggle-warning" className="visually-hidden">
                    Warning: this will display your password on the screen.
                  </span>
                  <div
                    id="signup-password-error"
                    className="error-msg items-center gap-1.5 text-xs text-rose-700 mt-1.5 font-medium"
                  >
                    <span aria-hidden="true">❌</span> Password must meet all complexity rules above.
                  </div>
                </div>
              </div>

              {/* Single Full Name Input (supports Unicode international names) */}
              <div className="auth-field">
                <label
                  htmlFor="full-name"
                  className="block text-xs font-semibold text-slate-800 mb-1"
                >
                  Full Name
                </label>
                <input
                  type="text"
                  id="full-name"
                  name="full_name"
                  required
                  autoComplete="name"
                  enterKeyHint="next"
                  aria-errormessage="signup-name-error"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Jordan Smith"
                  className="w-full text-base sm:text-sm px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 min-h-[44px]"
                />
                <div
                  id="signup-name-error"
                  className="error-msg items-center gap-1.5 text-xs text-rose-700 mt-1.5 font-medium"
                >
                  <span aria-hidden="true">❌</span> Please enter your full name.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="signup-department"
                    className="block text-xs font-semibold text-slate-800 mb-1"
                  >
                    Department
                  </label>
                  <input
                    type="text"
                    id="signup-department"
                    name="organization-unit"
                    enterKeyHint="next"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                    className="w-full text-base sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="signup-job-title"
                    className="block text-xs font-semibold text-slate-800 mb-1"
                  >
                    Job Title
                  </label>
                  <input
                    type="text"
                    id="signup-job-title"
                    name="organization-title"
                    autoComplete="organization-title"
                    enterKeyHint="done"
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    className="w-full text-base sm:text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold shadow-xs transition-colors min-h-[44px]"
              >
                <UserPlus className="w-4 h-4" />
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          )}

          {/* PASSWORD RESET FORM */}
          {activeTab === 'reset' && (
            <form method="post" onSubmit={handlePasswordResetSubmit} className="space-y-4">
              <div className="auth-field">
                <label
                  htmlFor="reset-email"
                  className="block text-xs font-semibold text-slate-800 mb-1"
                >
                  Work Email Address
                </label>
                <span id="reset-email-hint" className="block text-[11px] text-slate-500 mb-1.5">
                  Enter the email address associated with your Deskination account
                </span>
                <input
                  type="email"
                  id="reset-email"
                  name="email"
                  required
                  autoComplete="username"
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  enterKeyHint="done"
                  aria-describedby="reset-email-hint"
                  aria-errormessage="reset-email-error"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="sarah.chen@acme-corp.internal"
                  className="w-full text-base sm:text-sm px-3.5 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 min-h-[44px]"
                />
                <div
                  id="reset-email-error"
                  className="error-msg items-center gap-1.5 text-xs text-rose-700 mt-1.5 font-medium"
                >
                  <span aria-hidden="true">❌</span> Please enter a valid email address.
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-sm font-semibold shadow-xs transition-colors min-h-[44px]"
              >
                <Mail className="w-4 h-4" />
                {isSubmitting ? 'Sending Link...' : 'Send Reset Link'}
              </button>

              <button
                type="button"
                onClick={() => switchTab('signin')}
                className="w-full py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Back to Sign In
              </button>
            </form>
          )}
        </div>

        {/* Secondary Card: Demo Mode & Firebase Status / Configuration */}
        <div className="bg-white py-5 px-6 shadow-xs rounded-2xl border border-slate-200/90 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isFirebaseConfigured ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span className="text-xs font-semibold text-slate-800">
                {isFirebaseConfigured
                  ? 'Firebase Auth SDK Connected'
                  : 'Firebase Env Not Set (Demo Fallback Ready)'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowConfigPanel(prev => !prev)}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <Sliders className="w-3.5 h-3.5" />
              {showConfigPanel ? 'Hide Config' : 'Firebase Config'}
            </button>
          </div>

          {!isFirebaseConfigured && (
            <p className="text-xs text-slate-600 leading-relaxed">
              No <code className="px-1 py-0.5 bg-slate-100 rounded text-[11px]">VITE_FIREBASE_*</code>{' '}
              credentials were detected in your environment. You can configure Firebase connection
              settings or launch the interactive Demo Workspace below.
            </p>
          )}

          {/* Runtime Firebase Config Editor */}
          {showConfigPanel && (
            <form
              method="post"
              onSubmit={handleSaveRuntimeConfig}
              className="pt-3 border-t border-slate-100 space-y-3"
            >
              <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                Runtime Firebase Project Settings
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label
                    htmlFor="cfg-api-key"
                    className="block text-[11px] font-medium text-slate-600 mb-0.5"
                  >
                    API Key
                  </label>
                  <input
                    id="cfg-api-key"
                    name="apiKey"
                    type="text"
                    required
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    value={cfgApiKey}
                    onChange={e => setCfgApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cfg-auth-domain"
                    className="block text-[11px] font-medium text-slate-600 mb-0.5"
                  >
                    Auth Domain
                  </label>
                  <input
                    id="cfg-auth-domain"
                    name="authDomain"
                    type="text"
                    required
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    value={cfgAuthDomain}
                    onChange={e => setCfgAuthDomain(e.target.value)}
                    placeholder="project-id.firebaseapp.com"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cfg-project-id"
                    className="block text-[11px] font-medium text-slate-600 mb-0.5"
                  >
                    Project ID
                  </label>
                  <input
                    id="cfg-project-id"
                    name="projectId"
                    type="text"
                    required
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    value={cfgProjectId}
                    onChange={e => setCfgProjectId(e.target.value)}
                    placeholder="deskination-prod"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cfg-app-id"
                    className="block text-[11px] font-medium text-slate-600 mb-0.5"
                  >
                    App ID
                  </label>
                  <input
                    id="cfg-app-id"
                    name="appId"
                    type="text"
                    required
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    value={cfgAppId}
                    onChange={e => setCfgAppId(e.target.value)}
                    placeholder="1:123456:web:abcdef"
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label
                  htmlFor="cfg-use-emulator"
                  className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer"
                >
                  <input
                    id="cfg-use-emulator"
                    name="useEmulator"
                    type="checkbox"
                    checked={cfgUseEmulator}
                    onChange={e => setCfgUseEmulator(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Connect to Auth Emulator
                </label>
                {cfgUseEmulator && (
                  <input
                    id="cfg-emulator-url"
                    name="emulatorUrl"
                    type="url"
                    aria-label="Firebase Auth Emulator URL"
                    spellCheck={false}
                    value={cfgEmulatorUrl}
                    onChange={e => setCfgEmulatorUrl(e.target.value)}
                    className="text-xs px-2 py-1 border border-slate-300 rounded-md w-44"
                  />
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    clearRuntimeConfig();
                    setCfgApiKey('');
                    setCfgAuthDomain('');
                    setCfgProjectId('');
                    setCfgAppId('');
                  }}
                  className="text-xs text-slate-500 hover:text-rose-600"
                >
                  Clear Saved Config
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                >
                  Save &amp; Initialize Firebase
                </button>
              </div>

              {configSavedNotice && (
                <div className="text-xs text-emerald-700 font-medium">
                  ✓ Firebase client configuration saved and initialized.
                </div>
              )}
            </form>
          )}

          {/* Demo Workspace Personas Quick-Launch */}
          <div className="pt-3 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
              Quick Demo Personas (Or Match by Email on Firebase Sign-In)
            </div>
            <div className="space-y-2">
              {users.slice(0, 3).map(u => (
                <div
                  key={u.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 hover:border-slate-300 bg-slate-50/60 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full ${u.avatarColor} text-white flex items-center justify-center font-semibold text-[11px] shrink-0`}
                    >
                      {u.name
                        .split(' ')
                        .map(n => n[0])
                        .join('')}
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        {u.name}
                        {u.role === 'admin' && (
                          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{u.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(u.email);
                        setFullName(u.name);
                        setDepartment(u.department);
                        setJobTitle(u.jobTitle);
                      }}
                      className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md bg-white"
                      title="Fill email into form"
                    >
                      Fill Email
                    </button>
                    <button
                      type="button"
                      onClick={() => enterDemoMode(u)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md flex items-center gap-1"
                    >
                      Demo
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
