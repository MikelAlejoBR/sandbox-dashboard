import { createContext, useContext } from "react";

/**
 * The authenticated branch of the context. Components that only render for
 * authenticated users can depend on this type directly via
 * `useAuthenticatedUser()`.
 */
export interface AuthenticatedUser {
  /**
   * Signals that the user has a valid SSO session. Note that it does not
   * mean that it has a Developer Sandbox signup. That is tracked
   * separately by UserSignupPhase.
   */
  authenticated: true;
  email: string;
  familyName: string;
  givenName: string;
  logout: () => void;
  token: string | undefined;
  username: string;
}

/**
 * Defines the elements that the children components will be able to access
 * in the authenticated context.
 */
export type AuthenticatedContextValue =
  | {
      /**
       * Signals that we have an unauthenticated user visiting. The landing
       * page renders in this state, Segment tracks anonymously and Marketo
       * calls are skipped.
       */
      authenticated: false;
      login: () => void;
      /**
       * When present, indicates that a previous authentication attempt
       * failed (e.g. expired SSO session, stale hint cookie). Components
       * can use this to surface a notification to the user.
       */
      authenticationError?: string;
    }
  | AuthenticatedUser;

/**
 * Defines the authentication context.
 */
export const AuthenticatedContext =
  createContext<AuthenticatedContextValue | null>(null);

/**
 * Returns the authentication context value. The caller must narrow on
 * `authenticated` to access identity fields.
 *
 * Useful for components that render in both authenticated and unauthenticated
 * states.
 */
export function useAuth(): AuthenticatedContextValue {
  const ctx = useContext(AuthenticatedContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthenticatedContext");
  }
  return ctx;
}

/**
 * Returns the authentication context, narrowed to the authenticated branch.
 * Throws if the user is not authenticated.
 *
 * Useful for components that are only rendered for authenticated users.
 */
export function useAuthenticatedUser(): AuthenticatedUser {
  const ctx = useAuth();

  if (!ctx.authenticated) {
    throw new Error(
      "useAuthenticatedUser was called without an authenticated user. This hook should only be used in components rendered behind ReadyGuard.",
    );
  }

  return ctx;
}
