import { useEffect } from "react";
import { Outlet } from "react-router";

import { useAuth } from "../auth/AuthenticatedContext";
import { useUserContext } from "../hooks/UserContext";
import { UserSignupPhase } from "../hooks/userSignupPhase";

export function ReadyGuard() {
  const { authenticated: isUserAuthenticated } = useAuth();
  const auth = useAuth();
  const { userSignupPhase } = useUserContext();

  /**
   * Temporary effect in order to force a login for every user while we finish
   * working on the landing page. Otherwise the layout crahses because it
   * uses "useAuthenticatedUser", but in this guard we are letting it render
   * any time because we don't have a landing page yet. Basically this
   * temporary fix replicates the old behavior, and will go away as soon as
   * we have the landing page.
   */
  useEffect(() => {
    if (!auth.authenticated && !auth.authenticationError) {
      auth.login();
    }
  }, [auth]);

  if (!auth.authenticated) {
    return null;
  }

  // When we have an authenticated user in a "READY" state, we want to
  // render the Sandbox page for them.
  if (isUserAuthenticated && userSignupPhase === UserSignupPhase.READY) {
    return <Outlet />;
  }

  /**
   * We return the outlet for now, but we will render the Landing page once
   * it is ready.
   */
  return <Outlet />;
}
