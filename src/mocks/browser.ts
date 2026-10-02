import { type SetupWorker, setupWorker } from "msw/browser";

import { setTokenGetter } from "../api/authFetch";
import type { AuthenticatedContextValue } from "../auth/AuthenticatedContext";
import { handlers } from "./handlers";

/**
 * Utility function to mock the back end for the user interface. It allows
 * overriding the signup data for testing with Playwright.
 */
export const setUpMockedBackend = async () => {
  const worker: SetupWorker = setupWorker(...handlers);
  await worker.start({ onUnhandledRequest: "bypass" });
};

/**
 * Mocks the authenticated context and simulates a faked user that is logged
 * in. It also overrides the {@link setTokenGetter} function to return a stub
 * for the {@link authFetch} function.
 */
export const mockAuthenticatedContext = (): AuthenticatedContextValue => {
  setTokenGetter(async () => "dev-fake-token");

  return {
    authenticated: true,
    token: "dev-fake-token",
    givenName: "Developer",
    familyName: "Sandbox",
    email: "dev@example.com",
    username: "dev-user",
    logout: () => {},
  };
};
