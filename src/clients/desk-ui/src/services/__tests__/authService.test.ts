import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Auth, IdTokenResult, User as FirebaseUser } from 'firebase/auth';
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
} from 'firebase/auth';
import { getFirebaseAuth } from '../../config/firebase';
import {
  saveUserProfileMetadata,
  getUserProfileMetadata,
  mapFirebaseAuthError,
  mapFirebaseUserToWorkspaceUser,
  signInWithEmail,
  signUpWithEmail,
  signOutFirebaseUser,
  sendPasswordReset,
  updateCurrentUserPassword,
  getCurrentIdToken,
  subscribeToAuthChanges,
} from '../authService';
import type { User as WorkspaceUser } from '../../types/deskBooking';

vi.mock('../../config/firebase', () => ({
  getFirebaseAuth: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendEmailVerification: vi.fn(),
  updateProfile: vi.fn(),
  updatePassword: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  EmailAuthProvider: {
    credential: vi.fn(),
  },
  onAuthStateChanged: vi.fn(),
  onIdTokenChanged: vi.fn(),
}));

const PROFILE_METADATA_STORAGE_KEY = 'deskination_auth_profile_meta_v1';

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

function createMockFirebaseUser(overrides: Partial<FirebaseUser> = {}): FirebaseUser {
  return {
    uid: 'fb-uid-123',
    email: 'alex.rivera_dev@acme-corp.internal',
    displayName: null,
    getIdToken: vi.fn().mockResolvedValue('mock-id-token'),
    getIdTokenResult: vi.fn().mockResolvedValue({
      token: 'mock-id-token',
      claims: {},
    } as unknown as IdTokenResult),
    ...overrides,
  } as unknown as FirebaseUser;
}

function createTokenResult(claims: Record<string, unknown> = {}): IdTokenResult {
  return {
    token: 'mock-id-token',
    claims,
  } as unknown as IdTokenResult;
}

const existingUsers: WorkspaceUser[] = [
  {
    id: 'usr-sarah',
    name: 'Sarah Chen',
    email: 'sarah.chen@acme-corp.internal',
    role: 'employee',
    department: 'Platform Engineering',
    jobTitle: 'Staff Software Engineer',
    avatarColor: 'bg-emerald-600',
  },
  {
    id: 'usr-elena',
    name: 'Elena Rostova',
    email: 'elena.rostova@acme-corp.internal',
    role: 'admin',
    department: 'Workplace Operations',
    jobTitle: 'Head of Workplace Experience',
    avatarColor: 'bg-indigo-600',
  },
];

describe('authService', () => {
  const mockedGetFirebaseAuth = vi.mocked(getFirebaseAuth);
  let storageMock: ReturnType<typeof createStorageMock>;

  beforeEach(() => {
    vi.clearAllMocks();
    storageMock = createStorageMock();
    vi.stubGlobal('localStorage', storageMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('profile metadata storage', () => {
    it('saves and retrieves metadata case-insensitively by UID or email', () => {
      saveUserProfileMetadata('UID-ABC-123', {
        displayName: 'Alex Rivera',
        department: 'Design',
      });
      saveUserProfileMetadata('Alex.Rivera@Acme-Corp.Internal', {
        jobTitle: 'Product Designer',
      });

      expect(getUserProfileMetadata('uid-abc-123')).toEqual({
        displayName: 'Alex Rivera',
        department: 'Design',
      });
      expect(getUserProfileMetadata('unknown-uid', 'alex.rivera@acme-corp.internal')).toEqual({
        jobTitle: 'Product Designer',
      });
      expect(getUserProfileMetadata('uid-abc-123', 'alex.rivera@acme-corp.internal')).toEqual({
        displayName: 'Alex Rivera',
        department: 'Design',
      });
    });

    it('merges partial metadata updates for the same key', () => {
      saveUserProfileMetadata('usr-merge', { displayName: 'Initial Name', department: 'Ops' });
      saveUserProfileMetadata('USR-MERGE', { jobTitle: 'Lead' });

      expect(getUserProfileMetadata('usr-merge')).toEqual({
        displayName: 'Initial Name',
        department: 'Ops',
        jobTitle: 'Lead',
      });
    });

    it('gracefully handles malformed JSON in localStorage', () => {
      localStorage.setItem(PROFILE_METADATA_STORAGE_KEY, '{corrupted-json');

      expect(getUserProfileMetadata('uid-1', 'user@acme.internal')).toBeUndefined();

      saveUserProfileMetadata('uid-1', { department: 'Finance' });
      expect(getUserProfileMetadata('uid-1')).toEqual({ department: 'Finance' });
    });
  });

  describe('mapFirebaseUserToWorkspaceUser', () => {
    it('matches existingUsers by email case-insensitively and preserves workspace fields', () => {
      const fbUser = createMockFirebaseUser({
        uid: 'fb-sarah',
        email: 'Sarah.Chen@acme-corp.internal',
        displayName: null,
      });

      const mapped = mapFirebaseUserToWorkspaceUser(fbUser, existingUsers);

      expect(mapped).toEqual({
        id: 'usr-sarah',
        name: 'Sarah Chen',
        email: 'sarah.chen@acme-corp.internal',
        role: 'employee',
        department: 'Platform Engineering',
        jobTitle: 'Staff Software Engineer',
        avatarColor: 'bg-emerald-600',
      });
    });

    it('elevates or sets role from tokenResult.claims', () => {
      const sarahFbUser = createMockFirebaseUser({
        uid: 'fb-sarah',
        email: 'sarah.chen@acme-corp.internal',
      });
      const elenaFbUser = createMockFirebaseUser({
        uid: 'fb-elena',
        email: 'elena.rostova@acme-corp.internal',
      });

      expect(
        mapFirebaseUserToWorkspaceUser(sarahFbUser, existingUsers, createTokenResult({ role: 'admin' })).role
      ).toBe('admin');

      expect(
        mapFirebaseUserToWorkspaceUser(sarahFbUser, existingUsers, createTokenResult({ admin: true })).role
      ).toBe('admin');

      expect(
        mapFirebaseUserToWorkspaceUser(elenaFbUser, existingUsers, createTokenResult({ role: 'employee' })).role
      ).toBe('employee');
    });

    it('defaults unmatched Firebase users and derives formatted name from email local part', () => {
      const fbUser = createMockFirebaseUser({
        uid: 'new-user-42',
        email: 'alex.rivera_dev@acme-corp.internal',
        displayName: null,
      });

      const mapped = mapFirebaseUserToWorkspaceUser(fbUser, existingUsers);
      const mappedAgain = mapFirebaseUserToWorkspaceUser(fbUser, existingUsers);

      expect(mapped.id).toBe('usr-new-user-42');
      expect(mapped.name).toBe('Alex Rivera Dev');
      expect(mapped.email).toBe('alex.rivera_dev@acme-corp.internal');
      expect(mapped.role).toBe('employee');
      expect(mapped.department).toBe('General Operations');
      expect(mapped.jobTitle).toBe('Team Member');
      expect(mapped.avatarColor).toMatch(/^bg-/);
      expect(mapped.avatarColor).toBe(mappedAgain.avatarColor);

      const claimedFbUser = createMockFirebaseUser({
        uid: 'new-user-43',
        email: 'jane-doe@acme-corp.internal',
        displayName: null,
      });
      const claimedMapped = mapFirebaseUserToWorkspaceUser(
        claimedFbUser,
        existingUsers,
        createTokenResult({ department: 'Security', jobTitle: 'Security Architect' })
      );
      expect(claimedMapped.name).toBe('Jane Doe');
      expect(claimedMapped.department).toBe('Security');
      expect(claimedMapped.jobTitle).toBe('Security Architect');
    });

    it('falls back to Workspace Member when both displayName and email are missing', () => {
      const fbUser = createMockFirebaseUser({
        uid: 'no-email-1',
        email: null,
        displayName: null,
      });

      const mapped = mapFirebaseUserToWorkspaceUser(fbUser, existingUsers);

      expect(mapped.name).toBe('Workspace Member');
      expect(mapped.email).toBe('no-email-1@workspace.local');
      expect(mapped.role).toBe('employee');
    });

    it('applies stored profile metadata and gives overrideMeta precedence', () => {
      const fbUser = createMockFirebaseUser({
        uid: 'uid-meta-1',
        email: 'jordan.lee@acme-corp.internal',
        displayName: 'Firebase Display Name',
      });

      saveUserProfileMetadata('uid-meta-1', {
        displayName: 'Stored Name',
        department: 'Product Design',
        jobTitle: 'Senior Designer',
        role: 'employee',
        avatarColor: 'bg-teal-600',
      });

      const withStoredOnly = mapFirebaseUserToWorkspaceUser(fbUser, existingUsers);
      expect(withStoredOnly).toEqual({
        id: 'usr-uid-meta-1',
        name: 'Firebase Display Name',
        email: 'jordan.lee@acme-corp.internal',
        role: 'employee',
        department: 'Product Design',
        jobTitle: 'Senior Designer',
        avatarColor: 'bg-teal-600',
      });

      const withOverride = mapFirebaseUserToWorkspaceUser(
        fbUser,
        existingUsers,
        createTokenResult({}),
        {
          displayName: 'Override Name',
          department: 'Architecture',
          jobTitle: 'Principal Architect',
          role: 'admin',
          avatarColor: 'bg-rose-600',
        }
      );
      expect(withOverride).toEqual({
        id: 'usr-uid-meta-1',
        name: 'Override Name',
        email: 'jordan.lee@acme-corp.internal',
        role: 'admin',
        department: 'Architecture',
        jobTitle: 'Principal Architect',
        avatarColor: 'bg-rose-600',
      });
    });

    it('applies overrideMeta and stored metadata onto matched existing workspace users', () => {
      const fbUser = createMockFirebaseUser({
        uid: 'fb-sarah',
        email: 'sarah.chen@acme-corp.internal',
        displayName: 'Sarah C.',
      });

      saveUserProfileMetadata('fb-sarah', {
        department: 'Infrastructure',
      });

      const mapped = mapFirebaseUserToWorkspaceUser(fbUser, existingUsers, null, {
        displayName: 'Sarah Chen-Updated',
        jobTitle: 'Principal Engineer',
      });

      expect(mapped).toEqual({
        id: 'usr-sarah',
        name: 'Sarah Chen-Updated',
        email: 'sarah.chen@acme-corp.internal',
        role: 'employee',
        department: 'Infrastructure',
        jobTitle: 'Principal Engineer',
        avatarColor: 'bg-emerald-600',
      });
    });
  });

  describe('mapFirebaseAuthError', () => {
    it.each([
      [
        'auth/invalid-credential',
        'Invalid email address or password. Please check your credentials and try again.',
      ],
      [
        'auth/wrong-password',
        'Invalid email address or password. Please check your credentials and try again.',
      ],
      [
        'auth/user-not-found',
        'Invalid email address or password. Please check your credentials and try again.',
      ],
      ['auth/invalid-email', 'Please enter a valid email address.'],
      [
        'auth/email-already-in-use',
        'An account with this email address already exists. Please sign in instead.',
      ],
      [
        'auth/weak-password',
        'Password is too weak. Please choose a password with at least 8 characters.',
      ],
      [
        'auth/user-disabled',
        'This account has been disabled by your workplace administrator.',
      ],
      [
        'auth/too-many-requests',
        'Too many unsuccessful attempts. Please wait a moment or reset your password.',
      ],
      [
        'auth/requires-recent-login',
        'For security reasons, please sign in again before changing your password.',
      ],
      [
        'auth/network-request-failed',
        'Network error while contacting Firebase Authentication. Check your connection or emulator status.',
      ],
      [
        'auth/not-configured',
        'Firebase Authentication is not configured. Provide VITE_FIREBASE_* environment variables or configure runtime settings.',
      ],
    ])('maps %s to actionable error message', (code, expectedMessage) => {
      const originalError = { code, message: 'Raw firebase message' };
      const mapped = mapFirebaseAuthError(originalError);

      expect(mapped).toEqual({
        code,
        message: expectedMessage,
        originalError,
      });
    });

    it('falls back gracefully for unknown error codes and null/undefined inputs', () => {
      const customErr = { code: 'auth/custom-failure', message: 'Custom provider detail' };
      expect(mapFirebaseAuthError(customErr)).toEqual({
        code: 'auth/custom-failure',
        message: 'Custom provider detail',
        originalError: customErr,
      });

      expect(mapFirebaseAuthError(null)).toEqual({
        code: 'auth/unknown-error',
        message: 'An unexpected authentication error occurred.',
        originalError: null,
      });

      expect(mapFirebaseAuthError({})).toEqual({
        code: 'auth/unknown-error',
        message: 'An unexpected authentication error occurred.',
        originalError: {},
      });
    });
  });

  describe('Firebase auth service operations', () => {
    const mockAuth = { currentUser: null } as unknown as Auth;

    it('throws mapped auth/not-configured error when Firebase auth is unavailable', async () => {
      mockedGetFirebaseAuth.mockReturnValue(null);

      await expect(
        signInWithEmail({ email: 'user@acme.internal', password: 'password123' })
      ).rejects.toMatchObject({ code: 'auth/not-configured' });

      await expect(sendPasswordReset('user@acme.internal')).rejects.toMatchObject({
        code: 'auth/not-configured',
      });
    });

    it('signs in with trimmed email and returns firebaseUser and tokenResult', async () => {
      const fbUser = createMockFirebaseUser();
      const tokenResult = createTokenResult({ role: 'employee' });
      vi.mocked(fbUser.getIdTokenResult).mockResolvedValue(tokenResult);
      mockedGetFirebaseAuth.mockReturnValue(mockAuth);
      vi.mocked(signInWithEmailAndPassword).mockResolvedValue({
        user: fbUser,
      } as never);

      const res = await signInWithEmail({
        email: '  sarah.chen@acme-corp.internal  ',
        password: 'secret',
      });

      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuth,
        'sarah.chen@acme-corp.internal',
        'secret'
      );
      expect(res).toEqual({ firebaseUser: fbUser, tokenResult });
    });

    it('maps signInWithEmailAndPassword errors via mapFirebaseAuthError', async () => {
      mockedGetFirebaseAuth.mockReturnValue(mockAuth);
      vi.mocked(signInWithEmailAndPassword).mockRejectedValue({
        code: 'auth/wrong-password',
      });

      await expect(
        signInWithEmail({ email: 'user@acme.internal', password: 'bad' })
      ).rejects.toMatchObject({
        code: 'auth/wrong-password',
        message: 'Invalid email address or password. Please check your credentials and try again.',
      });
    });

    it('signs up user, updates profile, saves metadata under uid and email, and sends verification', async () => {
      const fbUser = createMockFirebaseUser({ uid: 'new-uid-99' });
      const tokenResult = createTokenResult({ role: 'employee' });
      vi.mocked(fbUser.getIdTokenResult).mockResolvedValue(tokenResult);
      mockedGetFirebaseAuth.mockReturnValue(mockAuth);
      vi.mocked(createUserWithEmailAndPassword).mockResolvedValue({
        user: fbUser,
      } as never);
      vi.mocked(updateProfile).mockResolvedValue(undefined);
      vi.mocked(sendEmailVerification).mockRejectedValue(new Error('SMTP skipped'));

      const res = await signUpWithEmail({
        email: '  new.hire@acme-corp.internal ',
        password: 'StrongPassword123!',
        displayName: '  New Hire  ',
        department: '  Engineering  ',
        jobTitle: '  Software Engineer  ',
      });

      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        mockAuth,
        'new.hire@acme-corp.internal',
        'StrongPassword123!'
      );
      expect(updateProfile).toHaveBeenCalledWith(fbUser, { displayName: 'New Hire' });
      expect(fbUser.getIdTokenResult).toHaveBeenCalledWith(true);
      expect(res.metadata).toEqual({
        displayName: 'New Hire',
        department: 'Engineering',
        jobTitle: 'Software Engineer',
        role: 'employee',
      });
      expect(getUserProfileMetadata('new-uid-99')).toEqual(res.metadata);
      expect(getUserProfileMetadata('missing', 'new.hire@acme-corp.internal')).toEqual(
        res.metadata
      );
    });

    it('signs out safely when auth is missing or present', async () => {
      mockedGetFirebaseAuth.mockReturnValue(null);
      await expect(signOutFirebaseUser()).resolves.toBeUndefined();
      expect(firebaseSignOut).not.toHaveBeenCalled();

      mockedGetFirebaseAuth.mockReturnValue(mockAuth);
      vi.mocked(firebaseSignOut).mockResolvedValue(undefined);
      await signOutFirebaseUser();
      expect(firebaseSignOut).toHaveBeenCalledWith(mockAuth);
    });

    it('sends password reset email with trimmed address', async () => {
      mockedGetFirebaseAuth.mockReturnValue(mockAuth);
      vi.mocked(firebaseSendPasswordResetEmail).mockResolvedValue(undefined);

      await sendPasswordReset('  alex@acme-corp.internal  ');

      expect(firebaseSendPasswordResetEmail).toHaveBeenCalledWith(
        mockAuth,
        'alex@acme-corp.internal'
      );
    });

    it('re-authenticates and updates password for current user', async () => {
      const fbUser = createMockFirebaseUser({ email: 'sarah@acme-corp.internal' });
      const authWithUser = { currentUser: fbUser } as unknown as Auth;
      mockedGetFirebaseAuth.mockReturnValue(authWithUser);
      const fakeCredential = { providerId: 'password' };
      vi.mocked(EmailAuthProvider.credential).mockReturnValue(fakeCredential as never);
      vi.mocked(reauthenticateWithCredential).mockResolvedValue({} as never);
      vi.mocked(firebaseUpdatePassword).mockResolvedValue(undefined);

      await updateCurrentUserPassword('oldPass123', 'newPass456');

      expect(EmailAuthProvider.credential).toHaveBeenCalledWith(
        'sarah@acme-corp.internal',
        'oldPass123'
      );
      expect(reauthenticateWithCredential).toHaveBeenCalledWith(fbUser, fakeCredential);
      expect(firebaseUpdatePassword).toHaveBeenCalledWith(fbUser, 'newPass456');

      mockedGetFirebaseAuth.mockReturnValue({ currentUser: null } as unknown as Auth);
      await expect(updateCurrentUserPassword('old', 'new')).rejects.toMatchObject({
        code: 'auth/user-not-found',
      });
    });

    it('retrieves current ID token or returns null when unauthenticated or failing', async () => {
      mockedGetFirebaseAuth.mockReturnValue(null);
      expect(await getCurrentIdToken()).toBeNull();

      const fbUser = createMockFirebaseUser();
      vi.mocked(fbUser.getIdToken).mockResolvedValue('fresh-jwt-token');
      mockedGetFirebaseAuth.mockReturnValue({ currentUser: fbUser } as unknown as Auth);
      expect(await getCurrentIdToken(true)).toBe('fresh-jwt-token');
      expect(fbUser.getIdToken).toHaveBeenCalledWith(true);

      vi.mocked(fbUser.getIdToken).mockRejectedValue(new Error('token failure'));
      expect(await getCurrentIdToken()).toBeNull();
    });

    it('subscribes and unsubscribes to auth and token changes', async () => {
      const onUserChange = vi.fn();

      mockedGetFirebaseAuth.mockReturnValue(null);
      const noopUnsub = subscribeToAuthChanges(onUserChange);
      expect(onUserChange).toHaveBeenCalledWith(null, null);
      noopUnsub();

      onUserChange.mockClear();
      mockedGetFirebaseAuth.mockReturnValue(mockAuth);
      const unsubAuth = vi.fn();
      const unsubToken = vi.fn();
      let authCallback: ((user: FirebaseUser | null) => Promise<void>) | undefined;
      vi.mocked(onAuthStateChanged).mockImplementation((_auth, cb) => {
        authCallback = cb as (user: FirebaseUser | null) => Promise<void>;
        return unsubAuth;
      });
      vi.mocked(onIdTokenChanged).mockReturnValue(unsubToken);

      const unsubscribe = subscribeToAuthChanges(onUserChange);
      const fbUser = createMockFirebaseUser();
      const tokenResult = createTokenResult({ role: 'admin' });
      vi.mocked(fbUser.getIdTokenResult).mockResolvedValue(tokenResult);

      await authCallback?.(fbUser);
      expect(onUserChange).toHaveBeenCalledWith(fbUser, tokenResult);

      unsubscribe();
      expect(unsubAuth).toHaveBeenCalledTimes(1);
      expect(unsubToken).toHaveBeenCalledTimes(1);
    });
  });
});
