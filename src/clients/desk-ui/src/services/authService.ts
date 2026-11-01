import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  updatePassword as firebaseUpdatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
  onIdTokenChanged,
  type User as FirebaseUser,
  type IdTokenResult,
  type Unsubscribe,
} from 'firebase/auth';
import { getFirebaseAuth } from '../config/firebase';
import type {
  AuthErrorDetails,
  SignInCredentials,
  SignUpCredentials,
  UserProfileMetadata,
} from '../types/auth';
import type { Role, User as WorkspaceUser } from '../types/deskBooking';

const PROFILE_METADATA_STORAGE_KEY = 'flexdesk_auth_profile_meta_v1';

const AVATAR_PALETTE = [
  'bg-emerald-600',
  'bg-indigo-600',
  'bg-rose-600',
  'bg-amber-600',
  'bg-blue-700',
  'bg-violet-600',
  'bg-teal-600',
];

function getStoredProfileMetaMap(): Record<string, UserProfileMetadata> {
  try {
    const raw = localStorage.getItem(PROFILE_METADATA_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveUserProfileMetadata(uidOrEmail: string, meta: UserProfileMetadata): void {
  const key = uidOrEmail.toLowerCase();
  const map = getStoredProfileMetaMap();
  map[key] = { ...map[key], ...meta };
  localStorage.setItem(PROFILE_METADATA_STORAGE_KEY, JSON.stringify(map));
}

export function getUserProfileMetadata(uid: string, email?: string | null): UserProfileMetadata | undefined {
  const map = getStoredProfileMetaMap();
  return map[uid.toLowerCase()] || (email ? map[email.toLowerCase()] : undefined);
}

/**
 * Maps raw Firebase Auth error codes into actionable, user-friendly error messages.
 */
export function mapFirebaseAuthError(err: unknown): AuthErrorDetails {
  const anyErr = err as { code?: string; message?: string } | null;
  const code = anyErr?.code || 'auth/unknown-error';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return {
        code,
        message: 'Invalid email address or password. Please check your credentials and try again.',
        originalError: err,
      };
    case 'auth/invalid-email':
      return {
        code,
        message: 'Please enter a valid email address.',
        originalError: err,
      };
    case 'auth/email-already-in-use':
      return {
        code,
        message: 'An account with this email address already exists. Please sign in instead.',
        originalError: err,
      };
    case 'auth/weak-password':
      return {
        code,
        message: 'Password is too weak. Please choose a password with at least 8 characters.',
        originalError: err,
      };
    case 'auth/user-disabled':
      return {
        code,
        message: 'This account has been disabled by your workplace administrator.',
        originalError: err,
      };
    case 'auth/too-many-requests':
      return {
        code,
        message: 'Too many unsuccessful attempts. Please wait a moment or reset your password.',
        originalError: err,
      };
    case 'auth/requires-recent-login':
      return {
        code,
        message: 'For security reasons, please sign in again before changing your password.',
        originalError: err,
      };
    case 'auth/network-request-failed':
      return {
        code,
        message: 'Network error while contacting Firebase Authentication. Check your connection or emulator status.',
        originalError: err,
      };
    case 'auth/not-configured':
      return {
        code,
        message: 'Firebase Authentication is not configured. Provide VITE_FIREBASE_* variables or use Demo Mode.',
        originalError: err,
      };
    default:
      return {
        code,
        message: anyErr?.message || 'An unexpected authentication error occurred.',
        originalError: err,
      };
  }
}

/**
 * Deterministic avatar color picker based on user identifier.
 */
function pickAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

/**
 *Derives a human-readable display name from an email if displayName is not set.
 */
function formatNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] || 'Employee';
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Maps a Firebase User + ID token claims to a Deskination `User` profile.
 * - Matches by email against existing workspace profiles (`existingUsers`)
 * - Checks Firebase custom claims (`role === 'admin'` or `admin === true`)
 * - Defaults new authenticated users to the `'employee'` role
 */
export function mapFirebaseUserToWorkspaceUser(
  firebaseUser: FirebaseUser,
  existingUsers: WorkspaceUser[],
  tokenResult?: IdTokenResult | null,
  overrideMeta?: UserProfileMetadata
): WorkspaceUser {
  const normalizedEmail = (firebaseUser.email || '').trim().toLowerCase();
  const matchedWorkspaceUser = existingUsers.find(
    u => u.email.trim().toLowerCase() === normalizedEmail
  );

  const storedMeta = getUserProfileMetadata(firebaseUser.uid, firebaseUser.email);
  const claims = tokenResult?.claims || {};
  const claimRole: Role | undefined =
    claims.role === 'admin' || claims.admin === true
      ? 'admin'
      : claims.role === 'employee'
      ? 'employee'
      : undefined;

  if (matchedWorkspaceUser) {
    return {
      ...matchedWorkspaceUser,
      name:
        overrideMeta?.displayName ||
        firebaseUser.displayName ||
        storedMeta?.displayName ||
        matchedWorkspaceUser.name,
      role: claimRole || overrideMeta?.role || storedMeta?.role || matchedWorkspaceUser.role,
      department:
        overrideMeta?.department ||
        storedMeta?.department ||
        matchedWorkspaceUser.department,
      jobTitle:
        overrideMeta?.jobTitle ||
        storedMeta?.jobTitle ||
        matchedWorkspaceUser.jobTitle,
    };
  }

  const resolvedName =
    overrideMeta?.displayName ||
    firebaseUser.displayName ||
    storedMeta?.displayName ||
    (normalizedEmail ? formatNameFromEmail(normalizedEmail) : 'Workspace Member');

  const resolvedRole: Role =
    claimRole || overrideMeta?.role || storedMeta?.role || 'employee';

  const resolvedDepartment =
    overrideMeta?.department ||
    storedMeta?.department ||
    (claims.department as string | undefined) ||
    'General Operations';

  const resolvedJobTitle =
    overrideMeta?.jobTitle ||
    storedMeta?.jobTitle ||
    (claims.jobTitle as string | undefined) ||
    'Team Member';

  const resolvedAvatarColor =
    overrideMeta?.avatarColor ||
    storedMeta?.avatarColor ||
    pickAvatarColor(firebaseUser.uid || normalizedEmail);

  return {
    id: `usr-${firebaseUser.uid}`,
    name: resolvedName,
    email: firebaseUser.email || `${firebaseUser.uid}@workspace.local`,
    role: resolvedRole,
    department: resolvedDepartment,
    jobTitle: resolvedJobTitle,
    avatarColor: resolvedAvatarColor,
  };
}

function requireAuthInstance() {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw {
      code: 'auth/not-configured',
      message: 'Firebase Authentication is not configured.',
    };
  }
  return auth;
}

/**
 * Authenticates an existing user using email and password.
 */
export async function signInWithEmail({ email, password }: SignInCredentials): Promise<{
  firebaseUser: FirebaseUser;
  tokenResult: IdTokenResult;
}> {
  const auth = requireAuthInstance();
  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const tokenResult = await credential.user.getIdTokenResult();
    return {
      firebaseUser: credential.user,
      tokenResult,
    };
  } catch (err) {
    throw mapFirebaseAuthError(err);
  }
}

/**
 * Registers a new user account with email and password, sets their display name,
 * persists workspace metadata, and triggers a verification email.
 */
export async function signUpWithEmail({
  email,
  password,
  displayName,
  department,
  jobTitle,
}: SignUpCredentials): Promise<{
  firebaseUser: FirebaseUser;
  tokenResult: IdTokenResult;
  metadata: UserProfileMetadata;
}> {
  const auth = requireAuthInstance();
  try {
    const trimmedEmail = email.trim();
    const trimmedName = displayName.trim();
    const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);

    if (trimmedName) {
      await updateProfile(credential.user, { displayName: trimmedName });
    }

    const metadata: UserProfileMetadata = {
      displayName: trimmedName,
      department: department?.trim() || 'General Operations',
      jobTitle: jobTitle?.trim() || 'Team Member',
      role: 'employee',
    };

    saveUserProfileMetadata(credential.user.uid, metadata);
    if (trimmedEmail) {
      saveUserProfileMetadata(trimmedEmail, metadata);
    }

    // Best-effort verification email (do not fail signup if emulator/SMTP skips it)
    try {
      await sendEmailVerification(credential.user);
    } catch {
      // Non-fatal in local/dev environments
    }

    const tokenResult = await credential.user.getIdTokenResult(true);
    return {
      firebaseUser: credential.user,
      tokenResult,
      metadata,
    };
  } catch (err) {
    throw mapFirebaseAuthError(err);
  }
}

/**
 * Signs out the currently authenticated Firebase user.
 */
export async function signOutFirebaseUser(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) return;
  try {
    await firebaseSignOut(auth);
  } catch (err) {
    throw mapFirebaseAuthError(err);
  }
}

/**
 * Sends a password reset email to the specified address.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  const auth = requireAuthInstance();
  try {
    await firebaseSendPasswordResetEmail(auth, email.trim());
  } catch (err) {
    throw mapFirebaseAuthError(err);
  }
}

/**
 * Re-authenticates the current user with their existing password and updates to a new password.
 */
export async function updateCurrentUserPassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const auth = requireAuthInstance();
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw mapFirebaseAuthError({
      code: 'auth/user-not-found',
      message: 'No signed-in user available to update password.',
    });
  }

  try {
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await firebaseUpdatePassword(user, newPassword);
  } catch (err) {
    throw mapFirebaseAuthError(err);
  }
}

/**
 * Retrieves the current user's JWT ID token for authenticating backend API requests.
 */
export async function getCurrentIdToken(forceRefresh = false): Promise<string | null> {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}

/**
 * Subscribes to Firebase authentication and ID token state changes.
 */
export function subscribeToAuthChanges(
  onUserChange: (user: FirebaseUser | null, tokenResult: IdTokenResult | null) => void
): Unsubscribe {
  const auth = getFirebaseAuth();
  if (!auth) {
    onUserChange(null, null);
    return () => {};
  }

  const unsubAuth = onAuthStateChanged(auth, async user => {
    if (!user) {
      onUserChange(null, null);
      return;
    }
    try {
      const tokenResult = await user.getIdTokenResult();
      onUserChange(user, tokenResult);
    } catch {
      onUserChange(user, null);
    }
  });

  const unsubToken = onIdTokenChanged(auth, async user => {
    if (!user) return;
    try {
      const tokenResult = await user.getIdTokenResult();
      onUserChange(user, tokenResult);
    } catch {
      // Ignore token refresh errors handled by auth listener
    }
  });

  return () => {
    unsubAuth();
    unsubToken();
  };
}
