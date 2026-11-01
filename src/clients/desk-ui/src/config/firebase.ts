import { initializeApp, getApps, getApp, deleteApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import type { FirebaseClientConfig } from '../types/auth';

const RUNTIME_FIREBASE_CONFIG_KEY = 'flexdesk_firebase_config_v1';

let firebaseAppInstance: FirebaseApp | null = null;
let firebaseAuthInstance: Auth | null = null;
let emulatorConnected = false;

/**
 * Loads Firebase client configuration from Vite environment variables
 * (`VITE_FIREBASE_*`) or fallback runtime configuration stored in localStorage.
 */
export function resolveFirebaseConfig(): FirebaseClientConfig | null {
  const env = import.meta.env;

  const envApiKey = env.VITE_FIREBASE_API_KEY?.trim();
  const envAuthDomain = env.VITE_FIREBASE_AUTH_DOMAIN?.trim();
  const envProjectId = env.VITE_FIREBASE_PROJECT_ID?.trim();
  const envAppId = env.VITE_FIREBASE_APP_ID?.trim();

  if (envApiKey && envAuthDomain && envProjectId && envAppId) {
    return {
      apiKey: envApiKey,
      authDomain: envAuthDomain,
      projectId: envProjectId,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET?.trim() || undefined,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || undefined,
      appId: envAppId,
      useEmulator: env.VITE_FIREBASE_USE_AUTH_EMULATOR === 'true',
      emulatorUrl: env.VITE_FIREBASE_AUTH_EMULATOR_URL?.trim() || 'http://localhost:9099',
    };
  }

  try {
    const raw = localStorage.getItem(RUNTIME_FIREBASE_CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FirebaseClientConfig>;
    if (parsed.apiKey && parsed.authDomain && parsed.projectId && parsed.appId) {
      return {
        apiKey: parsed.apiKey.trim(),
        authDomain: parsed.authDomain.trim(),
        projectId: parsed.projectId.trim(),
        storageBucket: parsed.storageBucket?.trim(),
        messagingSenderId: parsed.messagingSenderId?.trim(),
        appId: parsed.appId.trim(),
        useEmulator: Boolean(parsed.useEmulator),
        emulatorUrl: parsed.emulatorUrl?.trim() || 'http://localhost:9099',
      };
    }
  } catch {
    // Ignore malformed localStorage entry
  }

  return null;
}

/**
 * Returns true if valid Firebase configuration is available.
 */
export function hasFirebaseConfig(): boolean {
  return resolveFirebaseConfig() !== null;
}

/**
 * Initializes or returns the singleton FirebaseApp instance.
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (firebaseAppInstance) {
    return firebaseAppInstance;
  }

  const config = resolveFirebaseConfig();
  if (!config) {
    return null;
  }

  try {
    firebaseAppInstance = getApps().length > 0 ? getApp() : initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
    });
    return firebaseAppInstance;
  } catch (err) {
    console.error('[Firebase] Failed to initialize Firebase App:', err);
    return null;
  }
}

/**
 * Initializes or returns the singleton Firebase Auth instance.
 * Connects to the local Firebase Auth Emulator if configured.
 */
export function getFirebaseAuth(): Auth | null {
  if (firebaseAuthInstance) {
    return firebaseAuthInstance;
  }

  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  const config = resolveFirebaseConfig();
  const auth = getAuth(app);

  if (config?.useEmulator && !emulatorConnected) {
    const emulatorUrl = config.emulatorUrl || 'http://localhost:9099';
    try {
      connectAuthEmulator(auth, emulatorUrl, { disableWarnings: true });
      emulatorConnected = true;
    } catch (err) {
      console.warn('[Firebase Auth] Emulator connection skipped or failed:', err);
    }
  }

  firebaseAuthInstance = auth;
  return firebaseAuthInstance;
}

/**
 * Saves runtime Firebase configuration to localStorage and re-initializes the SDK.
 */
export async function setRuntimeFirebaseConfig(config: FirebaseClientConfig): Promise<boolean> {
  localStorage.setItem(RUNTIME_FIREBASE_CONFIG_KEY, JSON.stringify(config));
  await resetFirebaseInstances();
  return getFirebaseAuth() !== null;
}

/**
 * Clears any runtime Firebase configuration stored in localStorage.
 */
export async function removeRuntimeFirebaseConfig(): Promise<void> {
  localStorage.removeItem(RUNTIME_FIREBASE_CONFIG_KEY);
  await resetFirebaseInstances();
}

async function resetFirebaseInstances(): Promise<void> {
  firebaseAuthInstance = null;
  emulatorConnected = false;
  if (firebaseAppInstance) {
    try {
      await deleteApp(firebaseAppInstance);
    } catch {
      // Ignore cleanup errors
    }
    firebaseAppInstance = null;
  }
}
