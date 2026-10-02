import type { AppConfig } from "../config/config";
import { Environment } from "../config/config";
import { deleteCookie, getCookie } from "../utils/cookie-utils";
import type { AuthenticatedContextValue } from "./AuthenticatedContext";
import initializeKeycloak, {
  createAndConfigureKeycloak,
  SESSION_HINT_COOKIE_NAME,
} from "./initializeKeycloak";

/**
 * Resolves the authentication state for the application.
 *
 * The Keycloak client has a few modes to work when initializing, with the
 * main one being "login-required", which instantly initiates the SSO login
 * and redirection flow.
 *
 * Our goal is for authenticated users to skip the landing page entirely,
 * go through the SSO flow and land in the catalog page directly. For
 * unauthenticated ones, we want them to hang out in the unauthenticated
 * pages until they decide to try the products, which will trigger the SSO
 * flow on demand.
 *
 * There are other "check-sso" and "silent-check-sso" modes that could be
 * used for the behavior described above, but modern browsers are
 * restricting the third-party cookies those modes rely on, as the
 * Keycloak documentation warns, so we use a first-party cookie hint
 * instead.
 *
 * @see https://www.keycloak.org/securing-apps/javascript-adapter#_modern_browsers
 *
 * Summary of the authentication hint cases:
 *
 * | Case                           | Hint? | SSO?    | Result                        |
 * |--------------------------------|-------|---------|-------------------------------|
 * | First-time visitor             | No    | No      | Landing page                  |
 * | SSO from another Red Hat site  | No    | Yes     | Landing page (can't detect)   |
 * | Clicks "Get Started"           | No    | —       | keycloak.login(), no cookie   |
 * | Returns from SSO callback      | No    | Alive   | init() → cookie set → catalog |
 * | Abandons SSO, comes back       | No    | No      | Landing page                  |
 * | Returning user, session alive  | Yes   | Alive   | init() → catalog              |
 * | Returning user, signup pending | Yes   | Alive   | init() → landing (not ready)  |
 * | Returning user, session expired| Yes   | Expired | Redirect to login form        |
 * | Explicit logout                | Cleared | —     | Landing page                  |
 * | Cleared cookies / incognito    | No    | No      | Landing page                  |
 *
 * @param configuration the application's configuration.
 * @returns an {@link AuthenticatedContextValue} representing either an
 *   authenticated user or an unauthenticated visitor with a login action.
 */
export async function resolveAuthentication(
  configuration: AppConfig,
): Promise<AuthenticatedContextValue> {
  // In the plain development environment, return a fake authenticated
  // context so that developers can work without a running Keycloak.
  if (configuration.environment === Environment.DEVELOPMENT) {
    const { mockAuthenticatedContext } = await import("../mocks/browser");
    return mockAuthenticatedContext();
  }

  // Since a successful login sets a hint cookie, we can rely on that to
  // make the user go through the Keycloak initialization and skip the
  // landing page entirely.
  //
  // We also check whether the user is being returned from an OIDC
  // callback, and therefore completed a successful SSO login flow,
  // because that cookie only gets set once the user is authenticated.
  // So right after finishing the login flow we would not still have the
  // cookie, because the connector needs to detect that the user is
  // authenticated.
  //
  // For public clients, Keycloak uses response_mode=fragment by default,
  // so the OIDC callback parameters are in the URL hash. We also check
  // the query string for environments that may use response_mode=query.
  const hasSessionHint = getCookie(SESSION_HINT_COOKIE_NAME) === "true";
  const fragmentParams = new URLSearchParams(window.location.hash.substring(1));
  const searchParams = new URLSearchParams(window.location.search);
  const isOidcCallback = fragmentParams.has("code") || searchParams.has("code");

  // When the SSO server rejects the login (e.g. user denied consent,
  // account disabled), it redirects back with "error" and "state"
  // parameters instead of "code". We detect this to surface the error
  // on the landing page rather than silently ignoring it.
  const oidcError =
    fragmentParams.get("error") ?? searchParams.get("error") ?? undefined;
  const oidcErrorDescription =
    fragmentParams.get("error_description") ??
    searchParams.get("error_description") ??
    undefined;

  if (hasSessionHint || isOidcCallback) {
    // Initialize Keycloak immediately since we need it to authenticate the
    // user.
    try {
      const keycloak = await createAndConfigureKeycloak(configuration);
      return await initializeKeycloak(keycloak);
    } catch (err) {
      // Authentication failed (e.g. expired SSO session, stale hint
      // cookie, or an invalid OIDC callback). Clear the hint cookie
      // and fall back to the unauthenticated landing page so the user
      // can try again. A fresh Keycloak instance is created because
      // the previous one may be in a partially initialized state.
      console.error("Authentication failed:", err);
      deleteCookie(SESSION_HINT_COOKIE_NAME);

      const freshKeycloakPromise = createAndConfigureKeycloak(configuration);
      freshKeycloakPromise.catch(() => {});
      return {
        authenticated: false,
        authenticationError: err instanceof Error ? err.message : String(err),
        login: async () => {
          const freshKeycloak = await freshKeycloakPromise;
          await freshKeycloak.init({ checkLoginIframe: false });
          freshKeycloak.login();
        },
      };
    }
  }

  // For unauthenticated paths, including errors with previous
  // authentications, we fire the configuration request but don't block the
  // render. The landing page appears instantly; Keycloak is only awaited
  // when the user triggers login.
  const keycloakPromise = createAndConfigureKeycloak(configuration);
  // Prevent an unhandled-rejection warning if the user never clicks login
  // and the fetch fails. The rejection still surfaces when login awaits
  // the promise.
  keycloakPromise.catch(() => {});

  if (oidcError) {
    // The SSO server returned an error instead of an auth code. Skip
    // initializeKeycloak entirely to avoid triggering another login
    // redirect, clear the hint cookie, and surface the error.
    console.error("OIDC error:", oidcError, oidcErrorDescription);
    deleteCookie(SESSION_HINT_COOKIE_NAME);
    return {
      authenticated: false,
      authenticationError: oidcErrorDescription ?? oidcError,
      login: async () => {
        const kc = await keycloakPromise;
        await kc.init({ checkLoginIframe: false });
        kc.login();
      },
    };
  }

  // When there's no hint, no callbacks and no errors, that means that it's
  // an unauthenticated visitor.
  return {
    authenticated: false,
    login: async () => {
      const kc = await keycloakPromise;
      await kc.init({ checkLoginIframe: false });
      kc.login();
    },
  };
}
