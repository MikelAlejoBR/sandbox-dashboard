import Keycloak from "keycloak-js";

import { setTokenGetter } from "../api/authFetch";
import { type AppConfig, Environment } from "../config/config";
import type { AuthConfigResponse, KeycloakClientConfig } from "../types";
import { deleteCookie, setCookie } from "../utils/cookie-utils";
import type { AuthenticatedContextValue } from "./AuthenticatedContext";

export const SESSION_HINT_COOKIE_NAME = "rh_sd_session_hint";

/**
 * Fetches the Keycloak client's configuration from the registration service.
 * @param registrationServiceURL the URL of the registration service.
 * @returns the parsed configuration.
 */
async function fetchKeycloakClientConfiguration(
  registrationServiceURL: string,
): Promise<KeycloakClientConfig> {
  const response = await fetch(`${registrationServiceURL}/api/v1/authconfig`);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch the configuration for the authentication client: ${response.status}`,
    );
  }

  const authConfig: AuthConfigResponse = await response.json();
  return JSON.parse(authConfig["auth-client-config"]);
}

/**
 * Creates the Keycloak connector's instance, and configures it with the
 * proper settings depending on the environment.
 * @param configuration the application's configuration.
 * @returns the Keycloak connector's configured instance, ready to be used.
 */
export async function createAndConfigureKeycloak(
  configuration: AppConfig,
): Promise<Keycloak> {
  let keycloak: Keycloak;

  switch (configuration.environment) {
    case Environment.DEVELOPMENT_KEYCLOAK:
      // For the "development keycloak" environment we simply use the
      // configuration settings provided by the developer.
      if (configuration.auth) {
        keycloak = new Keycloak({
          clientId: configuration.auth.clientId,
          realm: configuration.auth.realm,
          url: configuration.auth.url,
        });
      } else {
        throw new Error(
          'The "dev-keycloak" environment is configured, but no "auth" object was provided in the configuration',
        );
      }
      break;

    case Environment.DEVELOPMENT_STAGE: {
      // For the "development stage" environment, we need to override the
      // endpoint for obtaining the token and send it through the Vite
      // proxy, to avoid CORS issues.
      //
      // We use the "/vite-sso-token-proxy" prefix so that the Vite proxy
      // can easily identify the request and send it on the browser's
      // behalf. It basically strips that part and sends it to the original
      // SSO token URL.
      if (configuration.auth) {
        const clientConfig: KeycloakClientConfig =
          await fetchKeycloakClientConfiguration(
            configuration.registrationServiceURL,
          );
        const realmUrl = `${clientConfig["auth-server-url"]}/realms/${clientConfig.realm}/protocol/openid-connect`;
        keycloak = new Keycloak({
          clientId: configuration.auth.clientId,
          oidcProvider: {
            authorization_endpoint: `${realmUrl}/auth`,
            token_endpoint: `/vite-sso-token-proxy${realmUrl}/token`,
            end_session_endpoint: `${realmUrl}/logout`,
            userinfo_endpoint: `${realmUrl}/userinfo`,
          },
        });
      } else {
        throw new Error(
          'The "dev-stage" environment is configured, but no client ID was provided in the configuration',
        );
      }
      break;
    }

    // In any other environment we fetch the authentication settings from the
    // registration service and use them directly to configure our Keycloak
    // connector.
    default: {
      const clientConfig: KeycloakClientConfig =
        await fetchKeycloakClientConfiguration(
          configuration.registrationServiceURL,
        );

      keycloak = new Keycloak({
        clientId: clientConfig.clientId,
        realm: clientConfig.realm,
        url: clientConfig["auth-server-url"],
      });
    }
  }

  return keycloak;
}

/**
 * Initializes the Keycloak connector and triggers the SSO login flow. On
 * success, it sets up a hint cookie so that we can identify, on subsequent
 * visits, if the user has already been logged in.
 *
 * @param keycloak The configured Keycloak connector's instance.
 * @returns an {@link AuthenticatedContextValue} with the user's information
 * extracted from the authentication token.
 */
async function initializeKeycloak(
  keycloak: Keycloak,
): Promise<AuthenticatedContextValue> {
  // Authenticate the user.
  const authenticated = await keycloak.init({
    checkLoginIframe: false,
    onLoad: "login-required",
    // Make sure that we are just using the origin and the path name for the
    // redirect URI, to avoid appending any other problematic parameters:
    //
    // - https://access.redhat.com/security/cve/cve-2026-9689
    // - https://access.redhat.com/security/cve/cve-2026-18963
    redirectUri: `${window.location.origin}${window.location.pathname}`,
  });

  if (!authenticated) {
    throw new Error("Authentication failed");
  }

  // Set up a cookie hint so that we know, on the next page visit, that the
  // user was authenticated and so that we can perform the whole SSO flow
  // directly, without sending the user to the landing page. The maxAge is
  // clamped to a minimum of 60 seconds so that clock skew between the auth
  // server and the client cannot cause the cookie to expire immediately.
  const sessionExp = keycloak.refreshTokenParsed?.exp;
  const maxAge = sessionExp
    ? Math.max(sessionExp - Math.floor(Date.now() / 1000), 60)
    : 86400;
  setCookie(SESSION_HINT_COOKIE_NAME, "true", maxAge);

  // Use Keycloak's token utilities as the "token getter" for the
  // authenticated fetch calls.
  setTokenGetter(async (): Promise<string> => {
    await keycloak.updateToken(30);
    return keycloak.token!;
  });

  // Obtain the claims that we use on our application.
  const parsedToken = keycloak.tokenParsed ?? {};
  return {
    authenticated: true,
    email: (parsedToken.email as string) ?? "",
    familyName: (parsedToken.family_name as string) ?? "",
    givenName: (parsedToken.given_name as string) ?? "",
    logout: () => {
      deleteCookie(SESSION_HINT_COOKIE_NAME);
      keycloak.logout();
    },
    token: keycloak.token,
    username: (parsedToken.preferred_username as string) ?? "",
  };
}

export default initializeKeycloak;
