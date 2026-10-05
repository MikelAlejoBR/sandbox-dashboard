import { useEffect } from "react";
import { Outlet } from "react-router";

import { useAuth } from "../auth/AuthenticatedContext";
import { useUserContext } from "../hooks/UserContext";
import { UserSignupPhase } from "../hooks/userSignupPhase";
import { LoadingPage } from "./LoadingPage/LoadingPage";

export function ReadyGuard() {
  const auth = useAuth();
  const { userSignupPhase } = useUserContext();

  /**
   * Temporary effect in order to force a login for every user while
   * we finish working on the signup integration. Otherwise the layout
   * crashes because it uses "useAuthenticatedUser", but in this guard
   * we are letting it render any time because we don't have the signup
   * wired in the landing page yet. This temporary fix replicates the
   * old behavior, and will go away as soon as we have the signup
   * integration.
   */
  useEffect(() => {
    if (!auth.authenticated && !auth.authenticationError) {
      auth.login();
    }
  }, [auth]);

  if (!auth.authenticated) {
    return null;
  }

  if (userSignupPhase === UserSignupPhase.INITIAL_FETCH) {
    return <LoadingPage />;
  }

  return <Outlet />;
}
