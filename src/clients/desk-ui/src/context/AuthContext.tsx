import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import type { User as FirebaseUser, IdTokenResult } from 'firebase/auth';
import {
  hasFirebaseConfig,
  setRuntimeFirebaseConfig,
  removeRuntimeFirebaseConfig,
} from '../config/firebase';
import {
  signInWithEmail,
  signUpWithEmail,
  signOutFirebaseUser,
  sendPasswordReset as sendPasswordResetService,
  updateCurrentUserPassword,
  getCurrentIdToken,
  subscribeToAuthChanges,
  mapFirebaseUserToWorkspaceUser,
  mapFirebaseAuthError,
} from '../services/authService';
import { useDeskBooking } from './DeskBookingContext';
import type {
  AuthContextValue,
  AuthErrorDetails,
  AuthMode,
  FirebaseClientConfig,
  SignInCredentials,
  SignUpCredentials,
} from '../types/auth';
import type { User as WorkspaceUser } from '../types/deskBooking';

const DEMO_SESSION_KEY = 'flexdesk_demo_session_v1';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { users, currentUser, setCurrentUser, upsertUser } = useDeskBooking();
  const usersRef = useRef<WorkspaceUser[]>(users);
  usersRef.current = users;

  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState<boolean>(() =>
    hasFirebaseConfig()
  );
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [tokenResult, setTokenResult] = useState<IdTokenResult | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>(() => {
    try {
      const savedDemo = sessionStorage.getItem(DEMO_SESSION_KEY);
      if (savedDemo === 'true') return 'demo';
    } catch {
      // ignore
    }
    return hasFirebaseConfig() ? 'firebase' : 'demo';
  });
  const [isDemoAuthenticated, setIsDemoAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(DEMO_SESSION_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => hasFirebaseConfig());
  const [error, setError] = useState<AuthErrorDetails | null>(null);
  const [configVersion, setConfigVersion] = useState(0);

  // Subscribe to Firebase Auth state changes when Firebase is configured
  useEffect(() => {
    const configured = hasFirebaseConfig();
    setIsFirebaseConfigured(configured);

    if (!configured) {
      setFirebaseUser(null);
      setTokenResult(null);
      setIdToken(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToAuthChanges((fbUser, tokenRes) => {
      setFirebaseUser(fbUser);
      setTokenResult(tokenRes);
      setIdToken(tokenRes?.token || null);

      if (fbUser) {
        setAuthMode('firebase');
        setIsDemoAuthenticated(false);
        try {
          sessionStorage.removeItem(DEMO_SESSION_KEY);
        } catch {
          // ignore
        }
        const mapped = mapFirebaseUserToWorkspaceUser(fbUser, usersRef.current, tokenRes);
        upsertUser(mapped);
      }

      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [configVersion]);

  const signIn = useCallback(
    async (credentials: SignInCredentials): Promise<WorkspaceUser> => {
      setError(null);
      try {
        const { firebaseUser: fbUser, tokenResult: tokenRes } =
          await signInWithEmail(credentials);
        const mapped = mapFirebaseUserToWorkspaceUser(fbUser, usersRef.current, tokenRes);
        setFirebaseUser(fbUser);
        setTokenResult(tokenRes);
        setIdToken(tokenRes.token);
        setAuthMode('firebase');
        setIsDemoAuthenticated(false);
        try {
          sessionStorage.removeItem(DEMO_SESSION_KEY);
        } catch {
          // ignore
        }
        upsertUser(mapped);
        return mapped;
      } catch (err) {
        const mappedError = (err as AuthErrorDetails)?.code
          ? (err as AuthErrorDetails)
          : mapFirebaseAuthError(err);
        setError(mappedError);
        throw mappedError;
      }
    },
    [upsertUser]
  );

  const signUp = useCallback(
    async (credentials: SignUpCredentials): Promise<WorkspaceUser> => {
      setError(null);
      try {
        const {
          firebaseUser: fbUser,
          tokenResult: tokenRes,
          metadata,
        } = await signUpWithEmail(credentials);
        const mapped = mapFirebaseUserToWorkspaceUser(
          fbUser,
          usersRef.current,
          tokenRes,
          metadata
        );
        setFirebaseUser(fbUser);
        setTokenResult(tokenRes);
        setIdToken(tokenRes.token);
        setAuthMode('firebase');
        setIsDemoAuthenticated(false);
        try {
          sessionStorage.removeItem(DEMO_SESSION_KEY);
        } catch {
          // ignore
        }
        upsertUser(mapped);
        return mapped;
      } catch (err) {
        const mappedError = (err as AuthErrorDetails)?.code
          ? (err as AuthErrorDetails)
          : mapFirebaseAuthError(err);
        setError(mappedError);
        throw mappedError;
      }
    },
    [upsertUser]
  );

  const signOut = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      sessionStorage.removeItem(DEMO_SESSION_KEY);
    } catch {
      // ignore
    }
    setIsDemoAuthenticated(false);

    if (isFirebaseConfigured) {
      await signOutFirebaseUser();
    }
    setFirebaseUser(null);
    setTokenResult(null);
    setIdToken(null);
  }, [isFirebaseConfigured]);

  const sendPasswordReset = useCallback(async (email: string): Promise<void> => {
    setError(null);
    try {
      await sendPasswordResetService(email);
    } catch (err) {
      const mappedError = (err as AuthErrorDetails)?.code
        ? (err as AuthErrorDetails)
        : mapFirebaseAuthError(err);
      setError(mappedError);
      throw mappedError;
    }
  }, []);

  const updatePassword = useCallback(
    async (currentPassword: string, newPassword: string): Promise<void> => {
      setError(null);
      try {
        await updateCurrentUserPassword(currentPassword, newPassword);
      } catch (err) {
        const mappedError = (err as AuthErrorDetails)?.code
          ? (err as AuthErrorDetails)
          : mapFirebaseAuthError(err);
        setError(mappedError);
        throw mappedError;
      }
    },
    []
  );

  const refreshIdToken = useCallback(async (forceRefresh = true): Promise<string | null> => {
    const token = await getCurrentIdToken(forceRefresh);
    setIdToken(token);
    return token;
  }, []);

  const enterDemoMode = useCallback(
    (persona?: WorkspaceUser) => {
      setError(null);
      if (persona) {
        setCurrentUser(persona);
      }
      setAuthMode('demo');
      setIsDemoAuthenticated(true);
      try {
        sessionStorage.setItem(DEMO_SESSION_KEY, 'true');
      } catch {
        // ignore
      }
    },
    [setCurrentUser]
  );

  const saveRuntimeConfig = useCallback((config: FirebaseClientConfig): boolean => {
    setError(null);
    void setRuntimeFirebaseConfig(config).then(ok => {
      setIsFirebaseConfigured(ok);
      if (ok) {
        setAuthMode('firebase');
      }
      setConfigVersion(v => v + 1);
    });
    return true;
  }, []);

  const clearRuntimeConfig = useCallback(() => {
    setError(null);
    void removeRuntimeFirebaseConfig().then(() => {
      setIsFirebaseConfigured(hasFirebaseConfig());
      setConfigVersion(v => v + 1);
    });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const isAuthenticated = Boolean(firebaseUser) || isDemoAuthenticated;
  const workspaceUser = isAuthenticated ? currentUser : null;

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        workspaceUser,
        idToken,
        tokenResult,
        isLoading,
        isAuthenticated,
        isFirebaseConfigured,
        authMode: firebaseUser ? 'firebase' : authMode,
        error,
        signIn,
        signUp,
        signOut,
        sendPasswordReset,
        updatePassword,
        refreshIdToken,
        enterDemoMode,
        saveRuntimeConfig,
        clearRuntimeConfig,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
