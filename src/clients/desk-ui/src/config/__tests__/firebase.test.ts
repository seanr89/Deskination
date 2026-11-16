import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import {
  initializeApp,
  getApps,
  getApp,
  deleteApp,
} from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
} from 'firebase/auth';
import {
  resolveFirebaseConfig,
  hasFirebaseConfig,
  getFirebaseApp,
  getFirebaseAuth,
  setRuntimeFirebaseConfig,
  removeRuntimeFirebaseConfig,
} from '../firebase';
import type { FirebaseClientConfig } from '../../types/auth';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(() => []),
  getApp: vi.fn(),
  deleteApp: vi.fn(() => Promise.resolve()),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  connectAuthEmulator: vi.fn(),
}));

const RUNTIME_FIREBASE_CONFIG_KEY = 'deskination_firebase_config_v1';

const FIREBASE_ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_MEASUREMENT_ID',
  'VITE_FIREBASE_USE_AUTH_EMULATOR',
  'VITE_FIREBASE_AUTH_EMULATOR_URL',
] as const;

function createStorageMock() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };
}

function clearFirebaseEnvVars() {
  for (const key of FIREBASE_ENV_KEYS) {
    vi.stubEnv(key, '');
  }
}

describe('firebase config', () => {
  const mockedInitializeApp = vi.mocked(initializeApp);
  const mockedGetApps = vi.mocked(getApps);
  const mockedGetApp = vi.mocked(getApp);
  const mockedDeleteApp = vi.mocked(deleteApp);
  const mockedGetAuth = vi.mocked(getAuth);
  const mockedConnectAuthEmulator = vi.mocked(connectAuthEmulator);

  const mockApp = { name: '[DEFAULT]' } as unknown as FirebaseApp;
  const mockAuth = { app: mockApp } as unknown as Auth;

  let storageMock: ReturnType<typeof createStorageMock>;

  beforeEach(async () => {
    vi.clearAllMocks();
    storageMock = createStorageMock();
    vi.stubGlobal('localStorage', storageMock);
    clearFirebaseEnvVars();

    mockedGetApps.mockReturnValue([]);
    mockedInitializeApp.mockReturnValue(mockApp);
    mockedGetApp.mockReturnValue(mockApp);
    mockedDeleteApp.mockResolvedValue(undefined);
    mockedGetAuth.mockReturnValue(mockAuth);

    await removeRuntimeFirebaseConfig();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await removeRuntimeFirebaseConfig();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe('resolveFirebaseConfig', () => {
    it('reads required and optional VITE_FIREBASE_* env vars and trims whitespace', () => {
      vi.stubEnv('VITE_FIREBASE_API_KEY', '  env-api-key  ');
      vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', ' env-project.firebaseapp.com ');
      vi.stubEnv('VITE_FIREBASE_PROJECT_ID', ' env-project ');
      vi.stubEnv('VITE_FIREBASE_APP_ID', ' 1:123:web:abc ');
      vi.stubEnv('VITE_FIREBASE_STORAGE_BUCKET', ' env-project.firebasestorage.app ');
      vi.stubEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', ' 987654 ');
      vi.stubEnv('VITE_FIREBASE_MEASUREMENT_ID', ' G-TEST123 ');
      vi.stubEnv('VITE_FIREBASE_USE_AUTH_EMULATOR', 'true');
      vi.stubEnv('VITE_FIREBASE_AUTH_EMULATOR_URL', ' http://127.0.0.1:9199 ');

      expect(resolveFirebaseConfig()).toEqual({
        apiKey: 'env-api-key',
        authDomain: 'env-project.firebaseapp.com',
        projectId: 'env-project',
        storageBucket: 'env-project.firebasestorage.app',
        messagingSenderId: '987654',
        appId: '1:123:web:abc',
        measurementId: 'G-TEST123',
        useEmulator: true,
        emulatorUrl: 'http://127.0.0.1:9199',
      });
    });

    it('defaults optional env fields and emulator settings when omitted', () => {
      vi.stubEnv('VITE_FIREBASE_API_KEY', 'env-api-key');
      vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'env-project.firebaseapp.com');
      vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'env-project');
      vi.stubEnv('VITE_FIREBASE_APP_ID', '1:123:web:abc');

      expect(resolveFirebaseConfig()).toEqual({
        apiKey: 'env-api-key',
        authDomain: 'env-project.firebaseapp.com',
        projectId: 'env-project',
        storageBucket: undefined,
        messagingSenderId: undefined,
        appId: '1:123:web:abc',
        measurementId: undefined,
        useEmulator: false,
        emulatorUrl: 'http://localhost:9099',
      });
    });

    it('falls back to localStorage config when env vars are unset and trims stored values', () => {
      const storedConfig: FirebaseClientConfig = {
        apiKey: '  stored-api-key  ',
        authDomain: '  stored.firebaseapp.com  ',
        projectId: '  stored-project  ',
        storageBucket: '  stored.appspot.com  ',
        messagingSenderId: '  111222  ',
        appId: '  1:111:web:xyz  ',
        measurementId: '  G-STORED  ',
        useEmulator: false,
        emulatorUrl: '   ',
      };
      localStorage.setItem(RUNTIME_FIREBASE_CONFIG_KEY, JSON.stringify(storedConfig));

      expect(resolveFirebaseConfig()).toEqual({
        apiKey: 'stored-api-key',
        authDomain: 'stored.firebaseapp.com',
        projectId: 'stored-project',
        storageBucket: 'stored.appspot.com',
        messagingSenderId: '111222',
        appId: '1:111:web:xyz',
        measurementId: 'G-STORED',
        useEmulator: false,
        emulatorUrl: 'http://localhost:9099',
      });
    });

    it('returns null when neither env vars nor valid localStorage JSON exist', () => {
      expect(resolveFirebaseConfig()).toBeNull();
    });

    it('prefers VITE_FIREBASE_* env vars over localStorage when both exist', () => {
      vi.stubEnv('VITE_FIREBASE_API_KEY', 'env-key');
      vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'env.firebaseapp.com');
      vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'env-proj');
      vi.stubEnv('VITE_FIREBASE_APP_ID', 'env-app');
      localStorage.setItem(
        RUNTIME_FIREBASE_CONFIG_KEY,
        JSON.stringify({
          apiKey: 'stored-key',
          authDomain: 'stored.firebaseapp.com',
          projectId: 'stored-proj',
          appId: 'stored-app',
        })
      );

      expect(resolveFirebaseConfig()?.projectId).toBe('env-proj');
    });

    it('returns null when localStorage JSON is malformed or missing required fields', () => {
      localStorage.setItem(RUNTIME_FIREBASE_CONFIG_KEY, '{not-valid-json');
      expect(resolveFirebaseConfig()).toBeNull();

      localStorage.setItem(
        RUNTIME_FIREBASE_CONFIG_KEY,
        JSON.stringify({
          apiKey: 'only-key',
          authDomain: 'only-domain',
          projectId: 'only-project',
        })
      );
      expect(resolveFirebaseConfig()).toBeNull();
    });
  });

  describe('hasFirebaseConfig', () => {
    it('returns false when no Firebase config is available', () => {
      expect(hasFirebaseConfig()).toBe(false);
    });

    it('returns true when Firebase config resolves from env vars or localStorage', () => {
      vi.stubEnv('VITE_FIREBASE_API_KEY', 'key');
      vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'domain');
      vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'project');
      vi.stubEnv('VITE_FIREBASE_APP_ID', 'app');

      expect(hasFirebaseConfig()).toBe(true);

      clearFirebaseEnvVars();
      expect(hasFirebaseConfig()).toBe(false);

      localStorage.setItem(
        RUNTIME_FIREBASE_CONFIG_KEY,
        JSON.stringify({
          apiKey: 'k',
          authDomain: 'd',
          projectId: 'p',
          appId: 'a',
        })
      );
      expect(hasFirebaseConfig()).toBe(true);
    });
  });

  describe('setRuntimeFirebaseConfig and removeRuntimeFirebaseConfig', () => {
    const sampleConfig: FirebaseClientConfig = {
      apiKey: 'runtime-api-key',
      authDomain: 'runtime.firebaseapp.com',
      projectId: 'runtime-project',
      storageBucket: 'runtime.firebasestorage.app',
      messagingSenderId: '555666',
      appId: '1:555:web:runtime',
      measurementId: 'G-RUNTIME',
      useEmulator: false,
    };

    it('persists config to localStorage, initializes Firebase App & Auth, and returns true', async () => {
      const result = await setRuntimeFirebaseConfig(sampleConfig);

      expect(result).toBe(true);
      expect(storageMock.setItem).toHaveBeenCalledWith(
        RUNTIME_FIREBASE_CONFIG_KEY,
        JSON.stringify(sampleConfig)
      );
      expect(mockedInitializeApp).toHaveBeenCalledWith({
        apiKey: sampleConfig.apiKey,
        authDomain: sampleConfig.authDomain,
        projectId: sampleConfig.projectId,
        storageBucket: sampleConfig.storageBucket,
        messagingSenderId: sampleConfig.messagingSenderId,
        appId: sampleConfig.appId,
        measurementId: sampleConfig.measurementId,
      });
      expect(mockedGetAuth).toHaveBeenCalledWith(mockApp);
      expect(mockedConnectAuthEmulator).not.toHaveBeenCalled();
      expect(getFirebaseApp()).toBe(mockApp);
      expect(getFirebaseAuth()).toBe(mockAuth);
    });

    it('connects Auth Emulator when useEmulator is true (with custom or default URL)', async () => {
      const emulatorConfig: FirebaseClientConfig = {
        ...sampleConfig,
        useEmulator: true,
        emulatorUrl: 'http://127.0.0.1:9099',
      };

      const result = await setRuntimeFirebaseConfig(emulatorConfig);

      expect(result).toBe(true);
      expect(mockedConnectAuthEmulator).toHaveBeenCalledWith(
        mockAuth,
        'http://127.0.0.1:9099',
        { disableWarnings: true }
      );

      vi.clearAllMocks();
      await setRuntimeFirebaseConfig({ ...sampleConfig, useEmulator: true });

      expect(mockedDeleteApp).toHaveBeenCalledWith(mockApp);
      expect(mockedConnectAuthEmulator).toHaveBeenCalledWith(
        mockAuth,
        'http://localhost:9099',
        { disableWarnings: true }
      );
    });

    it('uses existing Firebase App from getApp() when getApps() is non-empty', async () => {
      mockedGetApps.mockReturnValue([mockApp]);

      const result = await setRuntimeFirebaseConfig(sampleConfig);

      expect(result).toBe(true);
      expect(mockedGetApp).toHaveBeenCalledTimes(1);
      expect(mockedInitializeApp).not.toHaveBeenCalled();
    });

    it('returns false when Firebase App initialization throws', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockedInitializeApp.mockImplementation(() => {
        throw new Error('init failed');
      });

      const result = await setRuntimeFirebaseConfig(sampleConfig);

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('removes stored config from localStorage and deletes active Firebase app instance', async () => {
      await setRuntimeFirebaseConfig(sampleConfig);
      expect(hasFirebaseConfig()).toBe(true);

      await removeRuntimeFirebaseConfig();

      expect(storageMock.removeItem).toHaveBeenCalledWith(RUNTIME_FIREBASE_CONFIG_KEY);
      expect(mockedDeleteApp).toHaveBeenCalledWith(mockApp);
      expect(hasFirebaseConfig()).toBe(false);
      expect(getFirebaseApp()).toBeNull();
      expect(getFirebaseAuth()).toBeNull();
    });
  });
});
