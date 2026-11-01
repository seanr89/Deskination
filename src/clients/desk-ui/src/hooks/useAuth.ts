import { useAuthContext } from '../context/AuthContext';
import type { AuthContextValue } from '../types/auth';

/**
 * Primary hook for consuming Firebase Authentication state, workspace user mapping,
 * JWT tokens, and auth actions within the Deskination UI client.
 */
export function useAuth(): AuthContextValue {
  return useAuthContext();
}
