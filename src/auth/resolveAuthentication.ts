import type { AppConfig } from "../config/config";
import { Environment } from "../config/config";
import logger from "../utils/logger";
import type { AuthenticatedUser } from "./AuthenticatedContext";
import { AuthenticationError, readOidcError } from "./AuthenticationError";
import initializeKeycloak, {
  createAndConfigureKeycloak,
} from "./initializeKeycloak";

/**
 * Resolves the signed-in user for the application.
 *
 * Every visit goes through single sign-on. Keycloak is initialized with
 * `login-required`, which redirects the browser when there is no session.
 * An identity-provider error already present on the callback URL is
 * reported instead of starting another redirect, which would loop.
 *
 * @param configuration the application's configuration.
 * @returns the signed-in user.
 */
export async function resolveAuthentication(
  configuration: AppConfig,
): Promise<AuthenticatedUser> {
  // In the plain development environment, return a fake authenticated
  // context so that developers can work without a running Keycloak.
  if (configuration.environment === Environment.DEVELOPMENT) {
    const { mockAuthenticatedContext } = await import("../mocks/browser");
    return mockAuthenticatedContext();
  }

  const oidcError = readOidcError();
  if (oidcError) {
    // The SSO server returned an error instead of an auth code. Skip
    // initializeKeycloak so login-required does not immediately redirect
    // again.
    // The error and description come from the callback URL, so they are
    // not safe to show. The identity-provider details stay in the log.
    logger.error("OIDC error:", oidcError.error, oidcError.description);
    throw new AuthenticationError(
      "We were unable to complete sign-in. Please try again.",
    );
  }

  // Configuration failures stay as plain errors so bootstrap shows the
  // configuration-error page. Only Keycloak initialization failures are
  // sign-in errors, and their messages are not safe to show.
  const keycloak = await createAndConfigureKeycloak(configuration);
  try {
    return await initializeKeycloak(keycloak);
  } catch (err) {
    logger.error("Authentication failed:", err);
    throw new AuthenticationError(
      "We were unable to complete sign-in. Please try again.",
    );
  }
}
