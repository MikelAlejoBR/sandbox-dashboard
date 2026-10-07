import { Outlet } from "react-router";

import { useAuth } from "../auth/AuthenticatedContext";
import { useUserContext } from "../hooks/UserContext";
import { UserSignupPhase } from "../hooks/userSignupPhase";
import { LandingPage } from "./LandingPage/LandingPage";
import { LoadingPage } from "./LoadingPage/LoadingPage";

export function ReadyGuard() {
  const { authenticated: isUserAuthenticated } = useAuth();
  const { userSignupPhase } = useUserContext();

  // Show a loading page for when the user's status has not been determined
  // yet.
  if (userSignupPhase === UserSignupPhase.INITIAL_FETCH) {
    return <LoadingPage />;
  }

  // When we have an authenticated user in a "READY" state, we want to
  // render the Sandbox page for them.
  if (isUserAuthenticated && userSignupPhase === UserSignupPhase.READY) {
    return <Outlet />;
  }

  // Render the landing page in any other case. Unauthenticated users will get
  // the landing page with the CTA triggering the login flow, if they click
  // it.
  return <LandingPage />;
}
