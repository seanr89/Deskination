import type { User as FirebaseUser, IdTokenResult } from 'firebase/auth';
import type { Role, User as WorkspaceUser } from './deskBooking';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  useEmulator?: boolean;
  emulatorUrl?: string;
}

export type AuthMode = 'firebase' | 'demo';

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  displayName: string;
  department?: string;
  jobTitle?: string;
}

export interface UserProfileMetadata {
  displayName?: string;
  department?: string;
  jobTitle?: string;
  role?: Role;
  avatarColor?: string;
}

export interface AuthErrorDetails {
  code: string;
  message: string;
  originalError?: unknown;
}

export interface AuthenticatedSession {
  firebaseUser: FirebaseUser | null;
  workspaceUser: WorkspaceUser;
  idToken: string | null;
  claims: Record<string, unknown>;
  emailVerified: boolean;
  authMode: AuthMode;
}

export interface AuthContextValue {
  /** Raw Firebase Auth user object when signed in via Firebase */
  firebaseUser: FirebaseUser | null;
  /** Mapped Deskination workspace user profile */
  workspaceUser: WorkspaceUser | null;
  /** Current Firebase JWT ID token for backend API requests */
  idToken: string | null;
  /** Parsed Firebase ID token result including custom claims */
  tokenResult: IdTokenResult | null;
  /** True while Firebase Auth is resolving initial session state */
  isLoading: boolean;
  /** True when the user has an active Firebase session or active Demo Mode session */
  isAuthenticated: boolean;
  /** True when valid Firebase configuration is present and initialized */
  isFirebaseConfigured: boolean;
  /** Current authentication mode ('firebase' or 'demo') */
  authMode: AuthMode;
  /** Last authentication error, if any */
  error: AuthErrorDetails | null;

  // Auth operations
  signIn: (credentials: SignInCredentials) => Promise<WorkspaceUser>;
  signUp: (credentials: SignUpCredentials) => Promise<WorkspaceUser>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshIdToken: (forceRefresh?: boolean) => Promise<string | null>;

  // Demo & runtime config helpers
  enterDemoMode: (persona?: WorkspaceUser) => void;
  saveRuntimeConfig: (config: FirebaseClientConfig) => boolean;
  clearRuntimeConfig: () => void;
  clearError: () => void;
}
