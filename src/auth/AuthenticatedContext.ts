import { createContext, useContext } from "react";

/**
 * The signed-in user. Every page is behind single sign-on, so components
 * can depend on this value without an anonymous branch. A Developer
 * Sandbox signup is tracked separately by `UserSignupPhase`.
 */
export interface AuthenticatedUser {
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
export type AuthenticatedContextValue = AuthenticatedUser;

/**
 * Defines the authentication context.
 */
export const AuthenticatedContext =
  createContext<AuthenticatedContextValue | null>(null);

/**
 * Returns the signed-in user.
 */
export function useAuth(): AuthenticatedUser {
  const ctx = useContext(AuthenticatedContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthenticatedContext");
  }
  return ctx;
}
