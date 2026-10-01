import { Outlet } from "react-router";

import { useAuth } from "../auth/AuthenticatedContext";
import { useUserContext } from "../hooks/UserContext";
import { UserSignupPhase } from "../hooks/userSignupPhase";

export function ReadyGuard() {
  const { authenticated: isUserAuthenticated } = useAuth();
  const { userSignupPhase } = useUserContext();

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
